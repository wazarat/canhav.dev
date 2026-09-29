// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LibClone} from "solady/utils/LibClone.sol";

import {LaunchAMM} from "./LaunchAMM.sol";
import {LaunchToken} from "./LaunchToken.sol";

/// @title CurveLauncher
/// @notice Launches LaunchToken clones onto a bonding curve. The launcher
///         mints the whole supply to itself, sells `curveShareBps` of it along
///         a constant-product curve with virtual reserves, taxes buys made in
///         the first `snipeWindowSeconds` after launch and holds that tax
///         aside, and when `graduationEth` of real ETH has been raised it
///         creates a LaunchAMM pool, seeds it with the raised ETH plus the tax
///         pot plus the reserved share of the supply, and keeps the pool
///         shares forever. The developer's optional first buy happens inside
///         the launch transaction, before anyone else can trade, exempt from
///         the tax and capped at `maxDevBuy`.
/// @dev Emits the same TokenLaunched event as TokenFactory (byte-identical
///      signature, creator = the developer, version 1) so the indexer can read
///      launches from both contracts with one handler. Liquidity is locked by
///      the absence of a code path: LaunchAMM shares cannot be transferred or
///      burned, and this contract never calls removeLiquidity. Graduated pools
///      opt out of the AMM protocol fee because the AMM keys accrued ETH by
///      account, which would pool every developer's share in one bucket.
///      The launch window uses block.timestamp, not block.number, because on
///      Arbitrum Nitro chains block.number reports the parent chain.
///      Admin surface (launchFee, treasury, pauser, unpause) is Ownable2Step,
///      intended to be owned by the TimelockController. `pause()` stops new
///      launches and buys; `sell` is never pausable so holders can always exit.
contract CurveLauncher is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Identical field order to TokenFactory.LaunchParams so the app can
    ///      reuse its encoder.
    struct LaunchParams {
        string name;
        string symbol;
        uint256 totalSupply;
        string imageURI;
        string xHandle;
        string website;
        bytes32 descriptionHash;
        bytes32 journeyHash;
    }

    struct Curve {
        address developer;
        uint64 launchedAt;
        bool graduated;
        uint256 supply;
        uint256 curveSupply;
        uint256 poolSupply;
        /// @dev Virtual ETH reserve x. Real ETH held for this curve is
        ///      x - virtualEthReserve until graduation.
        uint256 virtualEth;
        /// @dev Virtual token reserve y.
        uint256 virtualTokens;
        /// @dev Net tokens out through the curve (buys minus sells).
        uint256 tokensSold;
        /// @dev Snipe tax held aside for graduation. Never part of x.
        uint256 taxPot;
        uint256 poolId;
        uint256 sharesLocked;
    }

    uint256 public constant BPS = 10_000;
    /// @notice Hard ceiling on `launchFee`, the same constant as the factory.
    uint256 public constant MAX_LAUNCH_FEE = 0.05 ether;
    /// @notice Version carried in TokenLaunched. Per-factory registries start
    ///         at 1; the indexer tells launchers apart by address.
    uint64 public constant VERSION = 1;
    /// @notice Graduated pools never opt into the AMM protocol fee.
    bool public constant POOL_OPT_IN_PROTOCOL_FEE = false;
    /// @notice Supply bounds. The floor keeps rounding negligible and the
    ///         pool seed far above MINIMUM_LIQUIDITY; the ceiling keeps every
    ///         intermediate product below 1e50.
    uint256 public constant MIN_SUPPLY = 1_000_000e18;
    uint256 public constant MAX_SUPPLY = 1_000_000_000_000e18;

    /// @notice The LaunchToken logic every clone delegates to.
    address public immutable implementation;
    LaunchAMM public immutable amm;
    /// @notice Real ETH raised on a curve that triggers graduation.
    uint256 public immutable graduationEth;
    /// @notice Share of the supply sold on the curve; the rest seeds the pool.
    uint16 public immutable curveShareBps;
    /// @notice The virtual ETH reserve every curve starts with. Derived so the
    ///         curve's end price equals the pool's opening price.
    uint256 public immutable virtualEthReserve;
    /// @notice Seconds after launch during which buys pay the snipe tax.
    uint64 public immutable snipeWindowSeconds;
    uint16 public immutable snipeTaxBps;
    /// @notice Cap on the developer buy inside `launch`.
    uint256 public immutable maxDevBuy;

    mapping(address => Curve) private _curves;

    /// @notice Fee required with every launch, on top of the developer buy.
    uint256 public launchFee;
    /// @notice Launch fees not yet withdrawn. `withdraw()` moves exactly this,
    ///         never curve ETH or tax pots.
    uint256 public accruedLaunchFees;
    address public treasury;
    address public pauser;

    event TokenLaunched(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        string imageURI,
        string xHandle,
        string website,
        bytes32 descriptionHash,
        bytes32 journeyHash,
        bytes32 salt,
        uint64 version,
        uint256 launchFee,
        address treasury
    );

    event ImplementationSet(uint64 indexed version, address indexed implementation);

    event CurveCreated(
        address indexed token,
        address indexed developer,
        uint256 supply,
        uint256 curveSupply,
        uint256 poolSupply,
        uint256 virtualEthReserve,
        uint256 virtualTokenReserve,
        uint256 graduationEth,
        uint64 windowEnd,
        uint16 snipeTaxBps
    );

    /// @dev `ethIn` is net plus tax, refunds excluded. Reserves are x and y.
    event CurveBuy(
        address indexed token,
        address indexed buyer,
        uint256 ethIn,
        uint256 taxPaid,
        uint256 tokensOut,
        uint256 ethReserveAfter,
        uint256 tokenReserveAfter
    );

    event CurveSell(
        address indexed token,
        address indexed seller,
        uint256 tokensIn,
        uint256 ethOut,
        uint256 ethReserveAfter,
        uint256 tokenReserveAfter
    );

    event Graduated(
        address indexed token,
        uint256 indexed poolId,
        uint256 ethSeeded,
        uint256 tokensSeeded,
        uint256 sharesLocked
    );

    event LaunchFeeSet(uint256 launchFee);
    event TreasurySet(address indexed treasury);
    event PauserSet(address indexed pauser);
    event FeesWithdrawn(address indexed treasury, uint256 amount);

    error EmptyName();
    error EmptySymbol();
    error SupplyOutOfRange(uint256 supply);
    error WrongValue(uint256 sent, uint256 required);
    error DevBuyExceedsCap(uint256 devBuy, uint256 cap);
    error FeeExceedsMax(uint256 fee);
    error ZeroTreasury();
    error ZeroAmm();
    error ZeroImplementation();
    error NotAContract();
    error ZeroGraduationEth();
    error InvalidCurveShare(uint16 bps);
    error InvalidTax(uint16 bps);
    error InvalidDevBuyCap(uint16 bps);
    error NotPauser();
    error WithdrawFailed();
    error NothingToWithdraw();
    error UnknownCurve(address token);
    error CurveGraduated(address token, uint256 poolId);
    error ZeroAmount();
    error SlippageExceeded(uint256 out, uint256 minOut);
    error InsufficientReserve();
    error RefundFailed();
    error EthTransferFailed();

    constructor(
        address launchTokenImplementation,
        address amm_,
        address initialOwner,
        address initialTreasury,
        address initialPauser,
        uint256 graduationEth_,
        uint16 curveShareBps_,
        uint64 snipeWindowSeconds_,
        uint16 snipeTaxBps_,
        uint16 maxDevBuyBps_
    ) Ownable(initialOwner) {
        _requireContract(launchTokenImplementation);
        if (amm_ == address(0)) revert ZeroAmm();
        if (amm_.code.length == 0) revert NotAContract();
        if (graduationEth_ == 0) revert ZeroGraduationEth();
        // The continuity formula divides by curve minus pool share, so the
        // curve must sell strictly more than half and strictly less than all.
        if (curveShareBps_ <= BPS / 2 || curveShareBps_ >= BPS) revert InvalidCurveShare(curveShareBps_);
        if (snipeTaxBps_ > BPS / 2) revert InvalidTax(snipeTaxBps_);
        // Strictly below BPS so the developer buy alone can never graduate.
        if (maxDevBuyBps_ >= BPS) revert InvalidDevBuyCap(maxDevBuyBps_);

        implementation = launchTokenImplementation;
        amm = LaunchAMM(amm_);
        graduationEth = graduationEth_;
        curveShareBps = curveShareBps_;
        uint256 poolBps = BPS - curveShareBps_;
        virtualEthReserve = (graduationEth_ * poolBps) / (curveShareBps_ - poolBps);
        snipeWindowSeconds = snipeWindowSeconds_;
        snipeTaxBps = snipeTaxBps_;
        maxDevBuy = (graduationEth_ * maxDevBuyBps_) / BPS;

        _setTreasury(initialTreasury);
        pauser = initialPauser;
        emit PauserSet(initialPauser);
        emit ImplementationSet(VERSION, launchTokenImplementation);
    }

    // ------------------------------------------------------------------ admin

    /// @notice Stop new launches and buys. Sells keep working. Open to the
    ///         guardian as well as the owner, like the factory.
    function pause() external {
        if (msg.sender != pauser && msg.sender != owner()) revert NotPauser();
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setLaunchFee(uint256 newFee) external onlyOwner {
        if (newFee > MAX_LAUNCH_FEE) revert FeeExceedsMax(newFee);
        launchFee = newFee;
        emit LaunchFeeSet(newFee);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        _setTreasury(newTreasury);
    }

    function setPauser(address newPauser) external onlyOwner {
        pauser = newPauser;
        emit PauserSet(newPauser);
    }

    /// @notice Move accrued launch fees to the treasury. Permissionless.
    ///         Curve ETH and tax pots are never touched.
    function withdraw() external nonReentrant {
        uint256 amount = accruedLaunchFees;
        if (amount == 0) revert NothingToWithdraw();
        accruedLaunchFees = 0;
        address to = treasury;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert WithdrawFailed();
        emit FeesWithdrawn(to, amount);
    }

    // ----------------------------------------------------------------- launch

    /// @notice Clone a token, open its curve and make the developer's first
    ///         buy, all in one transaction. `msg.value` must equal
    ///         `launchFee + devBuyEth` exactly.
    function launch(LaunchParams calldata p, bytes32 userSalt, uint256 devBuyEth)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (address token)
    {
        uint256 fee = launchFee;
        if (msg.value != fee + devBuyEth) revert WrongValue(msg.value, fee + devBuyEth);
        if (devBuyEth > maxDevBuy) revert DevBuyExceedsCap(devBuyEth, maxDevBuy);
        if (bytes(p.name).length == 0) revert EmptyName();
        if (bytes(p.symbol).length == 0) revert EmptySymbol();
        if (p.totalSupply < MIN_SUPPLY || p.totalSupply > MAX_SUPPLY) {
            revert SupplyOutOfRange(p.totalSupply);
        }

        bytes32 salt = _scopedSalt(msg.sender, userSalt);
        token = LibClone.cloneDeterministic(implementation, salt);
        LaunchToken(token).initialize(p.name, p.symbol, p.totalSupply, address(this));

        Curve storage c = _curves[token];
        c.developer = msg.sender;
        c.launchedAt = uint64(block.timestamp);
        c.supply = p.totalSupply;
        c.curveSupply = (p.totalSupply * curveShareBps) / BPS;
        c.poolSupply = p.totalSupply - c.curveSupply;
        c.virtualEth = virtualEthReserve;
        c.virtualTokens = _initialVirtualTokens(c.curveSupply);
        accruedLaunchFees += fee;

        emit TokenLaunched(
            token,
            msg.sender,
            p.name,
            p.symbol,
            p.totalSupply,
            p.imageURI,
            p.xHandle,
            p.website,
            p.descriptionHash,
            p.journeyHash,
            salt,
            VERSION,
            fee,
            treasury
        );
        emit CurveCreated(
            token,
            msg.sender,
            p.totalSupply,
            c.curveSupply,
            c.poolSupply,
            virtualEthReserve,
            c.virtualTokens,
            graduationEth,
            c.launchedAt + snipeWindowSeconds,
            snipeTaxBps
        );

        // Provably the first buy, so no slippage bound; tax exempt by design;
        // the cap keeps it below the threshold, so it never graduates or
        // refunds.
        if (devBuyEth != 0) _buy(token, c, msg.sender, devBuyEth, false, 0);
    }

    // ---------------------------------------------------------------- trading

    /// @notice Buy along the curve. ETH beyond what reaches the graduation
    ///         threshold is refunded; reaching it graduates in the same call.
    function buy(address token, uint256 minTokensOut)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (uint256 tokensOut)
    {
        Curve storage c = _live(token);
        bool taxed = block.timestamp < c.launchedAt + snipeWindowSeconds;
        uint256 refund;
        (tokensOut, refund) = _buy(token, c, msg.sender, msg.value, taxed, minTokensOut);
        if (refund != 0) {
            (bool ok,) = msg.sender.call{value: refund}("");
            if (!ok) revert RefundFailed();
        }
    }

    /// @notice Sell back to the curve. Never taxed, never pausable. Reverts
    ///         once the curve has graduated; trade in the pool then.
    function sell(address token, uint256 tokensIn, uint256 minEthOut)
        external
        nonReentrant
        returns (uint256 ethOut)
    {
        Curve storage c = _live(token);
        if (tokensIn == 0) revert ZeroAmount();
        ethOut = (c.virtualEth * tokensIn) / (c.virtualTokens + tokensIn);
        if (ethOut == 0) revert ZeroAmount();
        if (ethOut < minEthOut) revert SlippageExceeded(ethOut, minEthOut);
        // Every circulating token came out through the curve, so x can never
        // fall below x0. Kept as a cheap guard.
        if (c.virtualEth - ethOut < virtualEthReserve) revert InsufficientReserve();

        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);
        c.virtualTokens += tokensIn;
        c.virtualEth -= ethOut;
        c.tokensSold -= tokensIn;
        emit CurveSell(token, msg.sender, tokensIn, ethOut, c.virtualEth, c.virtualTokens);

        (bool ok,) = msg.sender.call{value: ethOut}("");
        if (!ok) revert EthTransferFailed();
    }

    // ------------------------------------------------------------------ views

    function curve(address token) external view returns (Curve memory) {
        return _curves[token];
    }

    /// @notice Quote a buy at the current window state.
    function quoteBuy(address token, uint256 ethIn)
        external
        view
        returns (uint256 tokensOut, uint256 taxPaid, uint256 ethUsed, uint256 refund)
    {
        Curve storage c = _live(token);
        bool taxed = block.timestamp < c.launchedAt + snipeWindowSeconds;
        uint256 net;
        (net, taxPaid, refund) = _split(c, ethIn, taxed ? snipeTaxBps : 0);
        tokensOut = (c.virtualTokens * net) / (c.virtualEth + net);
        ethUsed = net + taxPaid;
    }

    function quoteSell(address token, uint256 tokensIn) external view returns (uint256 ethOut) {
        Curve storage c = _live(token);
        ethOut = (c.virtualEth * tokensIn) / (c.virtualTokens + tokensIn);
    }

    /// @notice Tokens the developer buy inside `launch` returns for a supply,
    ///         so the form can show the opening price before the token exists.
    function quoteLaunch(uint256 totalSupply, uint256 devBuyEth)
        external
        view
        returns (uint256 tokensOut)
    {
        if (totalSupply < MIN_SUPPLY || totalSupply > MAX_SUPPLY) revert SupplyOutOfRange(totalSupply);
        if (devBuyEth > maxDevBuy) revert DevBuyExceedsCap(devBuyEth, maxDevBuy);
        uint256 y0 = _initialVirtualTokens((totalSupply * curveShareBps) / BPS);
        tokensOut = (y0 * devBuyEth) / (virtualEthReserve + devBuyEth);
    }

    /// @notice Graduation progress and window state for the UI.
    function progress(address token)
        external
        view
        returns (uint256 ethRaised, uint256 graduationEth_, uint256 progressBps, uint64 windowEnd, bool inWindow)
    {
        Curve storage c = _curves[token];
        if (c.developer == address(0)) revert UnknownCurve(token);
        ethRaised = c.virtualEth - virtualEthReserve;
        graduationEth_ = graduationEth;
        progressBps = (ethRaised * BPS) / graduationEth;
        windowEnd = c.launchedAt + snipeWindowSeconds;
        inWindow = !c.graduated && block.timestamp < windowEnd;
    }

    /// @notice Address a token will deploy to for a developer and salt.
    function predictTokenAddress(address deployer, bytes32 userSalt) external view returns (address) {
        return LibClone.predictDeterministicAddress(
            implementation, _scopedSalt(deployer, userSalt), address(this)
        );
    }

    // -------------------------------------------------------------- internals

    /// @dev y0 = C * (x0 + E) / E, so exactly C tokens are out when real ETH
    ///      raised equals E.
    function _initialVirtualTokens(uint256 curveSupply) private view returns (uint256) {
        return (curveSupply * (virtualEthReserve + graduationEth)) / graduationEth;
    }

    /// @dev Split `value` into the net amount that enters the reserve, the tax
    ///      held aside and any refund beyond the graduation threshold. When the
    ///      threshold caps the net, the tax is grossed up on the used portion.
    function _split(Curve storage c, uint256 value, uint256 taxBps)
        private
        view
        returns (uint256 net, uint256 tax, uint256 refund)
    {
        uint256 remaining = graduationEth - (c.virtualEth - virtualEthReserve);
        tax = (value * taxBps) / BPS;
        net = value - tax;
        if (net > remaining) {
            net = remaining;
            tax = (remaining * taxBps) / (BPS - taxBps);
            refund = value - net - tax;
        }
    }

    function _buy(
        address token,
        Curve storage c,
        address buyer,
        uint256 value,
        bool taxed,
        uint256 minOut
    ) private returns (uint256 tokensOut, uint256 refund) {
        if (value == 0) revert ZeroAmount();
        uint256 net;
        uint256 tax;
        (net, tax, refund) = _split(c, value, taxed ? snipeTaxBps : 0);
        // Floor favours the curve, so k never decreases.
        tokensOut = (c.virtualTokens * net) / (c.virtualEth + net);
        if (tokensOut == 0) revert ZeroAmount();
        if (tokensOut < minOut) revert SlippageExceeded(tokensOut, minOut);

        c.virtualEth += net;
        c.virtualTokens -= tokensOut;
        c.tokensSold += tokensOut;
        c.taxPot += tax;
        emit CurveBuy(token, buyer, net + tax, tax, tokensOut, c.virtualEth, c.virtualTokens);

        IERC20(token).safeTransfer(buyer, tokensOut);
        if (c.virtualEth - virtualEthReserve == graduationEth) _graduate(token, c);
    }

    /// @dev Effects first, then the two AMM calls. The launcher keeps the
    ///      shares; nothing here or elsewhere can remove them.
    function _graduate(address token, Curve storage c) private {
        c.graduated = true;
        uint256 ethSeeded = (c.virtualEth - virtualEthReserve) + c.taxPot;
        uint256 tokensSeeded = c.supply - c.tokensSold;
        c.taxPot = 0;

        uint256 poolId = amm.createPool(token, POOL_OPT_IN_PROTOCOL_FEE);
        IERC20(token).forceApprove(address(amm), tokensSeeded);
        uint256 shares = amm.addLiquidity{value: ethSeeded}(poolId, tokensSeeded);

        c.poolId = poolId;
        c.sharesLocked = shares;
        emit Graduated(token, poolId, ethSeeded, tokensSeeded, shares);
    }

    function _live(address token) private view returns (Curve storage c) {
        c = _curves[token];
        if (c.developer == address(0)) revert UnknownCurve(token);
        if (c.graduated) revert CurveGraduated(token, c.poolId);
    }

    function _setTreasury(address newTreasury) private {
        if (newTreasury == address(0)) revert ZeroTreasury();
        treasury = newTreasury;
        emit TreasurySet(newTreasury);
    }

    function _requireContract(address impl) private view {
        if (impl == address(0)) revert ZeroImplementation();
        if (impl.code.length == 0) revert NotAContract();
    }

    function _scopedSalt(address deployer, bytes32 userSalt) private pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }
}
