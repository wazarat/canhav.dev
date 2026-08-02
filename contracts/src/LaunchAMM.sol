// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LaunchAMM
/// @notice Minimal constant-product AMM for launchpad tokens: every pool is
///         token ⇄ native ETH, LP positions are internal shares, and swaps
///         pay a 0.30% fee to liquidity providers. At pool creation the
///         creator may OPT IN to an additional protocol fee (frozen at the
///         then-current default, hard-capped by MAX_PROTOCOL_FEE_BPS) that is
///         split 70% to the pool's creator / 30% to the platform's
///         FeeSplitter — the 70/30 is a bytecode constant. Protocol fees
///         accrue pull-based from real swap volume only; nothing here pays
///         per-launch.
/// @dev Pools are keyed per (token, creator): the AMM cannot verify who a
///      token's launchpad creator is, so — like JourneyUpdates authorship —
///      the display layer surfaces only the pool whose creator matches the
///      token's TokenLaunched creator. The only admin knob is
///      setDefaultProtocolFeeBps (≤ cap), owned by the TimelockController;
///      per-pool rates are frozen at creation.
contract LaunchAMM is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Pool {
        address token;
        address creator;
        uint16 protocolFeeBps;
        uint256 ethReserve;
        uint256 tokenReserve;
        uint256 totalShares;
    }

    uint256 public constant BPS = 10_000;
    /// @notice Swap fee retained by the pool for liquidity providers.
    uint16 public constant LP_FEE_BPS = 30;
    /// @notice Hard ceiling on any pool's protocol fee — a constant, so no
    ///         admin or timelock can ever exceed it.
    uint16 public constant MAX_PROTOCOL_FEE_BPS = 50;
    /// @notice The enforced project/platform split of the protocol fee.
    uint16 public constant PROJECT_SHARE_BPS = 7000;
    /// @notice First-liquidity shares locked forever (Uniswap v2 pattern) so
    ///         a pool can never be fully drained to zero shares.
    uint256 public constant MINIMUM_LIQUIDITY = 1e3;

    /// @notice Platform fee destination — always a contract, never an EOA.
    address public immutable splitter;

    /// @notice Protocol fee frozen into newly created opted-in pools.
    ///         Settable only by the owner (the timelock), never above the cap.
    uint16 public defaultProtocolFeeBps = 20;

    uint256 public nextPoolId;
    mapping(uint256 => Pool) private _pools;
    /// @notice poolId + 1 per (token, creator); 0 = none. One pool per
    ///         creator per token — squatters can't block the real creator.
    mapping(address => mapping(address => uint256)) public poolOf;
    mapping(uint256 => mapping(address => uint256)) public sharesOf;

    /// @notice Pull-based fee accruals (ETH side / token side).
    mapping(address => uint256) public accruedEth;
    mapping(address => mapping(address => uint256)) public accruedTokens;

    event PoolCreated(
        uint256 indexed poolId,
        address indexed token,
        address indexed creator,
        uint16 protocolFeeBps
    );

    event LiquidityAdded(
        uint256 indexed poolId,
        address indexed provider,
        uint256 ethIn,
        uint256 tokensIn,
        uint256 sharesMinted
    );

    event LiquidityRemoved(
        uint256 indexed poolId,
        address indexed provider,
        uint256 ethOut,
        uint256 tokensOut,
        uint256 sharesBurned
    );

    event Swapped(
        uint256 indexed poolId,
        address indexed trader,
        bool ethToToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 protocolFeePaid
    );

    event FeesClaimed(address indexed asset, address indexed account, uint256 amount);

    event DefaultProtocolFeeSet(uint16 bps);

    error ZeroToken();
    error ZeroSplitter();
    error PoolExists();
    error UnknownPool();
    error ZeroAmount();
    error NoLiquidity();
    error InsufficientInitialLiquidity();
    error TokenLimitExceeded(uint256 required, uint256 limit);
    error UnexpectedTransferAmount(uint256 received, uint256 expected);
    error InsufficientShares();
    error SlippageExceeded(uint256 out, uint256 minOut);
    error OutputDrainsPool();
    error FeeExceedsMax(uint16 bps);
    error NothingAccrued();
    error EthTransferFailed();

    constructor(address splitter_, address initialOwner) Ownable(initialOwner) {
        if (splitter_ == address(0)) revert ZeroSplitter();
        splitter = splitter_;
    }

    /// @notice Set the protocol fee for FUTURE opted-in pools. Existing pools
    ///         are frozen. Owner-only — i.e. behind the timelock's delay.
    function setDefaultProtocolFeeBps(uint16 bps) external onlyOwner {
        if (bps > MAX_PROTOCOL_FEE_BPS) revert FeeExceedsMax(bps);
        defaultProtocolFeeBps = bps;
        emit DefaultProtocolFeeSet(bps);
    }

    /// @notice Create an (empty) pool for `token`. `optInProtocolFee` freezes
    ///         the current default protocol fee into the pool; opting out
    ///         makes it 0 forever.
    function createPool(address token, bool optInProtocolFee)
        external
        returns (uint256 poolId)
    {
        if (token == address(0)) revert ZeroToken();
        if (poolOf[token][msg.sender] != 0) revert PoolExists();

        poolId = nextPoolId++;
        uint16 feeBps = optInProtocolFee ? defaultProtocolFeeBps : 0;
        _pools[poolId] = Pool({
            token: token,
            creator: msg.sender,
            protocolFeeBps: feeBps,
            ethReserve: 0,
            tokenReserve: 0,
            totalShares: 0
        });
        poolOf[token][msg.sender] = poolId + 1;
        emit PoolCreated(poolId, token, msg.sender, feeBps);
    }

    /// @notice Add liquidity. The first add sets the price; later adds must
    ///         be proportional — `tokenAmountMax` bounds the token side the
    ///         contract may pull for `msg.value` of ETH.
    function addLiquidity(uint256 poolId, uint256 tokenAmountMax)
        external
        payable
        nonReentrant
        returns (uint256 sharesMinted)
    {
        Pool storage p = _pools[poolId];
        if (p.token == address(0)) revert UnknownPool();
        if (msg.value == 0 || tokenAmountMax == 0) revert ZeroAmount();

        uint256 tokenIn;
        if (p.totalShares == 0) {
            tokenIn = tokenAmountMax;
            uint256 liquidity = _sqrt(msg.value * tokenIn);
            if (liquidity <= MINIMUM_LIQUIDITY) revert InsufficientInitialLiquidity();
            sharesMinted = liquidity - MINIMUM_LIQUIDITY;
            p.totalShares = liquidity; // MINIMUM_LIQUIDITY is locked forever
        } else {
            // Round the token side UP so the pool never gets underpaid.
            tokenIn = (msg.value * p.tokenReserve + p.ethReserve - 1) / p.ethReserve;
            if (tokenIn > tokenAmountMax) revert TokenLimitExceeded(tokenIn, tokenAmountMax);
            sharesMinted = (msg.value * p.totalShares) / p.ethReserve;
            if (sharesMinted == 0) revert ZeroAmount();
            p.totalShares += sharesMinted;
        }

        sharesOf[poolId][msg.sender] += sharesMinted;
        p.ethReserve += msg.value;
        p.tokenReserve += tokenIn;

        uint256 balanceBefore = IERC20(p.token).balanceOf(address(this));
        IERC20(p.token).safeTransferFrom(msg.sender, address(this), tokenIn);
        uint256 received = IERC20(p.token).balanceOf(address(this)) - balanceBefore;
        if (received != tokenIn) revert UnexpectedTransferAmount(received, tokenIn);

        emit LiquidityAdded(poolId, msg.sender, msg.value, tokenIn, sharesMinted);
    }

    /// @notice Burn shares for a pro-rata slice of both reserves.
    function removeLiquidity(
        uint256 poolId,
        uint256 sharesBurned,
        uint256 minEthOut,
        uint256 minTokensOut
    ) external nonReentrant returns (uint256 ethOut, uint256 tokensOut) {
        Pool storage p = _pools[poolId];
        if (p.token == address(0)) revert UnknownPool();
        if (sharesBurned == 0) revert ZeroAmount();
        if (sharesOf[poolId][msg.sender] < sharesBurned) revert InsufficientShares();

        ethOut = (sharesBurned * p.ethReserve) / p.totalShares;
        tokensOut = (sharesBurned * p.tokenReserve) / p.totalShares;
        if (ethOut < minEthOut) revert SlippageExceeded(ethOut, minEthOut);
        if (tokensOut < minTokensOut) revert SlippageExceeded(tokensOut, minTokensOut);

        sharesOf[poolId][msg.sender] -= sharesBurned;
        p.totalShares -= sharesBurned;
        p.ethReserve -= ethOut;
        p.tokenReserve -= tokensOut;

        IERC20(p.token).safeTransfer(msg.sender, tokensOut);
        (bool ok,) = msg.sender.call{value: ethOut}("");
        if (!ok) revert EthTransferFailed();

        emit LiquidityRemoved(poolId, msg.sender, ethOut, tokensOut, sharesBurned);
    }

    function swapEthForTokens(uint256 poolId, uint256 minTokensOut)
        external
        payable
        nonReentrant
        returns (uint256 amountOut)
    {
        Pool storage p = _pools[poolId];
        if (p.token == address(0)) revert UnknownPool();
        if (p.totalShares == 0) revert NoLiquidity();
        if (msg.value == 0) revert ZeroAmount();

        uint256 protocolFee = (msg.value * p.protocolFeeBps) / BPS;
        if (protocolFee != 0) {
            uint256 projectCut = (protocolFee * PROJECT_SHARE_BPS) / BPS;
            accruedEth[p.creator] += projectCut;
            accruedEth[splitter] += protocolFee - projectCut;
        }

        uint256 inNet = msg.value - protocolFee;
        uint256 inAfterLpFee = (inNet * (BPS - LP_FEE_BPS)) / BPS;
        amountOut = (p.tokenReserve * inAfterLpFee) / (p.ethReserve + inAfterLpFee);
        if (amountOut < minTokensOut) revert SlippageExceeded(amountOut, minTokensOut);
        if (amountOut == 0) revert ZeroAmount();
        if (amountOut >= p.tokenReserve) revert OutputDrainsPool();

        p.ethReserve += inNet;
        p.tokenReserve -= amountOut;

        IERC20(p.token).safeTransfer(msg.sender, amountOut);
        emit Swapped(poolId, msg.sender, true, msg.value, amountOut, protocolFee);
    }

    function swapTokensForEth(uint256 poolId, uint256 tokenIn, uint256 minEthOut)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        Pool storage p = _pools[poolId];
        if (p.token == address(0)) revert UnknownPool();
        if (p.totalShares == 0) revert NoLiquidity();
        if (tokenIn == 0) revert ZeroAmount();

        uint256 balanceBefore = IERC20(p.token).balanceOf(address(this));
        IERC20(p.token).safeTransferFrom(msg.sender, address(this), tokenIn);
        uint256 received = IERC20(p.token).balanceOf(address(this)) - balanceBefore;
        if (received != tokenIn) revert UnexpectedTransferAmount(received, tokenIn);

        uint256 protocolFee = (tokenIn * p.protocolFeeBps) / BPS;
        if (protocolFee != 0) {
            uint256 projectCut = (protocolFee * PROJECT_SHARE_BPS) / BPS;
            accruedTokens[p.token][p.creator] += projectCut;
            accruedTokens[p.token][splitter] += protocolFee - projectCut;
        }

        uint256 inNet = tokenIn - protocolFee;
        uint256 inAfterLpFee = (inNet * (BPS - LP_FEE_BPS)) / BPS;
        amountOut = (p.ethReserve * inAfterLpFee) / (p.tokenReserve + inAfterLpFee);
        if (amountOut < minEthOut) revert SlippageExceeded(amountOut, minEthOut);
        if (amountOut == 0) revert ZeroAmount();
        if (amountOut >= p.ethReserve) revert OutputDrainsPool();

        p.tokenReserve += inNet;
        p.ethReserve -= amountOut;

        (bool ok,) = msg.sender.call{value: amountOut}("");
        if (!ok) revert EthTransferFailed();
        emit Swapped(poolId, msg.sender, false, tokenIn, amountOut, protocolFee);
    }

    /// @notice Pull accrued ETH fees for `account` (permissionless trigger —
    ///         funds only ever go to `account`; lets the splitter contract be
    ///         paid without calling anything itself).
    function claimEth(address account) external nonReentrant {
        uint256 amount = accruedEth[account];
        if (amount == 0) revert NothingAccrued();
        accruedEth[account] = 0;
        (bool ok,) = account.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
        emit FeesClaimed(address(0), account, amount);
    }

    /// @notice Pull accrued token fees for `account`.
    function claimTokens(address token, address account) external nonReentrant {
        uint256 amount = accruedTokens[token][account];
        if (amount == 0) revert NothingAccrued();
        accruedTokens[token][account] = 0;
        IERC20(token).safeTransfer(account, amount);
        emit FeesClaimed(token, account, amount);
    }

    function pool(uint256 poolId) external view returns (Pool memory) {
        return _pools[poolId];
    }

    /// @notice UI quote: tokens out for `ethIn` (after protocol + LP fees).
    function quoteEthForTokens(uint256 poolId, uint256 ethIn) external view returns (uint256) {
        Pool storage p = _pools[poolId];
        uint256 inNet = ethIn - (ethIn * p.protocolFeeBps) / BPS;
        uint256 inAfterLpFee = (inNet * (BPS - LP_FEE_BPS)) / BPS;
        return (p.tokenReserve * inAfterLpFee) / (p.ethReserve + inAfterLpFee);
    }

    /// @notice UI quote: ETH out for `tokenIn` (after protocol + LP fees).
    function quoteTokensForEth(uint256 poolId, uint256 tokenIn) external view returns (uint256) {
        Pool storage p = _pools[poolId];
        uint256 inNet = tokenIn - (tokenIn * p.protocolFeeBps) / BPS;
        uint256 inAfterLpFee = (inNet * (BPS - LP_FEE_BPS)) / BPS;
        return (p.ethReserve * inAfterLpFee) / (p.tokenReserve + inAfterLpFee);
    }

    function _sqrt(uint256 x) private pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
