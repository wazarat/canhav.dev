// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {FeeSplitter} from "../src/FeeSplitter.sol";
import {LaunchAMM} from "../src/LaunchAMM.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {FeeOnTransferToken} from "./MilestoneEscrow.t.sol";

contract LaunchAMMTest is Test {
    LaunchAMM internal amm;
    FeeSplitter internal splitter;
    LaunchToken internal token;

    address internal ammOwner = makeAddr("ammOwner");
    address internal creator = makeAddr("creator");
    address internal lp = makeAddr("lp");
    address internal trader = makeAddr("trader");
    address internal platformPayee = makeAddr("platformPayee");

    uint256 internal constant SUPPLY = 10_000_000e18;

    event PoolCreated(
        uint256 indexed poolId,
        address indexed token,
        address indexed creator,
        uint16 protocolFeeBps
    );

    event Swapped(
        uint256 indexed poolId,
        address indexed trader,
        bool ethToToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 protocolFeePaid
    );

    function setUp() public {
        address[] memory payees = new address[](1);
        payees[0] = platformPayee;
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10_000;
        splitter = new FeeSplitter(ammOwner, payees, shares);
        amm = new LaunchAMM(address(splitter), ammOwner);

        LaunchToken impl = new LaunchToken();
        token = LaunchToken(Clones.clone(address(impl)));
        token.initialize("Pool Token", "POOL", SUPPLY, creator);

        vm.deal(creator, 100 ether);
        vm.deal(lp, 100 ether);
        vm.deal(trader, 100 ether);
        vm.prank(creator);
        token.transfer(lp, 2_000_000e18);
        vm.prank(creator);
        token.transfer(trader, 1_000_000e18);
    }

    /// @dev Creator pool, opted in (20 bps default), seeded 10 ETH / 1M tokens.
    function _seededPool() internal returns (uint256 poolId) {
        vm.startPrank(creator);
        poolId = amm.createPool(address(token), true);
        token.approve(address(amm), 1_000_000e18);
        amm.addLiquidity{value: 10 ether}(poolId, 1_000_000e18);
        vm.stopPrank();
    }

    function _k(uint256 poolId) internal view returns (uint256) {
        LaunchAMM.Pool memory p = amm.pool(poolId);
        return p.ethReserve * p.tokenReserve;
    }

    // ------------------------------------------------------------ pool admin

    function test_ConstructorAndOwner() public view {
        assertEq(amm.splitter(), address(splitter));
        assertEq(amm.owner(), ammOwner);
        assertEq(amm.defaultProtocolFeeBps(), 20);
    }

    function test_RevertWhen_ZeroSplitter() public {
        vm.expectRevert(LaunchAMM.ZeroSplitter.selector);
        new LaunchAMM(address(0), ammOwner);
    }

    function test_SetDefaultProtocolFee_OwnerOnlyAndCapped() public {
        vm.prank(creator);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, creator)
        );
        amm.setDefaultProtocolFeeBps(10);

        vm.prank(ammOwner);
        amm.setDefaultProtocolFeeBps(50); // cap boundary ok
        assertEq(amm.defaultProtocolFeeBps(), 50);

        vm.prank(ammOwner);
        vm.expectRevert(abi.encodeWithSelector(LaunchAMM.FeeExceedsMax.selector, uint16(51)));
        amm.setDefaultProtocolFeeBps(51);
    }

    function test_CreatePool_OptInFreezesCurrentDefault() public {
        vm.expectEmit(true, true, true, true, address(amm));
        emit PoolCreated(0, address(token), creator, 20);
        vm.prank(creator);
        uint256 optedIn = amm.createPool(address(token), true);

        // Default changes later — the pool keeps its frozen rate.
        vm.prank(ammOwner);
        amm.setDefaultProtocolFeeBps(50);
        assertEq(amm.pool(optedIn).protocolFeeBps, 20);

        // Opt-out pool is 0 forever; same token, different creator is fine.
        vm.prank(lp);
        uint256 optedOut = amm.createPool(address(token), false);
        assertEq(amm.pool(optedOut).protocolFeeBps, 0);

        // Duplicate per (token, creator) is blocked.
        vm.prank(creator);
        vm.expectRevert(LaunchAMM.PoolExists.selector);
        amm.createPool(address(token), false);

        assertEq(amm.poolOf(address(token), creator), optedIn + 1);
        assertEq(amm.poolOf(address(token), lp), optedOut + 1);
    }

    // -------------------------------------------------------------- liquidity

    function test_FirstAddLiquidity_SqrtSharesAndLock() public {
        vm.startPrank(creator);
        uint256 poolId = amm.createPool(address(token), true);
        token.approve(address(amm), 1_000_000e18);
        uint256 minted = amm.addLiquidity{value: 10 ether}(poolId, 1_000_000e18);
        vm.stopPrank();

        // sqrt(10e18 * 1e24) = sqrt(1e43) ≈ 3.1622e21
        uint256 expectedTotal = 3162277660168379331998;
        LaunchAMM.Pool memory p = amm.pool(poolId);
        assertEq(p.totalShares, expectedTotal);
        assertEq(minted, expectedTotal - 1e3); // MINIMUM_LIQUIDITY locked
        assertEq(amm.sharesOf(poolId, creator), minted);
        assertEq(p.ethReserve, 10 ether);
        assertEq(p.tokenReserve, 1_000_000e18);
        assertEq(token.balanceOf(address(amm)), 1_000_000e18);
    }

    function test_RevertWhen_InitialLiquidityTooSmall() public {
        vm.startPrank(creator);
        uint256 poolId = amm.createPool(address(token), true);
        token.approve(address(amm), 1e6);
        vm.expectRevert(LaunchAMM.InsufficientInitialLiquidity.selector);
        amm.addLiquidity{value: 1}(poolId, 1e6);
        vm.stopPrank();
    }

    function test_SubsequentAdd_ProportionalWithRoundUpAndLimit() public {
        uint256 poolId = _seededPool();
        uint256 totalBefore = amm.pool(poolId).totalShares;

        vm.startPrank(lp);
        token.approve(address(amm), 200_001e18);
        // 2 ETH against 10 ETH / 1M → needs exactly 200k tokens.
        uint256 minted = amm.addLiquidity{value: 2 ether}(poolId, 200_001e18);
        vm.stopPrank();

        LaunchAMM.Pool memory p = amm.pool(poolId);
        assertEq(p.ethReserve, 12 ether);
        assertEq(p.tokenReserve, 1_200_000e18);
        // Shares pro-rata to the ETH contribution.
        assertEq(minted, (2 ether * totalBefore) / 10 ether);
        assertEq(amm.sharesOf(poolId, lp), minted);

        // Token limit below the proportional requirement reverts.
        vm.startPrank(lp);
        token.approve(address(amm), 100e18);
        vm.expectRevert(
            abi.encodeWithSelector(LaunchAMM.TokenLimitExceeded.selector, 100_000e18, 100e18)
        );
        amm.addLiquidity{value: 1 ether}(poolId, 100e18);
        vm.stopPrank();
    }

    function test_RemoveLiquidity_ProRataAndSlippage() public {
        uint256 poolId = _seededPool();
        uint256 creatorShares = amm.sharesOf(poolId, creator);

        uint256 ethBefore = creator.balance;
        uint256 tokenBefore = token.balanceOf(creator);

        vm.prank(creator);
        (uint256 ethOut, uint256 tokensOut) =
            amm.removeLiquidity(poolId, creatorShares / 2, 0, 0);

        assertEq(creator.balance, ethBefore + ethOut);
        assertEq(token.balanceOf(creator), tokenBefore + tokensOut);
        LaunchAMM.Pool memory p = amm.pool(poolId);
        assertEq(p.ethReserve, 10 ether - ethOut);
        assertEq(p.tokenReserve, 1_000_000e18 - tokensOut);

        vm.prank(creator);
        vm.expectRevert(); // SlippageExceeded — min above possible output
        amm.removeLiquidity(poolId, 1e3, 1000 ether, 0);

        vm.prank(lp);
        vm.expectRevert(LaunchAMM.InsufficientShares.selector);
        amm.removeLiquidity(poolId, 1, 0, 0);
    }

    function test_RevertWhen_FeeOnTransferToken() public {
        FeeOnTransferToken feeToken = new FeeOnTransferToken();
        feeToken.mint(creator, 1_000e18);

        vm.startPrank(creator);
        uint256 poolId = amm.createPool(address(feeToken), false);
        feeToken.approve(address(amm), 100e18);
        vm.expectRevert(
            abi.encodeWithSelector(LaunchAMM.UnexpectedTransferAmount.selector, 99e18, 100e18)
        );
        amm.addLiquidity{value: 1 ether}(poolId, 100e18);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ swaps

    function test_SwapEthForTokens_MathFeesAndAccrual() public {
        uint256 poolId = _seededPool();
        uint256 kBefore = _k(poolId);

        uint256 ethIn = 1 ether;
        uint256 protocolFee = (ethIn * 20) / 10_000; // 0.002 ETH
        uint256 inNet = ethIn - protocolFee;
        uint256 inAfterLp = (inNet * 9970) / 10_000;
        uint256 expectedOut = (1_000_000e18 * inAfterLp) / (10 ether + inAfterLp);
        assertEq(amm.quoteEthForTokens(poolId, ethIn), expectedOut);

        vm.expectEmit(true, true, true, true, address(amm));
        emit Swapped(poolId, trader, true, ethIn, expectedOut, protocolFee);
        vm.prank(trader);
        uint256 out = amm.swapEthForTokens{value: ethIn}(poolId, expectedOut);

        assertEq(out, expectedOut);
        LaunchAMM.Pool memory p = amm.pool(poolId);
        assertEq(p.ethReserve, 10 ether + inNet);
        assertEq(p.tokenReserve, 1_000_000e18 - out);
        assertGe(_k(poolId), kBefore); // LP fee grows k

        // Exact 70/30 split of the protocol fee.
        uint256 projectCut = (protocolFee * 7000) / 10_000;
        assertEq(amm.accruedEth(creator), projectCut);
        assertEq(amm.accruedEth(address(splitter)), protocolFee - projectCut);
    }

    function test_SwapTokensForEth_MathFeesAndAccrual() public {
        uint256 poolId = _seededPool();

        uint256 tokenIn = 100_000e18;
        uint256 protocolFee = (tokenIn * 20) / 10_000;
        uint256 inNet = tokenIn - protocolFee;
        uint256 inAfterLp = (inNet * 9970) / 10_000;
        uint256 expectedOut = (10 ether * inAfterLp) / (1_000_000e18 + inAfterLp);
        assertEq(amm.quoteTokensForEth(poolId, tokenIn), expectedOut);

        uint256 traderEthBefore = trader.balance;
        vm.startPrank(trader);
        token.approve(address(amm), tokenIn);
        uint256 out = amm.swapTokensForEth(poolId, tokenIn, expectedOut);
        vm.stopPrank();

        assertEq(out, expectedOut);
        assertEq(trader.balance, traderEthBefore + out);
        assertEq(amm.accruedTokens(address(token), creator), (protocolFee * 7000) / 10_000);
        assertEq(
            amm.accruedTokens(address(token), address(splitter)),
            protocolFee - (protocolFee * 7000) / 10_000
        );

        // AMM's token balance = reserve + accrued (fees are outside the curve).
        LaunchAMM.Pool memory p = amm.pool(poolId);
        assertEq(token.balanceOf(address(amm)), p.tokenReserve + protocolFee);
    }

    function test_OptOutPool_AccruesNothing() public {
        vm.startPrank(lp);
        uint256 poolId = amm.createPool(address(token), false);
        token.approve(address(amm), 1_000_000e18);
        amm.addLiquidity{value: 10 ether}(poolId, 1_000_000e18);
        vm.stopPrank();

        vm.prank(trader);
        amm.swapEthForTokens{value: 1 ether}(poolId, 0);

        assertEq(amm.accruedEth(lp), 0);
        assertEq(amm.accruedEth(address(splitter)), 0);
    }

    function test_SwapGuards() public {
        uint256 poolId = _seededPool();

        vm.prank(trader);
        vm.expectRevert(); // SlippageExceeded
        amm.swapEthForTokens{value: 1 ether}(poolId, type(uint256).max);

        vm.prank(trader);
        vm.expectRevert(LaunchAMM.ZeroAmount.selector);
        amm.swapEthForTokens{value: 0}(poolId, 0);

        vm.prank(creator);
        uint256 empty = amm.createPool(makeAddr("otherToken"), false);
        vm.prank(trader);
        vm.expectRevert(LaunchAMM.NoLiquidity.selector);
        amm.swapEthForTokens{value: 1 ether}(empty, 0);

        vm.expectRevert(LaunchAMM.UnknownPool.selector);
        amm.swapEthForTokens{value: 1 ether}(99, 0);
    }

    // ----------------------------------------------------------------- claims

    function test_Claims_PermissionlessToAccount() public {
        uint256 poolId = _seededPool();
        vm.prank(trader);
        amm.swapEthForTokens{value: 1 ether}(poolId, 0);

        uint256 creatorAccrued = amm.accruedEth(creator);
        uint256 splitterAccrued = amm.accruedEth(address(splitter));
        assertGt(creatorAccrued, 0);

        uint256 creatorBefore = creator.balance;
        vm.prank(trader); // anyone can trigger; funds go to the account
        amm.claimEth(creator);
        assertEq(creator.balance, creatorBefore + creatorAccrued);
        assertEq(amm.accruedEth(creator), 0);

        amm.claimEth(address(splitter));
        assertEq(address(splitter).balance, splitterAccrued);

        // Splitter → platform payee, fully auditable.
        splitter.distributeEth();
        assertEq(platformPayee.balance, splitterAccrued);

        vm.expectRevert(LaunchAMM.NothingAccrued.selector);
        amm.claimEth(creator);
    }

    // ------------------------------------------------------------------- fuzz

    function testFuzz_KNeverDecreases(uint96 ethIn, uint96 tokenIn) public {
        uint256 poolId = _seededPool();
        ethIn = uint96(bound(uint256(ethIn), 1e9, 50 ether));
        tokenIn = uint96(bound(uint256(tokenIn), 1e12, 500_000e18));

        uint256 k0 = _k(poolId);
        vm.prank(trader);
        amm.swapEthForTokens{value: ethIn}(poolId, 0);
        uint256 k1 = _k(poolId);
        assertGe(k1, k0);

        vm.startPrank(trader);
        token.approve(address(amm), tokenIn);
        amm.swapTokensForEth(poolId, tokenIn, 0);
        vm.stopPrank();
        assertGe(_k(poolId), k1);
    }

    function testFuzz_EthConservation(uint96 ethIn) public {
        uint256 poolId = _seededPool();
        ethIn = uint96(bound(uint256(ethIn), 1e9, 50 ether));

        vm.prank(trader);
        amm.swapEthForTokens{value: ethIn}(poolId, 0);

        LaunchAMM.Pool memory p = amm.pool(poolId);
        assertEq(
            address(amm).balance,
            p.ethReserve + amm.accruedEth(creator) + amm.accruedEth(address(splitter))
        );
    }
}
