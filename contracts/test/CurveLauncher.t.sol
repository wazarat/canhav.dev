// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {CurveLauncher} from "../src/CurveLauncher.sol";
import {FeeSplitter} from "../src/FeeSplitter.sol";
import {LaunchAMM} from "../src/LaunchAMM.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {LaunchVestingWallet} from "../src/LaunchVestingWallet.sol";
import {TokenFactory} from "../src/TokenFactory.sol";

/// @dev Receiver whose refund always fails.
contract RevertingReceiver {
    CurveLauncher internal launcher;

    constructor(CurveLauncher l) {
        launcher = l;
    }

    function buy(address token) external payable {
        launcher.buy{value: msg.value}(token, 0);
    }

    receive() external payable {
        revert("no");
    }
}

/// @dev Receiver that tries to buy again from inside the refund.
contract ReentrantReceiver {
    CurveLauncher internal launcher;
    address internal token;
    bytes public innerRevert;

    constructor(CurveLauncher l) {
        launcher = l;
    }

    function buy(address t) external payable {
        token = t;
        launcher.buy{value: msg.value}(t, 0);
    }

    receive() external payable {
        try launcher.buy{value: 1 wei}(token, 0) {}
        catch (bytes memory data) {
            innerRevert = data;
        }
    }
}

contract CurveLauncherTest is Test {
    CurveLauncher internal launcher;
    LaunchAMM internal amm;
    FeeSplitter internal splitter;
    LaunchToken internal impl;
    TokenFactory internal factory;

    address internal dev = makeAddr("dev");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal sniper = makeAddr("sniper");
    address internal ammOwner = makeAddr("ammOwner");
    address internal platformPayee = makeAddr("platformPayee");
    address internal treasuryAddr = makeAddr("treasury");
    address internal pauserGuardian = makeAddr("pauser");

    uint256 internal constant GRAD = 0.1 ether;
    uint16 internal constant SHARE = 8000;
    uint64 internal constant WINDOW = 60;
    uint16 internal constant TAX = 2000;
    uint16 internal constant DEV_CAP_BPS = 500;
    uint256 internal constant SUPPLY = 1_000_000_000e18;
    uint256 internal constant BPS = 10_000;

    // Derived at the defaults above (checked against a Python derivation).
    uint256 internal constant X0 = 33_333_333_333_333_333;
    uint256 internal constant C = 800_000_000e18;
    uint256 internal constant R = 200_000_000e18;
    uint256 internal constant Y0 = 1_066_666_666_666_666_664_000_000_000;
    uint256 internal constant MAX_DEV = 0.005 ether;

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
    event FeesWithdrawn(address indexed treasury, uint256 amount);

    function setUp() public {
        address[] memory payees = new address[](1);
        payees[0] = platformPayee;
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10_000;
        splitter = new FeeSplitter(ammOwner, payees, shares);
        amm = new LaunchAMM(address(splitter), ammOwner);
        impl = new LaunchToken();
        factory = new TokenFactory(
            address(impl), address(new LaunchVestingWallet()), address(this), treasuryAddr, pauserGuardian
        );
        launcher = _newLauncher(address(this));

        vm.deal(dev, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(sniper, 100 ether);
        // Keep the launch timestamp well away from zero so window maths never underflows.
        vm.warp(1_700_000_000);
    }

    // ---------------------------------------------------------------- helpers

    function _newLauncher(address owner_) internal returns (CurveLauncher) {
        return new CurveLauncher(
            address(impl), address(amm), owner_, treasuryAddr, pauserGuardian, GRAD, SHARE, WINDOW, TAX, DEV_CAP_BPS
        );
    }

    function _params() internal pure returns (CurveLauncher.LaunchParams memory) {
        return CurveLauncher.LaunchParams({
            name: "Curve Token",
            symbol: "CURVE",
            totalSupply: SUPPLY,
            imageURI: "ipfs://example",
            xHandle: "curvetoken",
            website: "https://example.com",
            descriptionHash: keccak256("A short description"),
            journeyHash: keccak256("journey document v1")
        });
    }

    function _launch(address who, uint256 devBuy, bytes32 salt) internal returns (address token) {
        uint256 fee = launcher.launchFee();
        vm.prank(who);
        token = launcher.launch{value: fee + devBuy}(_params(), salt, devBuy);
    }

    function _launch() internal returns (address) {
        return _launch(dev, 0, bytes32(uint256(1)));
    }

    function _afterWindow() internal {
        vm.warp(block.timestamp + WINDOW);
    }

    function _curve(address token) internal view returns (CurveLauncher.Curve memory) {
        return launcher.curve(token);
    }

    function _k(address token) internal view returns (uint256) {
        CurveLauncher.Curve memory c = _curve(token);
        return c.virtualEth * c.virtualTokens;
    }

    function _raised(address token) internal view returns (uint256) {
        return _curve(token).virtualEth - X0;
    }

    function _graduate(address token) internal {
        _afterWindow();
        vm.prank(alice);
        launcher.buy{value: 1 ether}(token, 0);
        assertTrue(_curve(token).graduated);
    }

    function _newTimelock(address proposer, uint256 delay) internal returns (TimelockController) {
        address[] memory proposers = new address[](1);
        proposers[0] = proposer;
        address[] memory executors = new address[](1);
        executors[0] = address(0);
        return new TimelockController(delay, proposers, executors, address(0));
    }

    // ------------------------------------------------------------ constructor

    function test_Constructor_DerivesVirtualEthAndDevCap() public view {
        assertEq(launcher.virtualEthReserve(), X0);
        assertEq(launcher.maxDevBuy(), MAX_DEV);
        assertEq(launcher.graduationEth(), GRAD);
        assertEq(launcher.curveShareBps(), SHARE);
        assertEq(launcher.snipeWindowSeconds(), WINDOW);
        assertEq(launcher.snipeTaxBps(), TAX);
        assertEq(launcher.implementation(), address(impl));
        assertEq(address(launcher.amm()), address(amm));
        assertEq(launcher.owner(), address(this));
        assertEq(launcher.treasury(), treasuryAddr);
        assertEq(launcher.pauser(), pauserGuardian);
        assertEq(launcher.VERSION(), 1);
        assertFalse(launcher.POOL_OPT_IN_PROTOCOL_FEE());
        assertEq(launcher.launchFee(), 0);
    }

    function test_Constructor_EmitsImplementationSet() public {
        vm.expectEmit(true, true, false, true);
        emit ImplementationSet(1, address(impl));
        _newLauncher(address(this));
    }

    function test_RevertWhen_ConstructorParamsInvalid() public {
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.InvalidCurveShare.selector, uint16(5000)));
        new CurveLauncher(address(impl), address(amm), address(this), treasuryAddr, pauserGuardian, GRAD, 5000, WINDOW, TAX, DEV_CAP_BPS);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.InvalidCurveShare.selector, uint16(10_000)));
        new CurveLauncher(address(impl), address(amm), address(this), treasuryAddr, pauserGuardian, GRAD, 10_000, WINDOW, TAX, DEV_CAP_BPS);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.InvalidTax.selector, uint16(5001)));
        new CurveLauncher(address(impl), address(amm), address(this), treasuryAddr, pauserGuardian, GRAD, SHARE, WINDOW, 5001, DEV_CAP_BPS);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.InvalidDevBuyCap.selector, uint16(10_000)));
        new CurveLauncher(address(impl), address(amm), address(this), treasuryAddr, pauserGuardian, GRAD, SHARE, WINDOW, TAX, 10_000);
        vm.expectRevert(CurveLauncher.ZeroGraduationEth.selector);
        new CurveLauncher(address(impl), address(amm), address(this), treasuryAddr, pauserGuardian, 0, SHARE, WINDOW, TAX, DEV_CAP_BPS);
        vm.expectRevert(CurveLauncher.ZeroAmm.selector);
        new CurveLauncher(address(impl), address(0), address(this), treasuryAddr, pauserGuardian, GRAD, SHARE, WINDOW, TAX, DEV_CAP_BPS);
        vm.expectRevert(CurveLauncher.NotAContract.selector);
        new CurveLauncher(address(impl), alice, address(this), treasuryAddr, pauserGuardian, GRAD, SHARE, WINDOW, TAX, DEV_CAP_BPS);
        vm.expectRevert(CurveLauncher.ZeroImplementation.selector);
        new CurveLauncher(address(0), address(amm), address(this), treasuryAddr, pauserGuardian, GRAD, SHARE, WINDOW, TAX, DEV_CAP_BPS);
        vm.expectRevert(CurveLauncher.NotAContract.selector);
        new CurveLauncher(alice, address(amm), address(this), treasuryAddr, pauserGuardian, GRAD, SHARE, WINDOW, TAX, DEV_CAP_BPS);
        vm.expectRevert(CurveLauncher.ZeroTreasury.selector);
        new CurveLauncher(address(impl), address(amm), address(this), address(0), pauserGuardian, GRAD, SHARE, WINDOW, TAX, DEV_CAP_BPS);
    }

    // ----------------------------------------------------------------- launch

    function test_PredictedAddressMatchesDeployed() public {
        bytes32 salt = bytes32(uint256(7));
        address predicted = launcher.predictTokenAddress(dev, salt);
        address token = _launch(dev, 0, salt);
        assertEq(token, predicted);
        assertEq(IERC20(token).totalSupply(), SUPPLY);
    }

    function test_TokenLaunched_SelectorAndPayloadMatchFactory() public {
        assertEq(CurveLauncher.TokenLaunched.selector, TokenFactory.TokenLaunched.selector);

        launcher.setLaunchFee(0.0002 ether);
        bytes32 salt = bytes32(uint256(9));
        address predicted = launcher.predictTokenAddress(dev, salt);
        CurveLauncher.LaunchParams memory p = _params();

        vm.expectEmit(true, true, false, true, address(launcher));
        emit TokenLaunched(
            predicted,
            dev,
            p.name,
            p.symbol,
            p.totalSupply,
            p.imageURI,
            p.xHandle,
            p.website,
            p.descriptionHash,
            p.journeyHash,
            keccak256(abi.encode(dev, salt)),
            1,
            0.0002 ether,
            treasuryAddr
        );
        vm.prank(dev);
        launcher.launch{value: 0.0002 ether + 0.001 ether}(p, salt, 0.001 ether);
    }

    function test_Launch_EmitsCurveCreatedWithDerivedParams() public {
        bytes32 salt = bytes32(uint256(2));
        address predicted = launcher.predictTokenAddress(dev, salt);
        vm.expectEmit(true, true, false, true, address(launcher));
        emit CurveCreated(predicted, dev, SUPPLY, C, R, X0, Y0, GRAD, uint64(block.timestamp) + WINDOW, TAX);
        address token = _launch(dev, 0, salt);

        CurveLauncher.Curve memory c = _curve(token);
        assertEq(c.developer, dev);
        assertEq(c.launchedAt, uint64(block.timestamp));
        assertFalse(c.graduated);
        assertEq(c.supply, SUPPLY);
        assertEq(c.curveSupply, C);
        assertEq(c.poolSupply, R);
        assertEq(c.virtualEth, X0);
        assertEq(c.virtualTokens, Y0);
        assertEq(c.tokensSold, 0);
        assertEq(c.taxPot, 0);
    }

    function test_Launch_SupplyHeldByLauncher() public {
        address token = _launch();
        assertEq(IERC20(token).balanceOf(address(launcher)), SUPPLY);
        assertEq(IERC20(token).balanceOf(dev), 0);
        assertEq(address(launcher).balance, 0);
    }

    function test_Launch_DevBuy_FirstAndTaxExempt() public {
        uint256 devBuy = 0.003 ether;
        uint256 expected = launcher.quoteLaunch(SUPPLY, devBuy);
        assertEq(expected, (Y0 * devBuy) / (X0 + devBuy));

        bytes32 salt = bytes32(uint256(3));
        address predicted = launcher.predictTokenAddress(dev, salt);
        vm.expectEmit(true, true, false, true, address(launcher));
        emit CurveBuy(predicted, dev, devBuy, 0, expected, X0 + devBuy, Y0 - expected);
        address token = _launch(dev, devBuy, salt);

        // Inside the window, yet no tax: the developer buy is exempt.
        assertLt(block.timestamp, _curve(token).launchedAt + WINDOW);
        assertEq(IERC20(token).balanceOf(dev), expected);
        assertEq(_curve(token).taxPot, 0);
        assertEq(_curve(token).tokensSold, expected);
        assertEq(_raised(token), devBuy);
        assertEq(address(launcher).balance, devBuy);
    }

    function test_DevBuyAtCap_TakesAboutFourteenPercent() public {
        address token = _launch(dev, MAX_DEV, bytes32(uint256(4)));
        uint256 got = IERC20(token).balanceOf(dev);
        assertGt(got, (SUPPLY * 13) / 100);
        assertLt(got, (SUPPLY * 14) / 100);
        assertFalse(_curve(token).graduated);
    }

    function test_RevertWhen_DevBuyExceedsCap() public {
        vm.prank(dev);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.DevBuyExceedsCap.selector, MAX_DEV + 1, MAX_DEV));
        launcher.launch{value: MAX_DEV + 1}(_params(), bytes32(0), MAX_DEV + 1);

        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.DevBuyExceedsCap.selector, MAX_DEV + 1, MAX_DEV));
        launcher.quoteLaunch(SUPPLY, MAX_DEV + 1);
    }

    function test_RevertWhen_ValueNotFeePlusDevBuy() public {
        vm.prank(dev);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.WrongValue.selector, 1, 0));
        launcher.launch{value: 1}(_params(), bytes32(0), 0);

        launcher.setLaunchFee(0.0002 ether);
        vm.prank(dev);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.WrongValue.selector, 0.0002 ether, 0.0012 ether));
        launcher.launch{value: 0.0002 ether}(_params(), bytes32(0), 0.001 ether);

        vm.prank(dev);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.WrongValue.selector, 0.002 ether, 0.0012 ether));
        launcher.launch{value: 0.002 ether}(_params(), bytes32(0), 0.001 ether);

        vm.prank(dev);
        launcher.launch{value: 0.0012 ether}(_params(), bytes32(0), 0.001 ether);
    }

    function test_Launch_FeeAccruesSeparately_WithdrawMovesOnlyFees() public {
        launcher.setLaunchFee(0.0002 ether);
        address token = _launch(dev, 0.001 ether, bytes32(uint256(5)));
        assertEq(launcher.accruedLaunchFees(), 0.0002 ether);
        assertEq(address(launcher).balance, 0.0012 ether);

        vm.expectEmit(true, false, false, true);
        emit FeesWithdrawn(treasuryAddr, 0.0002 ether);
        vm.prank(bob);
        launcher.withdraw();
        assertEq(treasuryAddr.balance, 0.0002 ether);
        assertEq(address(launcher).balance, 0.001 ether);
        assertEq(_raised(token), 0.001 ether);
        assertEq(launcher.accruedLaunchFees(), 0);

        vm.expectRevert(CurveLauncher.NothingToWithdraw.selector);
        launcher.withdraw();
    }

    function test_RevertWhen_SaltReused() public {
        bytes32 salt = bytes32(uint256(11));
        _launch(dev, 0, salt);
        vm.prank(dev);
        vm.expectRevert();
        launcher.launch(_params(), salt, 0);
    }

    function test_SaltScopedPerSender() public {
        bytes32 salt = bytes32(uint256(12));
        address a = _launch(dev, 0, salt);
        address b = _launch(alice, 0, salt);
        assertTrue(a != b);
    }

    function test_RevertWhen_ParamsInvalid() public {
        CurveLauncher.LaunchParams memory p = _params();
        p.name = "";
        vm.prank(dev);
        vm.expectRevert(CurveLauncher.EmptyName.selector);
        launcher.launch(p, bytes32(0), 0);

        p = _params();
        p.symbol = "";
        vm.prank(dev);
        vm.expectRevert(CurveLauncher.EmptySymbol.selector);
        launcher.launch(p, bytes32(0), 0);

        p = _params();
        p.totalSupply = launcher.MIN_SUPPLY() - 1;
        vm.prank(dev);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.SupplyOutOfRange.selector, p.totalSupply));
        launcher.launch(p, bytes32(0), 0);

        p.totalSupply = launcher.MAX_SUPPLY() + 1;
        vm.prank(dev);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.SupplyOutOfRange.selector, p.totalSupply));
        launcher.launch(p, bytes32(0), 0);

        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.SupplyOutOfRange.selector, 1));
        launcher.quoteLaunch(1, 0);
    }

    // -------------------------------------------------------------------- buy

    function test_Buy_MathMatchesQuote_AndEmits() public {
        address token = _launch();
        _afterWindow();
        uint256 ethIn = 0.01 ether;
        (uint256 qOut, uint256 qTax, uint256 qUsed, uint256 qRefund) = launcher.quoteBuy(token, ethIn);
        assertEq(qOut, (Y0 * ethIn) / (X0 + ethIn));
        assertEq(qTax, 0);
        assertEq(qUsed, ethIn);
        assertEq(qRefund, 0);

        vm.expectEmit(true, true, false, true, address(launcher));
        emit CurveBuy(token, alice, ethIn, 0, qOut, X0 + ethIn, Y0 - qOut);
        vm.prank(alice);
        uint256 out = launcher.buy{value: ethIn}(token, qOut);
        assertEq(out, qOut);
        assertEq(IERC20(token).balanceOf(alice), qOut);
        CurveLauncher.Curve memory c = _curve(token);
        assertEq(c.virtualEth, X0 + ethIn);
        assertEq(c.virtualTokens, Y0 - qOut);
        assertEq(c.tokensSold, qOut);
        assertGe(_k(token), X0 * Y0);
    }

    function test_Buy_InWindow_TaxedIntoPot() public {
        address token = _launch();
        uint256 ethIn = 0.01 ether;
        uint256 tax = (ethIn * TAX) / BPS;
        uint256 net = ethIn - tax;
        (uint256 qOut, uint256 qTax, uint256 qUsed,) = launcher.quoteBuy(token, ethIn);
        assertEq(qTax, tax);
        assertEq(qUsed, ethIn);
        assertEq(qOut, (Y0 * net) / (X0 + net));

        vm.prank(sniper);
        uint256 out = launcher.buy{value: ethIn}(token, 0);
        assertEq(out, qOut);
        CurveLauncher.Curve memory c = _curve(token);
        assertEq(c.taxPot, tax);
        assertEq(c.virtualEth, X0 + net);
        assertEq(address(launcher).balance, ethIn);
    }

    function test_Buy_WindowBoundary() public {
        address token = _launch();
        uint64 launchedAt = _curve(token).launchedAt;

        vm.warp(launchedAt + WINDOW - 1);
        vm.prank(sniper);
        launcher.buy{value: 0.001 ether}(token, 0);
        assertEq(_curve(token).taxPot, (0.001 ether * uint256(TAX)) / BPS);

        uint256 potBefore = _curve(token).taxPot;
        vm.warp(launchedAt + WINDOW);
        vm.prank(alice);
        launcher.buy{value: 0.001 ether}(token, 0);
        assertEq(_curve(token).taxPot, potBefore);
    }

    function test_Buy_RefundsExcessBeyondThreshold() public {
        address token = _launch();
        _afterWindow();
        vm.prank(alice);
        launcher.buy{value: 0.09 ether}(token, 0);
        assertEq(_raised(token), 0.09 ether);

        uint256 before = bob.balance;
        vm.prank(bob);
        launcher.buy{value: 2 ether}(token, 0);
        assertEq(before - bob.balance, 0.01 ether);
        assertEq(_raised(token), GRAD);
        assertTrue(_curve(token).graduated);
    }

    function test_Buy_ThresholdInWindow_TaxGrossedUpOnUsedPortion() public {
        address token = _launch();
        vm.prank(alice);
        launcher.buy{value: 0.05 ether}(token, 0); // taxed: net 0.04, pot 0.01
        uint256 remaining = GRAD - _raised(token);
        assertEq(remaining, 0.06 ether);
        uint256 potBefore = _curve(token).taxPot;

        uint256 value = 1 ether;
        uint256 expectedTax = (remaining * TAX) / (BPS - TAX);
        (uint256 qOut, uint256 qTax, uint256 qUsed, uint256 qRefund) = launcher.quoteBuy(token, value);
        assertEq(qTax, expectedTax);
        assertEq(qUsed, remaining + expectedTax);
        assertEq(qRefund, value - remaining - expectedTax);

        uint256 before = sniper.balance;
        vm.prank(sniper);
        uint256 out = launcher.buy{value: value}(token, 0);
        assertEq(out, qOut);
        assertEq(before - sniper.balance, remaining + expectedTax);
        assertTrue(_curve(token).graduated);
        // The pot (potBefore + expectedTax) went into the pool at graduation.
        LaunchAMM.Pool memory p = amm.pool(_curve(token).poolId);
        assertEq(p.ethReserve, GRAD + potBefore + expectedTax);
    }

    function test_Buy_ReachingThreshold_GraduatesSameTx() public {
        address token = _launch();
        _afterWindow();
        vm.prank(alice);
        launcher.buy{value: 0.05 ether}(token, 0);
        uint256 soldBefore = _curve(token).tokensSold;
        (uint256 qOut,,,) = launcher.quoteBuy(token, 1 ether);

        vm.expectEmit(true, true, false, false, address(launcher));
        emit Graduated(token, 0, 0, 0, 0);
        vm.prank(bob);
        launcher.buy{value: 1 ether}(token, 0);

        CurveLauncher.Curve memory c = _curve(token);
        assertTrue(c.graduated);
        assertEq(c.tokensSold, soldBefore + qOut);
        assertEq(c.taxPot, 0);
        LaunchAMM.Pool memory p = amm.pool(c.poolId);
        assertEq(p.token, token);
        assertEq(p.creator, address(launcher));
        assertEq(p.ethReserve, GRAD);
        assertEq(p.tokenReserve, SUPPLY - c.tokensSold);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.CurveGraduated.selector, token, c.poolId));
        launcher.buy{value: 1}(token, 0);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.CurveGraduated.selector, token, c.poolId));
        launcher.sell(token, 1, 0);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.CurveGraduated.selector, token, c.poolId));
        launcher.quoteBuy(token, 1);
    }

    function test_Buy_SlippageAndZeroValueAndUnknownToken() public {
        address token = _launch();
        _afterWindow();
        (uint256 qOut,,,) = launcher.quoteBuy(token, 0.01 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.SlippageExceeded.selector, qOut, qOut + 1));
        launcher.buy{value: 0.01 ether}(token, qOut + 1);

        vm.prank(alice);
        vm.expectRevert(CurveLauncher.ZeroAmount.selector);
        launcher.buy{value: 0}(token, 0);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.UnknownCurve.selector, bob));
        launcher.buy{value: 1 ether}(bob, 0);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.UnknownCurve.selector, bob));
        launcher.progress(bob);
    }

    function test_Buy_RefundToRevertingReceiver_Reverts() public {
        address token = _launch();
        _afterWindow();
        RevertingReceiver r = new RevertingReceiver(launcher);
        vm.deal(address(r), 1 ether);
        uint256 kBefore = _k(token);
        vm.expectRevert(CurveLauncher.RefundFailed.selector);
        r.buy{value: 1 ether}(token);
        assertEq(_k(token), kBefore);
        assertFalse(_curve(token).graduated);
    }

    function test_Buy_ReentrantReceiver_IsGuarded() public {
        // The refund arrives while the guard is still held, so a nested buy
        // from inside receive() hits ReentrancyGuardReentrantCall. The
        // receiver records it and accepts the refund, so the outer call
        // completes normally.
        address token = _launch();
        _afterWindow();
        ReentrantReceiver r = new ReentrantReceiver(launcher);
        vm.deal(address(r), 2 ether);
        r.buy{value: 1 ether}(token);
        assertEq(
            r.innerRevert(), abi.encodeWithSelector(ReentrancyGuard.ReentrancyGuardReentrantCall.selector)
        );
        assertTrue(_curve(token).graduated);
        assertEq(address(r).balance, 3 ether - GRAD);
    }

    // ------------------------------------------------------------------- sell

    function test_Sell_MathMatchesQuote_ReturnsEth() public {
        address token = _launch();
        _afterWindow();
        vm.prank(alice);
        uint256 bought = launcher.buy{value: 0.02 ether}(token, 0);
        CurveLauncher.Curve memory c = _curve(token);
        uint256 tokensIn = bought / 2;
        uint256 expected = (c.virtualEth * tokensIn) / (c.virtualTokens + tokensIn);
        assertEq(launcher.quoteSell(token, tokensIn), expected);

        vm.startPrank(alice);
        IERC20(token).approve(address(launcher), tokensIn);
        uint256 before = alice.balance;
        vm.expectEmit(true, true, false, true, address(launcher));
        emit CurveSell(token, alice, tokensIn, expected, c.virtualEth - expected, c.virtualTokens + tokensIn);
        uint256 out = launcher.sell(token, tokensIn, expected);
        vm.stopPrank();

        assertEq(out, expected);
        assertEq(alice.balance - before, expected);
        assertEq(IERC20(token).balanceOf(alice), bought - tokensIn);
        assertEq(_curve(token).tokensSold, bought - tokensIn);
        assertGe(_k(token), c.virtualEth * c.virtualTokens);
    }

    function test_Sell_InWindow_NotTaxed() public {
        address token = _launch();
        vm.prank(sniper);
        uint256 bought = launcher.buy{value: 0.01 ether}(token, 0);
        uint256 quote = launcher.quoteSell(token, bought);
        vm.startPrank(sniper);
        IERC20(token).approve(address(launcher), bought);
        uint256 before = sniper.balance;
        launcher.sell(token, bought, 0);
        vm.stopPrank();
        assertEq(sniper.balance - before, quote);
        assertEq(_curve(token).taxPot, (0.01 ether * uint256(TAX)) / BPS);
    }

    function test_Sell_RoundTripNeverProfits() public {
        address token = _launch();
        _afterWindow();
        vm.startPrank(alice);
        uint256 bought = launcher.buy{value: 0.03 ether}(token, 0);
        IERC20(token).approve(address(launcher), bought);
        uint256 out = launcher.sell(token, bought, 0);
        vm.stopPrank();
        assertLe(out, 0.03 ether);
        assertEq(_curve(token).tokensSold, 0);
        assertGe(_curve(token).virtualEth, X0);
    }

    function test_Sell_RequiresApproval_AndSlippage() public {
        address token = _launch();
        _afterWindow();
        vm.prank(alice);
        uint256 bought = launcher.buy{value: 0.01 ether}(token, 0);

        vm.prank(alice);
        vm.expectRevert();
        launcher.sell(token, bought, 0);

        uint256 quote = launcher.quoteSell(token, bought);
        vm.startPrank(alice);
        IERC20(token).approve(address(launcher), bought);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.SlippageExceeded.selector, quote, quote + 1));
        launcher.sell(token, bought, quote + 1);
        vm.expectRevert(CurveLauncher.ZeroAmount.selector);
        launcher.sell(token, 0, 0);
        vm.stopPrank();
    }

    function test_Sell_AllowedWhilePaused() public {
        address token = _launch();
        _afterWindow();
        vm.prank(alice);
        uint256 bought = launcher.buy{value: 0.01 ether}(token, 0);
        vm.prank(pauserGuardian);
        launcher.pause();
        vm.startPrank(alice);
        IERC20(token).approve(address(launcher), bought);
        uint256 out = launcher.sell(token, bought, 0);
        vm.stopPrank();
        assertGt(out, 0);
    }

    function test_Pause_BlocksLaunchAndBuy() public {
        address token = _launch();
        vm.prank(pauserGuardian);
        launcher.pause();
        vm.prank(dev);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        launcher.launch(_params(), bytes32(uint256(99)), 0);
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        launcher.buy{value: 0.01 ether}(token, 0);
        launcher.unpause();
        vm.prank(alice);
        launcher.buy{value: 0.01 ether}(token, 0);
    }

    // ------------------------------------------------------------------ admin

    function test_PauserCanPause_ButNeverUnpause() public {
        vm.prank(pauserGuardian);
        launcher.pause();
        assertTrue(launcher.paused());
        vm.prank(pauserGuardian);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, pauserGuardian));
        launcher.unpause();
        vm.prank(alice);
        vm.expectRevert(CurveLauncher.NotPauser.selector);
        launcher.pause();
    }

    function test_SetPauser_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        launcher.setPauser(alice);
        launcher.setPauser(alice);
        assertEq(launcher.pauser(), alice);
    }

    function test_OwnershipTransferIsTwoStep() public {
        launcher.transferOwnership(alice);
        assertEq(launcher.owner(), address(this));
        assertEq(launcher.pendingOwner(), alice);
        vm.prank(alice);
        launcher.acceptOwnership();
        assertEq(launcher.owner(), alice);
    }

    function test_SetLaunchFee_CapBoundary() public {
        launcher.setLaunchFee(launcher.MAX_LAUNCH_FEE());
        assertEq(launcher.launchFee(), 0.05 ether);
        vm.expectRevert(abi.encodeWithSelector(CurveLauncher.FeeExceedsMax.selector, 0.05 ether + 1));
        launcher.setLaunchFee(0.05 ether + 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        launcher.setLaunchFee(1);
    }

    function test_SetTreasury_RotatesAndRejectsZero() public {
        launcher.setTreasury(alice);
        assertEq(launcher.treasury(), alice);
        vm.expectRevert(CurveLauncher.ZeroTreasury.selector);
        launcher.setTreasury(address(0));
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        launcher.setTreasury(bob);
    }

    function test_TimelockOwned_AdminGoesThroughDelay() public {
        address proposer = makeAddr("proposer");
        TimelockController timelock = _newTimelock(proposer, 1 days);
        CurveLauncher tl = _newLauncher(address(timelock));
        assertEq(tl.owner(), address(timelock));

        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, proposer));
        tl.setLaunchFee(0.0002 ether);

        bytes memory call = abi.encodeCall(CurveLauncher.setLaunchFee, (0.0002 ether));
        vm.prank(proposer);
        timelock.schedule(address(tl), 0, call, bytes32(0), bytes32(0), 1 days);
        vm.expectRevert();
        timelock.execute(address(tl), 0, call, bytes32(0), bytes32(0));
        assertEq(tl.launchFee(), 0);
        vm.warp(block.timestamp + 1 days);
        timelock.execute(address(tl), 0, call, bytes32(0), bytes32(0));
        assertEq(tl.launchFee(), 0.0002 ether);

        vm.prank(pauserGuardian);
        tl.pause();
        assertTrue(tl.paused());
    }

    // ------------------------------------------------------------- graduation

    function test_Graduate_SeedsExactlyHeldAmounts() public {
        address token = _launch(dev, 0.002 ether, bytes32(uint256(21)));
        vm.prank(sniper);
        launcher.buy{value: 0.02 ether}(token, 0); // taxed
        uint256 pot = _curve(token).taxPot;
        assertGt(pot, 0);
        _afterWindow();
        vm.prank(alice);
        launcher.buy{value: 0.03 ether}(token, 0);

        uint256 launcherEthBefore = address(launcher).balance;
        assertEq(launcherEthBefore, _raised(token) + pot);

        vm.prank(bob);
        launcher.buy{value: 1 ether}(token, 0);
        CurveLauncher.Curve memory c = _curve(token);
        assertTrue(c.graduated);
        LaunchAMM.Pool memory p = amm.pool(c.poolId);
        assertEq(p.ethReserve, GRAD + pot);
        assertEq(p.tokenReserve, SUPPLY - c.tokensSold);
        assertGe(p.tokenReserve, R);
        assertLt(p.tokenReserve, R + 1e12);
        assertEq(address(launcher).balance, 0);
        assertEq(IERC20(token).balanceOf(address(launcher)), 0);
        assertEq(c.taxPot, 0);
        assertEq(c.sharesLocked, amm.sharesOf(c.poolId, address(launcher)));
        assertEq(p.totalShares, c.sharesLocked + amm.MINIMUM_LIQUIDITY());
    }

    function test_Graduate_PriceContinuity() public {
        address token = _launch();
        _graduate(token);
        CurveLauncher.Curve memory c = _curve(token);
        LaunchAMM.Pool memory p = amm.pool(c.poolId);
        uint256 curveEnd = (c.virtualEth * 1e18) / c.virtualTokens;
        uint256 poolOpen = (p.ethReserve * 1e18) / p.tokenReserve;
        assertApproxEqAbs(curveEnd, poolOpen, 1);
        assertEq(poolOpen, 500_000_000); // 5e-10 ETH per token at the defaults
    }

    function test_Graduate_TaxPremium() public {
        address token = _launch();
        vm.prank(sniper);
        launcher.buy{value: 0.05 ether}(token, 0); // net 0.04, pot 0.01
        _afterWindow();
        vm.prank(alice);
        launcher.buy{value: 1 ether}(token, 0);
        CurveLauncher.Curve memory c = _curve(token);
        LaunchAMM.Pool memory p = amm.pool(c.poolId);
        assertEq(p.ethReserve, GRAD + 0.01 ether);
        uint256 curveEnd = (c.virtualEth * 1e18) / c.virtualTokens;
        uint256 poolOpen = (p.ethReserve * 1e18) / p.tokenReserve;
        // Premium of pot / GRAD = 10%, within rounding.
        assertApproxEqRel(poolOpen, (curveEnd * 110) / 100, 1e14);
    }

    function test_Graduate_SharesLocked() public {
        address token = _launch();
        _graduate(token);
        CurveLauncher.Curve memory c = _curve(token);
        LaunchAMM.Pool memory p = amm.pool(c.poolId);
        assertEq(p.creator, address(launcher));
        assertEq(p.protocolFeeBps, 0);
        assertEq(amm.sharesOf(c.poolId, address(launcher)), c.sharesLocked);
        assertGt(c.sharesLocked, 0);

        address[3] memory who = [dev, address(this), alice];
        for (uint256 i = 0; i < who.length; i++) {
            vm.prank(who[i]);
            vm.expectRevert(LaunchAMM.InsufficientShares.selector);
            amm.removeLiquidity(c.poolId, 1, 0, 0);
        }
        assertEq(amm.poolOf(token, address(launcher)), c.poolId + 1);
        assertEq(amm.poolOf(token, dev), 0);
    }

    function test_Graduate_PoolTradable_LpFeeCompoundsIntoLockedReserves() public {
        address token = _launch();
        _graduate(token);
        uint256 poolId = _curve(token).poolId;
        LaunchAMM.Pool memory before = amm.pool(poolId);
        vm.prank(bob);
        uint256 out = amm.swapEthForTokens{value: 0.01 ether}(poolId, 0);
        assertGt(out, 0);
        LaunchAMM.Pool memory after_ = amm.pool(poolId);
        assertGt(after_.ethReserve * after_.tokenReserve, before.ethReserve * before.tokenReserve);
        assertEq(amm.accruedEth(address(launcher)), 0);
        assertEq(amm.accruedEth(address(splitter)), 0);
    }

    function test_AbandonedCurve_TokensAndEthSit() public {
        address token = _launch();
        _afterWindow();
        vm.prank(alice);
        uint256 bought = launcher.buy{value: 0.01 ether}(token, 0);
        vm.warp(block.timestamp + 365 days);
        assertEq(address(launcher).balance, 0.01 ether);
        assertEq(IERC20(token).balanceOf(address(launcher)), SUPPLY - bought);
        assertFalse(_curve(token).graduated);
        vm.startPrank(alice);
        IERC20(token).approve(address(launcher), bought);
        launcher.sell(token, bought, 0);
        vm.stopPrank();
        assertEq(IERC20(token).balanceOf(address(launcher)), SUPPLY);
    }

    function test_Progress_View() public {
        address token = _launch(dev, 0.005 ether, bytes32(uint256(31)));
        (uint256 raised, uint256 grad, uint256 bps, uint64 windowEnd, bool inWindow) = launcher.progress(token);
        assertEq(raised, 0.005 ether);
        assertEq(grad, GRAD);
        assertEq(bps, 500);
        assertEq(windowEnd, uint64(block.timestamp) + WINDOW);
        assertTrue(inWindow);
        _afterWindow();
        (,,,, inWindow) = launcher.progress(token);
        assertFalse(inWindow);
        _graduate(token);
        (raised,, bps,,) = launcher.progress(token);
        assertEq(raised, GRAD);
        assertEq(bps, BPS);
    }

    // ------------------------------------------------------------------- fuzz

    function testFuzz_KNeverDecreases(uint96 ethIn, uint16 sellBps) public {
        ethIn = uint96(bound(ethIn, 1e12, 0.09 ether));
        sellBps = uint16(bound(sellBps, 1, BPS));
        address token = _launch();
        _afterWindow();
        uint256 k0 = _k(token);
        vm.prank(alice);
        uint256 bought = launcher.buy{value: ethIn}(token, 0);
        uint256 k1 = _k(token);
        assertGe(k1, k0);
        uint256 tokensIn = (bought * sellBps) / BPS;
        if (tokensIn == 0 || launcher.quoteSell(token, tokensIn) == 0) return;
        vm.startPrank(alice);
        IERC20(token).approve(address(launcher), tokensIn);
        launcher.sell(token, tokensIn, 0);
        vm.stopPrank();
        assertGe(_k(token), k1);
    }

    function testFuzz_EthConservation(uint96[4] memory buys, uint16[4] memory sells) public {
        launcher.setLaunchFee(0.0002 ether);
        address token = _launch(dev, 0.001 ether, bytes32(uint256(41)));
        address[4] memory buyers = [alice, bob, sniper, dev];
        for (uint256 i = 0; i < 4; i++) {
            if (_curve(token).graduated) break;
            uint256 v = bound(buys[i], 1e12, 0.2 ether);
            if (i == 1) _afterWindow();
            uint256 before = buyers[i].balance;
            vm.prank(buyers[i]);
            uint256 got = launcher.buy{value: v}(token, 0);
            uint256 spent = before - buyers[i].balance;
            assertLe(spent, v);
            _assertConserved(token);
            if (_curve(token).graduated) break;
            uint256 tokensIn = (got * bound(sells[i], 0, BPS)) / BPS;
            if (tokensIn == 0 || launcher.quoteSell(token, tokensIn) == 0) continue;
            vm.startPrank(buyers[i]);
            IERC20(token).approve(address(launcher), tokensIn);
            launcher.sell(token, tokensIn, 0);
            vm.stopPrank();
            _assertConserved(token);
        }
    }

    function _assertConserved(address token) internal view {
        CurveLauncher.Curve memory c = _curve(token);
        uint256 held = c.graduated ? 0 : (c.virtualEth - X0) + c.taxPot;
        assertEq(address(launcher).balance, held + launcher.accruedLaunchFees());
    }

    function testFuzz_TokensSoldNeverExceedCurveSupply(uint96[8] memory buys) public {
        address token = _launch();
        for (uint256 i = 0; i < 8; i++) {
            if (_curve(token).graduated) break;
            if (i == 2) _afterWindow();
            uint256 v = bound(buys[i], 1e12, 0.05 ether);
            vm.prank(alice);
            launcher.buy{value: v}(token, 0);
            assertLe(_curve(token).tokensSold, C);
        }
        if (!_curve(token).graduated) _graduate(token);
        CurveLauncher.Curve memory c = _curve(token);
        assertLe(c.tokensSold, C);
        assertLt(C - c.tokensSold, 1e12);
    }

    function testFuzz_SellSolvency(uint96 buy, uint16 sellBps) public {
        buy = uint96(bound(buy, 1e12, 0.09 ether));
        sellBps = uint16(bound(sellBps, 1, BPS));
        address token = _launch();
        _afterWindow();
        vm.prank(alice);
        uint256 bought = launcher.buy{value: buy}(token, 0);
        uint256 tokensIn = (bought * sellBps) / BPS;
        if (tokensIn == 0 || launcher.quoteSell(token, tokensIn) == 0) return;
        vm.startPrank(alice);
        IERC20(token).approve(address(launcher), tokensIn);
        uint256 out = launcher.sell(token, tokensIn, 0);
        vm.stopPrank();
        assertLe(out, buy);
        assertGe(_curve(token).virtualEth, X0);
        assertGe(address(launcher).balance, _raised(token));
    }

    function testFuzz_DevBuyExemptAndCapped(uint96 devBuy) public {
        if (devBuy > MAX_DEV) {
            vm.deal(dev, uint256(devBuy) + 1 ether);
            vm.prank(dev);
            vm.expectRevert(abi.encodeWithSelector(CurveLauncher.DevBuyExceedsCap.selector, uint256(devBuy), MAX_DEV));
            launcher.launch{value: devBuy}(_params(), bytes32(uint256(51)), devBuy);
            return;
        }
        devBuy = uint96(bound(devBuy, 1e9, MAX_DEV));
        uint256 expected = launcher.quoteLaunch(SUPPLY, devBuy);
        address token = _launch(dev, devBuy, bytes32(uint256(52)));
        assertEq(IERC20(token).balanceOf(dev), expected);
        assertEq(_curve(token).taxPot, 0);
        assertFalse(_curve(token).graduated);
    }

    function testFuzz_WindowTaxStopsAfterN(uint32 dt) public {
        dt = uint32(bound(dt, 0, 3600));
        address token = _launch();
        uint64 launchedAt = _curve(token).launchedAt;
        vm.warp(launchedAt + dt);
        vm.prank(alice);
        launcher.buy{value: 0.001 ether}(token, 0);
        uint256 pot = _curve(token).taxPot;
        if (dt < WINDOW) assertEq(pot, (0.001 ether * uint256(TAX)) / BPS);
        else assertEq(pot, 0);
    }

    function testFuzz_GraduationSeedsHeldAmounts(uint96 devBuy, uint96[5] memory buys) public {
        devBuy = uint96(bound(devBuy, 0, MAX_DEV));
        address token = _launch(dev, devBuy, bytes32(uint256(61)));
        for (uint256 i = 0; i < 5; i++) {
            if (_curve(token).graduated) break;
            if (i == 3) _afterWindow();
            uint256 v = bound(buys[i], 1e12, 0.06 ether);
            vm.prank(i % 2 == 0 ? alice : sniper);
            launcher.buy{value: v}(token, 0);
        }
        uint256 pot = _curve(token).taxPot;
        if (!_curve(token).graduated) {
            _afterWindow();
            vm.prank(bob);
            launcher.buy{value: 1 ether}(token, 0);
        }
        CurveLauncher.Curve memory c = _curve(token);
        assertTrue(c.graduated);
        LaunchAMM.Pool memory p = amm.pool(c.poolId);
        // If the graduating buy happened inside the window its own tax joined
        // the pot, so the pool holds at least GRAD + the pot seen beforehand.
        assertGe(p.ethReserve, GRAD + pot);
        assertEq(p.tokenReserve, SUPPLY - c.tokensSold);
        assertGe(p.tokenReserve, R);
        assertEq(address(launcher).balance, launcher.accruedLaunchFees());
        assertEq(IERC20(token).balanceOf(address(launcher)), 0);
    }

    function testFuzz_SupplyScaling(uint256 supply) public {
        supply = bound(supply, launcher.MIN_SUPPLY(), launcher.MAX_SUPPLY());
        CurveLauncher.LaunchParams memory p = _params();
        p.totalSupply = supply;
        vm.prank(dev);
        address token = launcher.launch(p, bytes32(uint256(71)), 0);
        CurveLauncher.Curve memory c = _curve(token);
        uint256 curveSupply = (supply * SHARE) / BPS;
        assertEq(c.curveSupply, curveSupply);
        assertEq(c.virtualTokens, (curveSupply * (X0 + GRAD)) / GRAD);

        _graduate(token);
        c = _curve(token);
        LaunchAMM.Pool memory pool = amm.pool(c.poolId);
        // 1e27 scaling keeps the quotient precise at the supply ceiling.
        uint256 curveEnd = (c.virtualEth * 1e27) / c.virtualTokens;
        uint256 poolOpen = (pool.ethReserve * 1e27) / pool.tokenReserve;
        assertApproxEqRel(curveEnd, poolOpen, 1e12);
        assertLe(c.tokensSold, curveSupply);
    }
}
