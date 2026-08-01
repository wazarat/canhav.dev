// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {VestingWalletCliffUpgradeable} from
    "@openzeppelin/contracts-upgradeable/finance/VestingWalletCliffUpgradeable.sol";

import {LaunchToken} from "../src/LaunchToken.sol";
import {LaunchVestingWallet} from "../src/LaunchVestingWallet.sol";

contract LaunchVestingWalletTest is Test {
    LaunchVestingWallet internal implementation;
    LaunchVestingWallet internal wallet;
    LaunchToken internal token;

    address internal beneficiary = makeAddr("beneficiary");
    address internal stranger = makeAddr("stranger");

    uint64 internal start;
    uint64 internal constant DURATION = 360 days;
    uint64 internal constant CLIFF = 90 days;
    uint256 internal constant ALLOCATION = 100_000e18;

    event ERC20Released(address indexed token, uint256 amount);

    function setUp() public {
        start = uint64(block.timestamp) + 10 days;
        implementation = new LaunchVestingWallet();

        wallet = LaunchVestingWallet(payable(Clones.clone(address(implementation))));
        wallet.initialize(beneficiary, start, DURATION, CLIFF);

        // Fund with a LaunchToken clone holding the vested allocation.
        LaunchToken tokenImpl = new LaunchToken();
        token = LaunchToken(Clones.clone(address(tokenImpl)));
        token.initialize("Vested Token", "VEST", ALLOCATION, address(wallet));
    }

    function _fresh() internal returns (LaunchVestingWallet) {
        return LaunchVestingWallet(payable(Clones.clone(address(implementation))));
    }

    function test_ImplementationLocked_BothInitializersRevert() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        implementation.initialize(beneficiary, start, DURATION, CLIFF);

        vm.expectRevert(LaunchVestingWallet.DirectInitializeDisabled.selector);
        implementation.initialize(beneficiary, start, DURATION);
    }

    function test_InitializeSetsScheduleOwnerAndCliff() public view {
        assertEq(wallet.owner(), beneficiary);
        assertEq(wallet.start(), start);
        assertEq(wallet.duration(), DURATION);
        assertEq(wallet.end(), uint256(start) + DURATION);
        assertEq(wallet.cliff(), uint256(start) + CLIFF);
    }

    function test_RevertWhen_ThreeArgInitializeCalled() public {
        LaunchVestingWallet fresh = _fresh();
        vm.expectRevert(LaunchVestingWallet.DirectInitializeDisabled.selector);
        fresh.initialize(beneficiary, start, DURATION);
    }

    function test_RevertWhen_InitializedTwice() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        wallet.initialize(stranger, start, DURATION, CLIFF);
    }

    function test_RevertWhen_CliffExceedsDuration() public {
        LaunchVestingWallet fresh = _fresh();
        vm.expectRevert(
            abi.encodeWithSelector(
                VestingWalletCliffUpgradeable.InvalidCliffDuration.selector,
                DURATION + 1,
                DURATION
            )
        );
        fresh.initialize(beneficiary, start, DURATION, DURATION + 1);
    }

    function test_ReleasableZeroBeforeCliff() public {
        vm.warp(uint256(start) + CLIFF - 1);
        assertEq(wallet.releasable(address(token)), 0);
        assertEq(wallet.vestedAmount(address(token), uint64(block.timestamp)), 0);
    }

    function test_ReleasableLinearBetweenCliffAndEnd() public {
        uint64 elapsed = CLIFF + 30 days;
        vm.warp(uint256(start) + elapsed);
        uint256 expected = (ALLOCATION * elapsed) / DURATION;
        assertEq(wallet.releasable(address(token)), expected);
    }

    function test_ReleasableFullAtEnd() public {
        vm.warp(uint256(start) + DURATION);
        assertEq(wallet.releasable(address(token)), ALLOCATION);
    }

    function test_CliffZero_PlainLinearFromStart() public {
        LaunchVestingWallet noCliff = _fresh();
        noCliff.initialize(beneficiary, start, DURATION, 0);

        LaunchToken tokenImpl = new LaunchToken();
        LaunchToken t2 = LaunchToken(Clones.clone(address(tokenImpl)));
        t2.initialize("NoCliff", "NC", ALLOCATION, address(noCliff));

        vm.warp(uint256(start) + 36 days);
        assertEq(noCliff.releasable(address(t2)), (ALLOCATION * 36 days) / DURATION);
    }

    function test_Release_TransfersAndEmitsERC20Released() public {
        uint64 elapsed = CLIFF + 60 days;
        vm.warp(uint256(start) + elapsed);
        uint256 expected = (ALLOCATION * elapsed) / DURATION;

        vm.expectEmit(true, true, true, true, address(wallet));
        emit ERC20Released(address(token), expected);
        wallet.release(address(token));

        assertEq(token.balanceOf(beneficiary), expected);
        assertEq(wallet.released(address(token)), expected);
        assertEq(wallet.releasable(address(token)), 0);
    }

    function test_Release_PermissionlessCallerFundsGoToOwner() public {
        vm.warp(uint256(start) + DURATION);
        vm.prank(stranger);
        wallet.release(address(token));
        assertEq(token.balanceOf(beneficiary), ALLOCATION);
        assertEq(token.balanceOf(stranger), 0);
    }

    function test_OwnershipTransfer_RedirectsFutureReleases() public {
        address buyer = makeAddr("buyer");
        vm.prank(beneficiary);
        wallet.transferOwnership(buyer);

        vm.warp(uint256(start) + DURATION);
        wallet.release(address(token));
        // Documents the OZ property: the beneficiary is the owner, and
        // ownership (i.e. unvested tokens) is transferable.
        assertEq(token.balanceOf(buyer), ALLOCATION);
        assertEq(token.balanceOf(beneficiary), 0);
    }

    function testFuzz_VestedAmountMonotonicAndBounded(uint64 t1, uint64 t2) public view {
        t1 = uint64(bound(t1, 0, uint256(start) + DURATION + 365 days));
        t2 = uint64(bound(t2, t1, uint256(start) + DURATION + 365 days));

        uint256 v1 = wallet.vestedAmount(address(token), t1);
        uint256 v2 = wallet.vestedAmount(address(token), t2);
        assertLe(v1, v2);
        assertLe(v2, ALLOCATION);
    }
}
