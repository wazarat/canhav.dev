// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {LaunchToken} from "../src/LaunchToken.sol";
import {TokenFactory} from "../src/TokenFactory.sol";

contract TokenFactoryTest is Test {
    TokenFactory internal factory;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

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
        bytes32 salt
    );

    function setUp() public {
        factory = new TokenFactory();
    }

    function _params() internal pure returns (TokenFactory.LaunchParams memory) {
        return TokenFactory.LaunchParams({
            name: "Test Token",
            symbol: "TEST",
            totalSupply: 1_000_000e18,
            imageURI: "ipfs://example",
            xHandle: "testtoken",
            website: "https://example.com",
            descriptionHash: keccak256("A short description of the token")
        });
    }

    function test_PredictedAddressMatchesDeployed() public {
        bytes32 userSalt = bytes32(uint256(1));
        address predicted = factory.predictTokenAddress(alice, userSalt);

        vm.prank(alice);
        address deployed = factory.launchToken(_params(), userSalt);

        assertEq(deployed, predicted);
    }

    function test_EmitsFullMetadataEvent() public {
        bytes32 userSalt = bytes32(uint256(2));
        TokenFactory.LaunchParams memory p = _params();
        address predicted = factory.predictTokenAddress(alice, userSalt);
        bytes32 scopedSalt = keccak256(abi.encode(alice, userSalt));

        vm.expectEmit(true, true, true, true, address(factory));
        emit TokenLaunched(
            predicted,
            alice,
            p.name,
            p.symbol,
            p.totalSupply,
            p.imageURI,
            p.xHandle,
            p.website,
            p.descriptionHash,
            scopedSalt
        );

        vm.prank(alice);
        factory.launchToken(p, userSalt);
    }

    function test_CreatorReceivesFullSupply() public {
        vm.prank(alice);
        address token = factory.launchToken(_params(), bytes32(uint256(3)));

        assertEq(LaunchToken(token).balanceOf(alice), _params().totalSupply);
        assertEq(LaunchToken(token).totalSupply(), _params().totalSupply);
        assertEq(LaunchToken(token).name(), "Test Token");
        assertEq(LaunchToken(token).symbol(), "TEST");
    }

    function test_RevertWhen_SameSenderReusesSalt() public {
        bytes32 userSalt = bytes32(uint256(4));
        vm.prank(alice);
        factory.launchToken(_params(), userSalt);

        // CREATE2 collision at the same address.
        vm.prank(alice);
        vm.expectRevert();
        factory.launchToken(_params(), userSalt);
    }

    function test_SameSaltDifferentSendersYieldsDifferentAddresses() public {
        bytes32 userSalt = bytes32(uint256(5));

        vm.prank(alice);
        address tokenA = factory.launchToken(_params(), userSalt);

        vm.prank(bob);
        address tokenB = factory.launchToken(_params(), userSalt);

        assertTrue(tokenA != tokenB);
    }

    function test_RevertWhen_ParamsInvalid() public {
        TokenFactory.LaunchParams memory p = _params();

        p.name = "";
        vm.expectRevert(TokenFactory.EmptyName.selector);
        factory.launchToken(p, bytes32(0));

        p = _params();
        p.symbol = "";
        vm.expectRevert(TokenFactory.EmptySymbol.selector);
        factory.launchToken(p, bytes32(0));

        p = _params();
        p.totalSupply = 0;
        vm.expectRevert(TokenFactory.ZeroSupply.selector);
        factory.launchToken(p, bytes32(0));
    }

    function testFuzz_LaunchWithArbitrarySaltAndSupply(bytes32 userSalt, uint256 supply) public {
        supply = bound(supply, 1, type(uint208).max);

        TokenFactory.LaunchParams memory p = _params();
        p.totalSupply = supply;

        address predicted = factory.predictTokenAddress(alice, userSalt);

        vm.prank(alice);
        address token = factory.launchToken(p, userSalt);

        assertEq(token, predicted);
        assertEq(LaunchToken(token).balanceOf(alice), supply);
    }
}
