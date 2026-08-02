// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {FeeSplitter} from "../src/FeeSplitter.sol";
import {LaunchToken} from "../src/LaunchToken.sol";

contract FeeSplitterTest is Test {
    FeeSplitter internal splitter;
    LaunchToken internal token;

    address internal owner = makeAddr("owner");
    address internal payeeA = makeAddr("payeeA");
    address internal payeeB = makeAddr("payeeB");
    address internal stranger = makeAddr("stranger");

    event PayeesSet(address[] payees, uint16[] sharesBps);
    event Distributed(address indexed asset, address indexed payee, uint256 amount);

    function setUp() public {
        splitter = new FeeSplitter(owner, _addrs(payeeA), _shares(10_000));

        LaunchToken impl = new LaunchToken();
        token = LaunchToken(Clones.clone(address(impl)));
        token.initialize("Fee Token", "FEE", 1_000_000e18, address(this));
    }

    function _addrs(address a) internal pure returns (address[] memory arr) {
        arr = new address[](1);
        arr[0] = a;
    }

    function _shares(uint16 a) internal pure returns (uint16[] memory arr) {
        arr = new uint16[](1);
        arr[0] = a;
    }

    function _two(address a, address b, uint16 sa, uint16 sb)
        internal
        pure
        returns (address[] memory addrs, uint16[] memory shares)
    {
        addrs = new address[](2);
        addrs[0] = a;
        addrs[1] = b;
        shares = new uint16[](2);
        shares[0] = sa;
        shares[1] = sb;
    }

    function test_ConstructorSetsPayeesAndOwner() public view {
        (address[] memory p, uint16[] memory s) = splitter.payees();
        assertEq(p.length, 1);
        assertEq(p[0], payeeA);
        assertEq(s[0], 10_000);
        assertEq(splitter.owner(), owner);
    }

    function test_RevertWhen_PayeeConfigInvalid() public {
        vm.expectRevert(FeeSplitter.NoPayees.selector);
        new FeeSplitter(owner, new address[](0), new uint16[](0));

        (address[] memory addrs,) = _two(payeeA, payeeB, 5000, 5000);
        vm.expectRevert(FeeSplitter.LengthMismatch.selector);
        new FeeSplitter(owner, addrs, _shares(10_000));

        (address[] memory zeroAddrs, uint16[] memory zeroShares) =
            _two(payeeA, address(0), 5000, 5000);
        vm.expectRevert(FeeSplitter.ZeroPayee.selector);
        new FeeSplitter(owner, zeroAddrs, zeroShares);

        (address[] memory badAddrs, uint16[] memory badShares) = _two(payeeA, payeeB, 5000, 4000);
        vm.expectRevert(abi.encodeWithSelector(FeeSplitter.BpsSumInvalid.selector, 9000));
        new FeeSplitter(owner, badAddrs, badShares);
    }

    function test_SetPayees_OnlyOwner() public {
        (address[] memory addrs, uint16[] memory shares) = _two(payeeA, payeeB, 7000, 3000);

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger)
        );
        splitter.setPayees(addrs, shares);

        vm.expectEmit(true, true, true, true, address(splitter));
        emit PayeesSet(addrs, shares);
        vm.prank(owner);
        splitter.setPayees(addrs, shares);

        (address[] memory p,) = splitter.payees();
        assertEq(p.length, 2);
    }

    function test_DistributeEth_SplitsWithRemainderToLast() public {
        (address[] memory addrs, uint16[] memory shares) = _two(payeeA, payeeB, 7000, 3000);
        vm.prank(owner);
        splitter.setPayees(addrs, shares);

        // 1000000000000000001 wei: 70% floors, payeeB takes the remainder.
        uint256 amount = 1 ether + 1;
        vm.deal(address(this), 2 ether);
        (bool ok,) = address(splitter).call{value: amount}("");
        assertTrue(ok);

        uint256 expectedA = (amount * 7000) / 10_000;
        uint256 expectedB = amount - expectedA;

        vm.expectEmit(true, true, true, true, address(splitter));
        emit Distributed(address(0), payeeA, expectedA);
        vm.expectEmit(true, true, true, true, address(splitter));
        emit Distributed(address(0), payeeB, expectedB);

        vm.prank(stranger); // permissionless
        splitter.distributeEth();

        assertEq(payeeA.balance, expectedA);
        assertEq(payeeB.balance, expectedB);
        assertEq(address(splitter).balance, 0);
    }

    function test_DistributeToken_SplitsAndEmpties() public {
        (address[] memory addrs, uint16[] memory shares) = _two(payeeA, payeeB, 6000, 4000);
        vm.prank(owner);
        splitter.setPayees(addrs, shares);

        uint256 amount = 999e18 + 1;
        token.transfer(address(splitter), amount);
        uint256 expectedA = (amount * 6000) / 10_000;

        splitter.distributeToken(address(token));
        assertEq(token.balanceOf(payeeA), expectedA);
        assertEq(token.balanceOf(payeeB), amount - expectedA);
        assertEq(token.balanceOf(address(splitter)), 0);
    }

    function test_RevertWhen_NothingToDistribute() public {
        vm.expectRevert(FeeSplitter.NothingToDistribute.selector);
        splitter.distributeEth();

        vm.expectRevert(FeeSplitter.NothingToDistribute.selector);
        splitter.distributeToken(address(token));
    }
}
