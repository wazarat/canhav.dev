// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MilestoneEscrow
/// @notice Creators lock part of a token's supply against the dated milestones
///         of their journey document. Each tranche references a milestone by
///         its array index in the journey doc (the doc's canonicalization
///         preserves array order, so the index is committed by `journeyHash`)
///         and unlocks at a time the creator sets — a public, verifiable
///         commitment device.
/// @dev Deliberately a singleton with ZERO admin surface: no owner, no
///      attester, no pause, no fees. Nothing to timelock, nothing to rug.
///      Release is purely time-based in this version; attestation-gated
///      release would be a separate future contract, never a change to this
///      one. Claims are permissionless and always pay the creator (the same
///      semantics as LaunchVestingWallet.release).
contract MilestoneEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct TrancheInput {
        uint8 milestoneIndex;
        uint128 amount;
        uint64 unlockTime;
    }

    struct Tranche {
        uint8 milestoneIndex;
        bool claimed;
        uint128 amount;
        uint64 unlockTime;
    }

    struct EscrowInfo {
        address token;
        address creator;
        bytes32 journeyHash;
    }

    /// @notice Journey docs carry 2–5 milestones, so tranche count and
    ///         milestone indexes are both bounded by 5.
    uint256 public constant MAX_TRANCHES = 5;

    uint256 public nextEscrowId;
    mapping(uint256 => EscrowInfo) public escrows;
    mapping(uint256 => Tranche[]) private _tranches;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed token,
        address indexed creator,
        bytes32 journeyHash
    );

    event TrancheAdded(
        uint256 indexed escrowId,
        uint256 trancheIndex,
        uint8 milestoneIndex,
        uint128 amount,
        uint64 unlockTime
    );

    event TrancheClaimed(
        uint256 indexed escrowId,
        uint256 trancheIndex,
        address indexed token,
        address indexed creator,
        uint128 amount
    );

    error NoTranches();
    error TooManyTranches();
    error ZeroTrancheAmount();
    error MilestoneIndexTooHigh(uint8 milestoneIndex);
    error MilestoneIndicesNotIncreasing();
    error UnexpectedTransferAmount(uint256 received, uint256 expected);
    error UnknownEscrow();
    error UnknownTranche();
    error TrancheStillLocked(uint64 unlockTime);
    error AlreadyClaimed();

    /// @notice Lock tokens against journey milestones. Caller must have
    ///         approved this contract for the sum of all tranche amounts.
    /// @dev Milestone indexes must be strictly increasing — one tranche per
    ///      milestone, in journey order. The balance-delta check pins the
    ///      escrowed amount to what actually arrived, so fee-on-transfer
    ///      tokens are rejected instead of silently under-funding tranches.
    function createEscrow(address token, bytes32 journeyHash, TrancheInput[] calldata tranches)
        external
        nonReentrant
        returns (uint256 escrowId)
    {
        uint256 n = tranches.length;
        if (n == 0) revert NoTranches();
        if (n > MAX_TRANCHES) revert TooManyTranches();

        uint256 total;
        int256 lastIndex = -1;
        for (uint256 i = 0; i < n; i++) {
            TrancheInput calldata t = tranches[i];
            if (t.amount == 0) revert ZeroTrancheAmount();
            if (t.milestoneIndex >= MAX_TRANCHES) revert MilestoneIndexTooHigh(t.milestoneIndex);
            if (int256(uint256(t.milestoneIndex)) <= lastIndex) {
                revert MilestoneIndicesNotIncreasing();
            }
            lastIndex = int256(uint256(t.milestoneIndex));
            total += t.amount;
        }

        escrowId = nextEscrowId++;
        escrows[escrowId] = EscrowInfo({token: token, creator: msg.sender, journeyHash: journeyHash});
        emit EscrowCreated(escrowId, token, msg.sender, journeyHash);
        for (uint256 i = 0; i < n; i++) {
            TrancheInput calldata t = tranches[i];
            _tranches[escrowId].push(
                Tranche({
                    milestoneIndex: t.milestoneIndex,
                    claimed: false,
                    amount: t.amount,
                    unlockTime: t.unlockTime
                })
            );
            emit TrancheAdded(escrowId, i, t.milestoneIndex, t.amount, t.unlockTime);
        }

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), total);
        uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;
        if (received != total) revert UnexpectedTransferAmount(received, total);
    }

    /// @notice Release an unlocked tranche to the escrow's creator. Anyone
    ///         may call; funds can only ever go to the creator.
    function claim(uint256 escrowId, uint256 trancheIndex) external nonReentrant {
        EscrowInfo memory info = escrows[escrowId];
        if (info.token == address(0)) revert UnknownEscrow();
        if (trancheIndex >= _tranches[escrowId].length) revert UnknownTranche();

        Tranche storage t = _tranches[escrowId][trancheIndex];
        if (t.claimed) revert AlreadyClaimed();
        if (block.timestamp < t.unlockTime) revert TrancheStillLocked(t.unlockTime);

        t.claimed = true;
        IERC20(info.token).safeTransfer(info.creator, t.amount);
        emit TrancheClaimed(escrowId, trancheIndex, info.token, info.creator, t.amount);
    }

    function trancheCount(uint256 escrowId) external view returns (uint256) {
        return _tranches[escrowId].length;
    }

    function tranche(uint256 escrowId, uint256 trancheIndex) external view returns (Tranche memory) {
        return _tranches[escrowId][trancheIndex];
    }

    function tranches(uint256 escrowId) external view returns (Tranche[] memory) {
        return _tranches[escrowId];
    }
}
