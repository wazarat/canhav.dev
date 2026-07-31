// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {LaunchToken} from "../src/LaunchToken.sol";

contract LaunchTokenTest is Test {
    LaunchToken internal implementation;
    LaunchToken internal token;

    address internal creator = makeAddr("creator");
    address internal other = makeAddr("other");

    uint256 internal constant SUPPLY = 1_000_000e18;

    function setUp() public {
        implementation = new LaunchToken();
        token = LaunchToken(Clones.clone(address(implementation)));
        token.initialize("Test Token", "TEST", SUPPLY, creator);
    }

    function test_InitializeSetsMetadataAndSupply() public view {
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.balanceOf(creator), SUPPLY);
    }

    function test_RevertWhen_InitializedTwice() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        token.initialize("Again", "AGAIN", 1, creator);
    }

    function test_RevertWhen_ImplementationInitializedDirectly() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        implementation.initialize("Direct", "DIRECT", 1, creator);
    }

    function test_TransferApproveTransferFrom() public {
        vm.prank(creator);
        token.transfer(other, 100e18);
        assertEq(token.balanceOf(other), 100e18);
        assertEq(token.balanceOf(creator), SUPPLY - 100e18);

        vm.prank(other);
        token.approve(creator, 40e18);
        assertEq(token.allowance(other, creator), 40e18);

        vm.prank(creator);
        token.transferFrom(other, creator, 40e18);
        assertEq(token.balanceOf(other), 60e18);
        assertEq(token.allowance(other, creator), 0);
    }
}
