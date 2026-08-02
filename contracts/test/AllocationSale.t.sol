// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {AllocationSale} from "../src/AllocationSale.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {FeeOnTransferToken} from "./MilestoneEscrow.t.sol";

contract AllocationSaleTest is Test {
    AllocationSale internal saleContract;
    LaunchToken internal tokenImpl;
    LaunchToken internal token;

    address internal creator = makeAddr("creator");
    address internal buyer = makeAddr("buyer");
    address internal buyer2 = makeAddr("buyer2");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant SUPPLY = 1_000_000e18;
    uint128 internal constant ALLOCATION = 500_000e18;
    uint256 internal constant PRICE = 1e14; // 0.0001 ETH per whole token
    uint64 internal constant WINDOW = 7 days;

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

    function setUp() public {
        saleContract = new AllocationSale();
        tokenImpl = new LaunchToken();
        token = LaunchToken(Clones.clone(address(tokenImpl)));
        token.initialize("Sale Token", "SALE", SUPPLY, creator);
        vm.deal(buyer, 100 ether);
        vm.deal(buyer2, 100 ether);
    }

    function _tranches() internal view returns (AllocationSale.ProceedsTrancheInput[] memory t) {
        t = new AllocationSale.ProceedsTrancheInput[](2);
        t[0] = AllocationSale.ProceedsTrancheInput({
            milestoneIndex: 0,
            bps: 6000,
            unlockTime: uint64(block.timestamp) + WINDOW
        });
        t[1] = AllocationSale.ProceedsTrancheInput({
            milestoneIndex: 2,
            bps: 4000,
            unlockTime: uint64(block.timestamp) + WINDOW + 30 days
        });
    }

    function _createSale(uint128 cap) internal returns (uint256 id) {
        vm.startPrank(creator);
        token.approve(address(saleContract), ALLOCATION);
        id = saleContract.createSale(
            address(token),
            keccak256("journey"),
            PRICE,
            ALLOCATION,
            0, // resolves to now
            uint64(block.timestamp) + WINDOW,
            cap,
            _tranches()
        );
        vm.stopPrank();
    }

    // ----------------------------------------------------------------- create

    function test_CreateSale_StoresStatePullsTokensEmits() public {
        vm.startPrank(creator);
        token.approve(address(saleContract), ALLOCATION);

        vm.expectEmit(true, true, true, true, address(saleContract));
        emit SaleCreated(
            0,
            address(token),
            creator,
            keccak256("journey"),
            PRICE,
            ALLOCATION,
            uint64(block.timestamp),
            uint64(block.timestamp) + WINDOW,
            0
        );
        vm.expectEmit(true, true, true, true, address(saleContract));
        emit ProceedsTranchePlanned(0, 0, 0, 6000, uint64(block.timestamp) + WINDOW);
        vm.expectEmit(true, true, true, true, address(saleContract));
        emit ProceedsTranchePlanned(0, 1, 2, 4000, uint64(block.timestamp) + WINDOW + 30 days);

        uint256 id = saleContract.createSale(
            address(token),
            keccak256("journey"),
            PRICE,
            ALLOCATION,
            0,
            uint64(block.timestamp) + WINDOW,
            0,
            _tranches()
        );
        vm.stopPrank();

        assertEq(id, 0);
        assertEq(token.balanceOf(address(saleContract)), ALLOCATION);
        AllocationSale.Sale memory s = saleContract.sale(id);
        assertEq(s.creator, creator);
        assertEq(s.price, PRICE);
        assertEq(s.allocation, ALLOCATION);
        assertEq(s.sold, 0);
        assertEq(s.raised, 0);
        assertEq(s.startTime, uint64(block.timestamp));
        assertEq(s.unclaimedTranches, 2);
        assertEq(saleContract.trancheCount(id), 2);
    }

    function test_RevertWhen_CreateParamsInvalid() public {
        AllocationSale.ProceedsTrancheInput[] memory t = _tranches();
        uint64 end = uint64(block.timestamp) + WINDOW;
        vm.startPrank(creator);
        token.approve(address(saleContract), ALLOCATION);

        vm.expectRevert(AllocationSale.ZeroPrice.selector);
        saleContract.createSale(address(token), 0, 0, ALLOCATION, 0, end, 0, t);

        vm.expectRevert(AllocationSale.ZeroAllocation.selector);
        saleContract.createSale(address(token), 0, PRICE, 0, 0, end, 0, t);

        // end <= start
        vm.expectRevert(AllocationSale.WindowInvalid.selector);
        saleContract.createSale(
            address(token), 0, PRICE, ALLOCATION, uint64(block.timestamp) + 2 days,
            uint64(block.timestamp) + 1 days, 0, t
        );

        // end in the past
        vm.warp(block.timestamp + 30 days);
        vm.expectRevert(AllocationSale.WindowInvalid.selector);
        saleContract.createSale(
            address(token), 0, PRICE, ALLOCATION, 1, uint64(block.timestamp) - 1, 0, t
        );
        vm.stopPrank();
    }

    function test_RevertWhen_TrancheRulesBroken() public {
        uint64 end = uint64(block.timestamp) + WINDOW;
        vm.startPrank(creator);
        token.approve(address(saleContract), ALLOCATION);

        AllocationSale.ProceedsTrancheInput[] memory none;
        vm.expectRevert(AllocationSale.NoTranches.selector);
        saleContract.createSale(address(token), 0, PRICE, ALLOCATION, 0, end, 0, none);

        AllocationSale.ProceedsTrancheInput[] memory six =
            new AllocationSale.ProceedsTrancheInput[](6);
        for (uint256 i = 0; i < 6; i++) {
            six[i] = AllocationSale.ProceedsTrancheInput(uint8(i), 1000, end);
        }
        vm.expectRevert(AllocationSale.TooManyTranches.selector);
        saleContract.createSale(address(token), 0, PRICE, ALLOCATION, 0, end, 0, six);

        AllocationSale.ProceedsTrancheInput[] memory t = _tranches();
        t[1].bps = 0;
        vm.expectRevert(AllocationSale.ZeroBps.selector);
        saleContract.createSale(address(token), 0, PRICE, ALLOCATION, 0, end, 0, t);

        t = _tranches();
        t[1].bps = 3999; // sum 9999
        vm.expectRevert(abi.encodeWithSelector(AllocationSale.BpsSumInvalid.selector, 9999));
        saleContract.createSale(address(token), 0, PRICE, ALLOCATION, 0, end, 0, t);

        t = _tranches();
        t[1].milestoneIndex = 5;
        vm.expectRevert(
            abi.encodeWithSelector(AllocationSale.MilestoneIndexTooHigh.selector, uint8(5))
        );
        saleContract.createSale(address(token), 0, PRICE, ALLOCATION, 0, end, 0, t);

        t = _tranches();
        t[1].milestoneIndex = 0;
        vm.expectRevert(AllocationSale.MilestoneIndicesNotIncreasing.selector);
        saleContract.createSale(address(token), 0, PRICE, ALLOCATION, 0, end, 0, t);
        vm.stopPrank();
    }

    function test_RevertWhen_FeeOnTransferToken() public {
        FeeOnTransferToken feeToken = new FeeOnTransferToken();
        feeToken.mint(creator, 1_000e18);

        vm.startPrank(creator);
        feeToken.approve(address(saleContract), 100e18);
        vm.expectRevert(
            abi.encodeWithSelector(
                AllocationSale.UnexpectedTransferAmount.selector, 99e18, 100e18
            )
        );
        saleContract.createSale(
            address(feeToken), 0, PRICE, 100e18, 0, uint64(block.timestamp) + WINDOW, 0, _tranches()
        );
        vm.stopPrank();
    }

    // -------------------------------------------------------------------- buy

    function test_Buy_ExactPaymentDeliversInstantly() public {
        uint256 id = _createSale(0);
        uint256 cost = 1 ether; // 10,000 tokens at 0.0001 ETH

        vm.expectEmit(true, true, true, true, address(saleContract));
        emit TokensPurchased(id, buyer, 10_000e18, cost);

        vm.prank(buyer);
        saleContract.buy{value: cost}(id);

        assertEq(token.balanceOf(buyer), 10_000e18);
        assertEq(saleContract.purchasedBy(id, buyer), 10_000e18);
        AllocationSale.Sale memory s = saleContract.sale(id);
        assertEq(s.sold, 10_000e18);
        assertEq(s.raised, cost);
        assertEq(address(saleContract).balance, cost);
    }

    function test_RevertWhen_PaymentInexactOrZero() public {
        // Price with a remainder: 0.0003 ETH per token.
        vm.startPrank(creator);
        token.approve(address(saleContract), ALLOCATION);
        uint256 id = saleContract.createSale(
            address(token), 0, 3e14, ALLOCATION, 0, uint64(block.timestamp) + WINDOW, 0, _tranches()
        );
        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert(AllocationSale.ZeroPurchase.selector);
        saleContract.buy{value: 0}(id);

        // 1e14 wei buys 333333333333333333 units costing 99999999999999 wei — dust.
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                AllocationSale.InexactPayment.selector, 1e14, 99999999999999
            )
        );
        saleContract.buy{value: 1e14}(id);
    }

    function test_Buy_WindowBoundaries() public {
        // Future start.
        uint64 start = uint64(block.timestamp) + 1 days;
        uint64 end = uint64(block.timestamp) + WINDOW;
        vm.startPrank(creator);
        token.approve(address(saleContract), ALLOCATION);
        uint256 id = saleContract.createSale(
            address(token), 0, PRICE, ALLOCATION, start, end, 0, _tranches()
        );
        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(AllocationSale.SaleNotStarted.selector, start));
        saleContract.buy{value: 1 ether}(id);

        vm.warp(start); // exactly at start: allowed
        vm.prank(buyer);
        saleContract.buy{value: 1 ether}(id);

        vm.warp(end); // exactly at end: over
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(AllocationSale.SaleOver.selector, end));
        saleContract.buy{value: 1 ether}(id);
    }

    function test_RevertWhen_AllocationExceeded() public {
        uint256 id = _createSale(0);
        uint256 fullCost = (uint256(ALLOCATION) * PRICE) / 1e18; // 50 ETH

        vm.prank(buyer);
        saleContract.buy{value: fullCost}(id);
        assertEq(saleContract.sale(id).sold, ALLOCATION);

        vm.prank(buyer2);
        vm.expectRevert(abi.encodeWithSelector(AllocationSale.AllocationExceeded.selector, 0));
        saleContract.buy{value: PRICE}(id);
    }

    function test_PerWalletCap_AccumulatesAcrossBuys() public {
        uint256 id = _createSale(100e18);

        vm.prank(buyer);
        saleContract.buy{value: (60e18 * PRICE) / 1e18}(id); // 60 tokens
        vm.prank(buyer);
        saleContract.buy{value: (40e18 * PRICE) / 1e18}(id); // 40 more — at cap

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(AllocationSale.WalletCapExceeded.selector, uint128(100e18))
        );
        saleContract.buy{value: PRICE}(id); // 1 token over

        // Cap is per wallet — a different buyer can still buy.
        vm.prank(buyer2);
        saleContract.buy{value: (100e18 * PRICE) / 1e18}(id);
        assertEq(token.balanceOf(buyer2), 100e18);
    }

    // ----------------------------------------------------------------- claims

    function test_RevertWhen_ClaimBeforeEndOrUnlock() public {
        uint256 id = _createSale(0);
        uint64 end = saleContract.sale(id).endTime;

        vm.expectRevert(abi.encodeWithSelector(AllocationSale.SaleNotEnded.selector, end));
        saleContract.claimProceeds(id, 0);

        vm.warp(end); // sale over; tranche 1 unlocks 30d later
        AllocationSale.ProceedsTranche[] memory t = saleContract.proceedsTranches(id);
        vm.expectRevert(
            abi.encodeWithSelector(AllocationSale.TrancheStillLocked.selector, t[1].unlockTime)
        );
        saleContract.claimProceeds(id, 1);
    }

    function test_ClaimProceeds_BpsSplitAndRemainder() public {
        uint256 id = _createSale(0);
        vm.prank(buyer);
        saleContract.buy{value: 3 ether}(id);
        uint256 raised = 3 ether;

        vm.warp(uint256(saleContract.sale(id).endTime) + 31 days);

        uint256 first = (raised * 6000) / 10_000;
        uint256 balBefore = creator.balance;

        vm.expectEmit(true, true, true, true, address(saleContract));
        emit ProceedsClaimed(id, 0, creator, first);
        vm.prank(stranger); // permissionless; pays the creator
        saleContract.claimProceeds(id, 0);
        assertEq(creator.balance, balBefore + first);

        vm.expectRevert(AllocationSale.AlreadyClaimed.selector);
        saleContract.claimProceeds(id, 0);

        // Last tranche gets the exact remainder.
        vm.prank(stranger);
        saleContract.claimProceeds(id, 1);
        assertEq(creator.balance, balBefore + raised);
        assertEq(address(saleContract).balance, 0);
        assertEq(saleContract.sale(id).remainingProceeds, 0);
    }

    function test_ClaimProceeds_ZeroRaisedIsFine() public {
        uint256 id = _createSale(0);
        vm.warp(uint256(saleContract.sale(id).endTime) + 31 days);
        saleContract.claimProceeds(id, 0);
        saleContract.claimProceeds(id, 1);
        assertEq(creator.balance, 0);
    }

    // ---------------------------------------------------------------- reclaim

    function test_ReclaimUnsold_OncePermissionless() public {
        uint256 id = _createSale(0);
        vm.prank(buyer);
        saleContract.buy{value: 1 ether}(id); // 10k of 500k sold
        uint64 end = saleContract.sale(id).endTime;

        vm.expectRevert(abi.encodeWithSelector(AllocationSale.SaleNotEnded.selector, end));
        saleContract.reclaimUnsold(id);

        vm.warp(end);
        uint256 unsold = uint256(ALLOCATION) - 10_000e18;

        vm.expectEmit(true, true, true, true, address(saleContract));
        emit UnsoldReclaimed(id, creator, unsold);
        vm.prank(stranger);
        saleContract.reclaimUnsold(id);
        assertEq(token.balanceOf(creator), SUPPLY - ALLOCATION + unsold);

        vm.expectRevert(AllocationSale.AlreadyReclaimed.selector);
        saleContract.reclaimUnsold(id);
    }

    function test_RevertWhen_UnknownSaleOrTranche() public {
        vm.expectRevert(AllocationSale.UnknownSale.selector);
        saleContract.buy{value: 1 ether}(42);

        uint256 id = _createSale(0);
        vm.warp(uint256(saleContract.sale(id).endTime));
        vm.expectRevert(AllocationSale.UnknownTranche.selector);
        saleContract.claimProceeds(id, 2);
    }

    // ------------------------------------------------------------------- fuzz

    function testFuzz_EthAccounting_ClaimsSumToRaised(uint96 a, uint96 b, uint96 c) public {
        uint256 id = _createSale(0);

        // Whole-token purchases keep payments exact at PRICE = 1e14.
        uint256 buyA = (bound(uint256(a), 1, 100_000) * 1e18 * PRICE) / 1e18;
        uint256 buyB = (bound(uint256(b), 1, 100_000) * 1e18 * PRICE) / 1e18;
        uint256 buyC = (bound(uint256(c), 1, 100_000) * 1e18 * PRICE) / 1e18;

        vm.prank(buyer);
        saleContract.buy{value: buyA}(id);
        vm.prank(buyer2);
        saleContract.buy{value: buyB}(id);
        vm.prank(buyer);
        saleContract.buy{value: buyC}(id);

        uint256 raised = buyA + buyB + buyC;
        assertEq(saleContract.sale(id).raised, raised);

        vm.warp(uint256(saleContract.sale(id).endTime) + 31 days);
        uint256 balBefore = creator.balance;
        saleContract.claimProceeds(id, 0);
        saleContract.claimProceeds(id, 1);

        // Every wei of proceeds reaches the creator; nothing strands.
        assertEq(creator.balance - balBefore, raised);
        assertEq(address(saleContract).balance, 0);
    }
}
