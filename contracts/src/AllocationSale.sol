// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AllocationSale
/// @notice Fixed-price, fee-free allocation sales: a creator lists part of a
///         token's supply at a fixed wei price inside a hard time window;
///         buyers receive tokens instantly; ETH proceeds are NOT freely
///         withdrawable — the creator claims them in percentage tranches,
///         each gated on the sale having ended AND a per-tranche unlock date
///         (the same milestone-dated, no-attester release semantics as
///         MilestoneEscrow; tranche milestone indexes reference the journey
///         doc committed by `journeyHash`).
/// @dev A singleton with ZERO admin surface and ZERO platform cut: no owner,
///      no fee switch, nothing to rug. The platform never touches proceeds.
///      Custody discipline: ReentrancyGuard on every state-mutating path,
///      strict checks-effects-interactions, balance-delta funding check, and
///      exact-payment purchases (no refund paths anywhere).
contract AllocationSale is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct ProceedsTrancheInput {
        uint8 milestoneIndex;
        uint16 bps;
        uint64 unlockTime;
    }

    struct ProceedsTranche {
        uint8 milestoneIndex;
        uint16 bps;
        bool claimed;
        uint64 unlockTime;
    }

    struct Sale {
        address token;
        address creator;
        bytes32 journeyHash;
        /// @dev Wei per 1e18 token units (i.e. per whole 18-decimals token).
        uint256 price;
        uint128 allocation;
        uint128 sold;
        /// @dev Max token units per buyer address; 0 = uncapped.
        uint128 perWalletCap;
        uint64 startTime;
        uint64 endTime;
        bool unsoldReclaimed;
        uint256 raised;
        uint256 remainingProceeds;
        uint8 unclaimedTranches;
    }

    /// @notice Journey docs carry 2–5 milestones — tranche count and indexes
    ///         are bounded by 5, exactly as in MilestoneEscrow.
    uint256 public constant MAX_TRANCHES = 5;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    uint256 public nextSaleId;
    mapping(uint256 => Sale) private _sales;
    mapping(uint256 => ProceedsTranche[]) private _tranches;
    /// @notice Token units bought per address per sale (drives the cap).
    mapping(uint256 => mapping(address => uint256)) public purchasedBy;

    event SaleCreated(
        uint256 indexed saleId,
        address indexed token,
        address indexed creator,
        bytes32 journeyHash,
        uint256 price,
        uint128 allocation,
        uint64 startTime,
        uint64 endTime,
        uint128 perWalletCap
    );

    event ProceedsTranchePlanned(
        uint256 indexed saleId,
        uint256 trancheIndex,
        uint8 milestoneIndex,
        uint16 bps,
        uint64 unlockTime
    );

    event TokensPurchased(
        uint256 indexed saleId,
        address indexed buyer,
        uint256 tokenAmount,
        uint256 cost
    );

    event ProceedsClaimed(
        uint256 indexed saleId,
        uint256 trancheIndex,
        address indexed creator,
        uint256 amount
    );

    event UnsoldReclaimed(uint256 indexed saleId, address indexed creator, uint256 amount);

    error ZeroPrice();
    error ZeroAllocation();
    error WindowInvalid();
    error NoTranches();
    error TooManyTranches();
    error ZeroBps();
    error BpsSumInvalid(uint256 sum);
    error MilestoneIndexTooHigh(uint8 milestoneIndex);
    error MilestoneIndicesNotIncreasing();
    error UnexpectedTransferAmount(uint256 received, uint256 expected);
    error UnknownSale();
    error SaleNotStarted(uint64 startTime);
    error SaleOver(uint64 endTime);
    error SaleNotEnded(uint64 endTime);
    error ZeroPurchase();
    error InexactPayment(uint256 sent, uint256 cost);
    error AllocationExceeded(uint256 remaining);
    error WalletCapExceeded(uint128 cap);
    error UnknownTranche();
    error TrancheStillLocked(uint64 unlockTime);
    error AlreadyClaimed();
    error AlreadyReclaimed();
    error EthTransferFailed();

    /// @notice List `allocation` tokens at `price` wei per whole token.
    ///         Caller must have approved this contract for `allocation`.
    /// @dev `startTime == 0` resolves to block.timestamp (the factory's
    ///      vesting-start sentinel convention). Proceeds tranches must cover
    ///      exactly 100% (bps sum 10_000) with strictly increasing milestone
    ///      indexes — one tranche per milestone, in journey order.
    function createSale(
        address token,
        bytes32 journeyHash,
        uint256 price,
        uint128 allocation,
        uint64 startTime,
        uint64 endTime,
        uint128 perWalletCap,
        ProceedsTrancheInput[] calldata tranchesIn
    ) external nonReentrant returns (uint256 saleId) {
        if (price == 0) revert ZeroPrice();
        if (allocation == 0) revert ZeroAllocation();
        uint64 start = startTime == 0 ? uint64(block.timestamp) : startTime;
        if (endTime <= start || endTime <= block.timestamp) revert WindowInvalid();

        uint256 n = tranchesIn.length;
        if (n == 0) revert NoTranches();
        if (n > MAX_TRANCHES) revert TooManyTranches();
        uint256 bpsSum;
        int256 lastIndex = -1;
        for (uint256 i = 0; i < n; i++) {
            ProceedsTrancheInput calldata t = tranchesIn[i];
            if (t.bps == 0) revert ZeroBps();
            if (t.milestoneIndex >= MAX_TRANCHES) revert MilestoneIndexTooHigh(t.milestoneIndex);
            if (int256(uint256(t.milestoneIndex)) <= lastIndex) {
                revert MilestoneIndicesNotIncreasing();
            }
            lastIndex = int256(uint256(t.milestoneIndex));
            bpsSum += t.bps;
        }
        if (bpsSum != BPS_DENOMINATOR) revert BpsSumInvalid(bpsSum);

        saleId = nextSaleId++;
        Sale storage s = _sales[saleId];
        s.token = token;
        s.creator = msg.sender;
        s.journeyHash = journeyHash;
        s.price = price;
        s.allocation = allocation;
        s.perWalletCap = perWalletCap;
        s.startTime = start;
        s.endTime = endTime;
        s.unclaimedTranches = uint8(n);

        emit SaleCreated(
            saleId, token, msg.sender, journeyHash, price, allocation, start, endTime, perWalletCap
        );
        for (uint256 i = 0; i < n; i++) {
            ProceedsTrancheInput calldata t = tranchesIn[i];
            _tranches[saleId].push(
                ProceedsTranche({
                    milestoneIndex: t.milestoneIndex,
                    bps: t.bps,
                    claimed: false,
                    unlockTime: t.unlockTime
                })
            );
            emit ProceedsTranchePlanned(saleId, i, t.milestoneIndex, t.bps, t.unlockTime);
        }

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), allocation);
        uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;
        if (received != allocation) revert UnexpectedTransferAmount(received, allocation);
    }

    /// @notice Buy at the fixed price. Payment must be exact for the token
    ///         amount it buys — no dust, no refunds, mirror the cost math
    ///         client-side (`tokens = value * 1e18 / price`, then
    ///         `cost = tokens * price / 1e18` must equal `value`).
    function buy(uint256 saleId) external payable nonReentrant {
        Sale storage s = _sales[saleId];
        if (s.token == address(0)) revert UnknownSale();
        if (block.timestamp < s.startTime) revert SaleNotStarted(s.startTime);
        if (block.timestamp >= s.endTime) revert SaleOver(s.endTime);

        uint256 tokens = (msg.value * 1e18) / s.price;
        if (tokens == 0) revert ZeroPurchase();
        uint256 cost = (tokens * s.price) / 1e18;
        if (cost != msg.value) revert InexactPayment(msg.value, cost);

        uint256 remaining = uint256(s.allocation) - s.sold;
        if (tokens > remaining) revert AllocationExceeded(remaining);
        if (s.perWalletCap != 0 && purchasedBy[saleId][msg.sender] + tokens > s.perWalletCap) {
            revert WalletCapExceeded(s.perWalletCap);
        }

        s.sold += uint128(tokens);
        s.raised += msg.value;
        s.remainingProceeds += msg.value;
        purchasedBy[saleId][msg.sender] += tokens;

        IERC20(s.token).safeTransfer(msg.sender, tokens);
        emit TokensPurchased(saleId, msg.sender, tokens, msg.value);
    }

    /// @notice Release a proceeds tranche to the sale's creator. Anyone may
    ///         call once the sale has ended and the tranche's date has
    ///         passed; ETH can only ever go to the creator. The last
    ///         unclaimed tranche receives the exact remainder, so rounding
    ///         dust never strands.
    function claimProceeds(uint256 saleId, uint256 trancheIndex) external nonReentrant {
        Sale storage s = _sales[saleId];
        if (s.token == address(0)) revert UnknownSale();
        if (block.timestamp < s.endTime) revert SaleNotEnded(s.endTime);
        if (trancheIndex >= _tranches[saleId].length) revert UnknownTranche();

        ProceedsTranche storage t = _tranches[saleId][trancheIndex];
        if (t.claimed) revert AlreadyClaimed();
        if (block.timestamp < t.unlockTime) revert TrancheStillLocked(t.unlockTime);

        uint256 amount = s.unclaimedTranches == 1
            ? s.remainingProceeds
            : (s.raised * t.bps) / BPS_DENOMINATOR;

        t.claimed = true;
        s.unclaimedTranches -= 1;
        s.remainingProceeds -= amount;

        if (amount != 0) {
            (bool ok,) = s.creator.call{value: amount}("");
            if (!ok) revert EthTransferFailed();
        }
        emit ProceedsClaimed(saleId, trancheIndex, s.creator, amount);
    }

    /// @notice Return unsold allocation to the creator after the sale ends.
    ///         Permissionless, once.
    function reclaimUnsold(uint256 saleId) external nonReentrant {
        Sale storage s = _sales[saleId];
        if (s.token == address(0)) revert UnknownSale();
        if (block.timestamp < s.endTime) revert SaleNotEnded(s.endTime);
        if (s.unsoldReclaimed) revert AlreadyReclaimed();

        s.unsoldReclaimed = true;
        uint256 amount = uint256(s.allocation) - s.sold;
        if (amount != 0) IERC20(s.token).safeTransfer(s.creator, amount);
        emit UnsoldReclaimed(saleId, s.creator, amount);
    }

    function sale(uint256 saleId) external view returns (Sale memory) {
        return _sales[saleId];
    }

    function proceedsTranches(uint256 saleId) external view returns (ProceedsTranche[] memory) {
        return _tranches[saleId];
    }

    function trancheCount(uint256 saleId) external view returns (uint256) {
        return _tranches[saleId].length;
    }
}
