// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {JourneyUpdates} from "../src/JourneyUpdates.sol";

contract JourneyUpdatesTest is Test {
    JourneyUpdates internal updates;

    address internal author = makeAddr("author");
    address internal token = makeAddr("token");

    event MilestoneUpdate(
        address indexed token,
        address indexed author,
        uint8 milestoneIndex,
        bytes32 updateHash
    );

    function setUp() public {
        updates = new JourneyUpdates();
    }

    function test_PostUpdate_EmitsWithSenderAsAuthor() public {
        bytes32 h = keccak256("first update");
        vm.expectEmit(true, true, true, true, address(updates));
        emit MilestoneUpdate(token, author, 3, h);
        vm.prank(author);
        updates.postUpdate(token, 3, h);
    }

    function test_RevertWhen_ZeroTokenOrHash() public {
        vm.expectRevert(JourneyUpdates.ZeroToken.selector);
        updates.postUpdate(address(0), 0, keccak256("x"));

        vm.expectRevert(JourneyUpdates.ZeroUpdateHash.selector);
        updates.postUpdate(token, 0, bytes32(0));
    }

    function test_RevertWhen_MilestoneIndexTooHigh() public {
        vm.expectRevert(
            abi.encodeWithSelector(JourneyUpdates.MilestoneIndexTooHigh.selector, uint8(5))
        );
        updates.postUpdate(token, 5, keccak256("x"));
    }

    function testFuzz_PostUpdate_AnyAuthorAnyIndex(address anyAuthor, uint8 index, bytes32 h)
        public
    {
        vm.assume(anyAuthor != address(0));
        vm.assume(h != bytes32(0));
        index = uint8(bound(index, 0, 4));

        vm.expectEmit(true, true, true, true, address(updates));
        emit MilestoneUpdate(token, anyAuthor, index, h);
        vm.prank(anyAuthor);
        updates.postUpdate(token, index, h);
    }
}
