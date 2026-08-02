// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {LaunchToken} from "../src/LaunchToken.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

contract MilestoneEscrowTest is Test {
    MilestoneEscrow internal escrow;
    LaunchToken internal tokenImpl;
    LaunchToken internal token;

    address internal creator = makeAddr("creator");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant SUPPLY = 1_000_000e18;

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

    function setUp() public {
        escrow = new MilestoneEscrow();
        tokenImpl = new LaunchToken();
        token = LaunchToken(Clones.clone(address(tokenImpl)));
        token.initialize("Escrowed Token", "ESC", SUPPLY, creator);
    }

    function _twoTranches() internal view returns (MilestoneEscrow.TrancheInput[] memory t) {
        t = new MilestoneEscrow.TrancheInput[](2);
        t[0] = MilestoneEscrow.TrancheInput({
            milestoneIndex: 0,
            amount: 100_000e18,
            unlockTime: uint64(block.timestamp) + 30 days
        });
        t[1] = MilestoneEscrow.TrancheInput({
            milestoneIndex: 2,
            amount: 50_000e18,
            unlockTime: uint64(block.timestamp) + 90 days
        });
    }

    function _create(MilestoneEscrow.TrancheInput[] memory t) internal returns (uint256 id) {
        uint256 total;
        for (uint256 i = 0; i < t.length; i++) total += t[i].amount;
        vm.startPrank(creator);
        token.approve(address(escrow), total);
        id = escrow.createEscrow(address(token), keccak256("journey"), t);
        vm.stopPrank();
    }

    // ----------------------------------------------------------------- create

    function test_CreateEscrow_StoresFundsAndState() public {
        MilestoneEscrow.TrancheInput[] memory t = _twoTranches();
        uint256 id = _create(t);

        assertEq(id, 0);
        assertEq(escrow.nextEscrowId(), 1);
        assertEq(token.balanceOf(address(escrow)), 150_000e18);
        assertEq(token.balanceOf(creator), SUPPLY - 150_000e18);

        (address tok, address cr, bytes32 jh) = escrow.escrows(id);
        assertEq(tok, address(token));
        assertEq(cr, creator);
        assertEq(jh, keccak256("journey"));

        assertEq(escrow.trancheCount(id), 2);
        MilestoneEscrow.Tranche memory tr0 = escrow.tranche(id, 0);
        assertEq(tr0.milestoneIndex, 0);
        assertEq(tr0.amount, 100_000e18);
        assertEq(tr0.unlockTime, uint64(block.timestamp) + 30 days);
        assertFalse(tr0.claimed);
        assertEq(escrow.tranches(id).length, 2);
    }

    function test_CreateEscrow_EmitsAllEvents() public {
        MilestoneEscrow.TrancheInput[] memory t = _twoTranches();
        vm.startPrank(creator);
        token.approve(address(escrow), 150_000e18);

        vm.expectEmit(true, true, true, true, address(escrow));
        emit EscrowCreated(0, address(token), creator, keccak256("journey"));
        vm.expectEmit(true, true, true, true, address(escrow));
        emit TrancheAdded(0, 0, 0, 100_000e18, t[0].unlockTime);
        vm.expectEmit(true, true, true, true, address(escrow));
        emit TrancheAdded(0, 1, 2, 50_000e18, t[1].unlockTime);

        escrow.createEscrow(address(token), keccak256("journey"), t);
        vm.stopPrank();
    }

    function test_MultipleEscrowsPerToken() public {
        _create(_twoTranches());
        uint256 second = _create(_twoTranches());
        assertEq(second, 1);
        assertEq(token.balanceOf(address(escrow)), 300_000e18);
    }

    function test_RevertWhen_NoTranches() public {
        MilestoneEscrow.TrancheInput[] memory t = new MilestoneEscrow.TrancheInput[](0);
        vm.prank(creator);
        vm.expectRevert(MilestoneEscrow.NoTranches.selector);
        escrow.createEscrow(address(token), keccak256("journey"), t);
    }

    function test_RevertWhen_TooManyTranches() public {
        MilestoneEscrow.TrancheInput[] memory t = new MilestoneEscrow.TrancheInput[](6);
        for (uint256 i = 0; i < 6; i++) {
            t[i] = MilestoneEscrow.TrancheInput(uint8(i), 1e18, uint64(block.timestamp));
        }
        vm.prank(creator);
        vm.expectRevert(MilestoneEscrow.TooManyTranches.selector);
        escrow.createEscrow(address(token), keccak256("journey"), t);
    }

    function test_RevertWhen_ZeroTrancheAmount() public {
        MilestoneEscrow.TrancheInput[] memory t = _twoTranches();
        t[1].amount = 0;
        vm.prank(creator);
        vm.expectRevert(MilestoneEscrow.ZeroTrancheAmount.selector);
        escrow.createEscrow(address(token), keccak256("journey"), t);
    }

    function test_RevertWhen_MilestoneIndexTooHigh() public {
        MilestoneEscrow.TrancheInput[] memory t = _twoTranches();
        t[1].milestoneIndex = 5;
        vm.prank(creator);
        vm.expectRevert(
            abi.encodeWithSelector(MilestoneEscrow.MilestoneIndexTooHigh.selector, uint8(5))
        );
        escrow.createEscrow(address(token), keccak256("journey"), t);
    }

    function test_RevertWhen_IndicesNotStrictlyIncreasing() public {
        MilestoneEscrow.TrancheInput[] memory t = _twoTranches();
        t[1].milestoneIndex = 0; // duplicate
        vm.prank(creator);
        vm.expectRevert(MilestoneEscrow.MilestoneIndicesNotIncreasing.selector);
        escrow.createEscrow(address(token), keccak256("journey"), t);

        t = _twoTranches();
        t[0].milestoneIndex = 3;
        t[1].milestoneIndex = 1; // decreasing
        vm.prank(creator);
        vm.expectRevert(MilestoneEscrow.MilestoneIndicesNotIncreasing.selector);
        escrow.createEscrow(address(token), keccak256("journey"), t);
    }

    function test_RevertWhen_AllowanceMissing() public {
        MilestoneEscrow.TrancheInput[] memory t = _twoTranches();
        vm.prank(creator); // no approve
        vm.expectRevert();
        escrow.createEscrow(address(token), keccak256("journey"), t);
    }

    function test_RevertWhen_FeeOnTransferToken() public {
        FeeOnTransferToken feeToken = new FeeOnTransferToken();
        feeToken.mint(creator, 1_000e18);

        MilestoneEscrow.TrancheInput[] memory t = new MilestoneEscrow.TrancheInput[](1);
        t[0] = MilestoneEscrow.TrancheInput(0, 100e18, uint64(block.timestamp) + 1 days);

        vm.startPrank(creator);
        feeToken.approve(address(escrow), 100e18);
        vm.expectRevert(
            abi.encodeWithSelector(
                MilestoneEscrow.UnexpectedTransferAmount.selector, 99e18, 100e18
            )
        );
        escrow.createEscrow(address(feeToken), keccak256("journey"), t);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ claim

    function test_RevertWhen_ClaimBeforeUnlock() public {
        uint256 id = _create(_twoTranches());
        uint64 unlock = escrow.tranche(id, 0).unlockTime;
        vm.expectRevert(
            abi.encodeWithSelector(MilestoneEscrow.TrancheStillLocked.selector, unlock)
        );
        escrow.claim(id, 0);
    }

    function test_Claim_AtUnlockBoundary() public {
        uint256 id = _create(_twoTranches());
        vm.warp(escrow.tranche(id, 0).unlockTime); // exactly at unlock: allowed
        escrow.claim(id, 0);
        assertTrue(escrow.tranche(id, 0).claimed);
    }

    function test_Claim_PermissionlessPaysCreatorAndEmits() public {
        uint256 id = _create(_twoTranches());
        uint256 balBefore = token.balanceOf(creator);
        vm.warp(block.timestamp + 31 days);

        vm.expectEmit(true, true, true, true, address(escrow));
        emit TrancheClaimed(id, 0, address(token), creator, 100_000e18);

        vm.prank(stranger); // anyone can trigger; funds go to the creator
        escrow.claim(id, 0);

        assertEq(token.balanceOf(creator), balBefore + 100_000e18);
        assertEq(token.balanceOf(stranger), 0);
        assertEq(token.balanceOf(address(escrow)), 50_000e18);
    }

    function test_RevertWhen_DoubleClaim() public {
        uint256 id = _create(_twoTranches());
        vm.warp(block.timestamp + 31 days);
        escrow.claim(id, 0);
        vm.expectRevert(MilestoneEscrow.AlreadyClaimed.selector);
        escrow.claim(id, 0);
    }

    function test_Claim_SecondTrancheStaysLockedIndependently() public {
        uint256 id = _create(_twoTranches());
        vm.warp(block.timestamp + 31 days);
        escrow.claim(id, 0);

        uint64 unlock1 = escrow.tranche(id, 1).unlockTime;
        vm.expectRevert(
            abi.encodeWithSelector(MilestoneEscrow.TrancheStillLocked.selector, unlock1)
        );
        escrow.claim(id, 1);

        vm.warp(uint256(unlock1));
        escrow.claim(id, 1);
        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(token.balanceOf(creator), SUPPLY);
    }

    function test_RevertWhen_UnknownEscrowOrTranche() public {
        vm.expectRevert(MilestoneEscrow.UnknownEscrow.selector);
        escrow.claim(42, 0);

        uint256 id = _create(_twoTranches());
        vm.expectRevert(MilestoneEscrow.UnknownTranche.selector);
        escrow.claim(id, 2);
    }

    // ------------------------------------------------------------------- fuzz

    function testFuzz_CreateAndClaimAll(uint128 a0, uint128 a1, uint64 dt) public {
        a0 = uint128(bound(a0, 1, 400_000e18));
        a1 = uint128(bound(a1, 1, 400_000e18));
        dt = uint64(bound(dt, 1, 3650 days));

        MilestoneEscrow.TrancheInput[] memory t = new MilestoneEscrow.TrancheInput[](2);
        t[0] = MilestoneEscrow.TrancheInput(1, a0, uint64(block.timestamp) + dt);
        t[1] = MilestoneEscrow.TrancheInput(4, a1, uint64(block.timestamp) + dt);

        uint256 id = _create(t);
        assertEq(token.balanceOf(address(escrow)), uint256(a0) + a1);

        vm.warp(uint256(uint64(block.timestamp)) + dt);
        escrow.claim(id, 0);
        escrow.claim(id, 1);

        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(token.balanceOf(creator), SUPPLY);
    }
}

/// @dev Minimal fee-on-transfer ERC20 to prove the balance-delta guard.
contract FeeOnTransferToken {
    string public name = "Fee Token";
    string public symbol = "FEE";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        uint256 fee = amount / 100; // 1% burn
        balanceOf[to] += amount - fee;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
