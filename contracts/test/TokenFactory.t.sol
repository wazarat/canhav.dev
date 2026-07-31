// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {LaunchToken} from "../src/LaunchToken.sol";
import {TokenFactory} from "../src/TokenFactory.sol";

contract TokenFactoryTest is Test {
    LaunchToken internal implementation;
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
        bytes32 journeyHash,
        bytes32 salt,
        uint64 version
    );

    event ImplementationSet(uint64 indexed version, address indexed implementation);

    function setUp() public {
        implementation = new LaunchToken();
        factory = new TokenFactory(address(implementation));
    }

    function _params() internal pure returns (TokenFactory.LaunchParams memory) {
        return TokenFactory.LaunchParams({
            name: "Test Token",
            symbol: "TEST",
            totalSupply: 1_000_000e18,
            imageURI: "ipfs://example",
            xHandle: "testtoken",
            website: "https://example.com",
            descriptionHash: keccak256("A short description of the token"),
            journeyHash: keccak256("journey document v1")
        });
    }

    // ---------------------------------------------------------------- launches

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

        assertTrue(p.journeyHash != p.descriptionHash);

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
            p.journeyHash,
            scopedSalt,
            1
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

        // CREATE2 collision at the same address (same version, same init code).
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

    // ------------------------------------------------------------ constructor

    function test_ConstructorSetsVersionOneAndOwner() public view {
        assertEq(factory.currentVersion(), 1);
        assertEq(factory.implementations(1), address(implementation));
        assertEq(factory.implementation(), address(implementation));
        assertEq(factory.owner(), address(this));
    }

    function test_RevertWhen_ConstructorImplementationZeroOrEOA() public {
        vm.expectRevert(TokenFactory.ZeroImplementation.selector);
        new TokenFactory(address(0));

        vm.expectRevert(TokenFactory.NotAContract.selector);
        new TokenFactory(makeAddr("eoa"));
    }

    // ------------------------------------------------------------------ pause

    function test_Pause_BlocksLaunch_UnpauseRestores() public {
        factory.pause();
        assertTrue(factory.paused());

        // Prediction is a view — not gated by pause.
        factory.predictTokenAddress(alice, bytes32(uint256(6)));

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        factory.launchToken(_params(), bytes32(uint256(6)));

        factory.unpause();

        vm.prank(alice);
        address token = factory.launchToken(_params(), bytes32(uint256(6)));
        assertTrue(token != address(0));
    }

    function test_RevertWhen_PauseUnpauseByNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.pause();

        factory.pause();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.unpause();
    }

    // -------------------------------------------------------------- ownership

    function test_OwnershipTransferIsTwoStep() public {
        factory.transferOwnership(bob);
        assertEq(factory.owner(), address(this));
        assertEq(factory.pendingOwner(), bob);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.acceptOwnership();

        vm.prank(bob);
        factory.acceptOwnership();
        assertEq(factory.owner(), bob);

        // Old owner has lost the admin surface.
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(this))
        );
        factory.pause();
    }

    // ------------------------------------------------------- version registry

    function test_SetImplementation_BumpsVersionAndEmits() public {
        LaunchTokenV2 v2 = new LaunchTokenV2();

        vm.expectEmit(true, true, true, true, address(factory));
        emit ImplementationSet(2, address(v2));
        factory.setImplementation(address(v2));

        assertEq(factory.currentVersion(), 2);
        assertEq(factory.implementations(1), address(implementation));
        assertEq(factory.implementations(2), address(v2));
        assertEq(factory.implementation(), address(v2));
    }

    function test_RevertWhen_SetImplementationByNonOwner() public {
        LaunchTokenV2 v2 = new LaunchTokenV2();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.setImplementation(address(v2));
    }

    function test_RevertWhen_SetImplementationZeroOrEOA() public {
        vm.expectRevert(TokenFactory.ZeroImplementation.selector);
        factory.setImplementation(address(0));

        vm.expectRevert(TokenFactory.NotAContract.selector);
        factory.setImplementation(makeAddr("eoa2"));
    }

    function test_VersionBump_ChangesPredictedAddress() public {
        bytes32 userSalt = bytes32(uint256(7));
        address predictedV1 = factory.predictTokenAddress(alice, userSalt);

        factory.setImplementation(address(new LaunchTokenV2()));
        address predictedV2 = factory.predictTokenAddress(alice, userSalt);
        assertTrue(predictedV1 != predictedV2);

        TokenFactory.LaunchParams memory p = _params();
        bytes32 scopedSalt = keccak256(abi.encode(alice, userSalt));

        vm.expectEmit(true, true, true, true, address(factory));
        emit TokenLaunched(
            predictedV2,
            alice,
            p.name,
            p.symbol,
            p.totalSupply,
            p.imageURI,
            p.xHandle,
            p.website,
            p.descriptionHash,
            p.journeyHash,
            scopedSalt,
            2
        );

        vm.prank(alice);
        address token = factory.launchToken(p, userSalt);
        assertEq(token, predictedV2);
    }

    function test_OldClonesSurviveVersionBump() public {
        vm.prank(alice);
        address tokenA = factory.launchToken(_params(), bytes32(uint256(8)));

        factory.setImplementation(address(new LaunchTokenV2()));

        // v1 clone still works and still delegates to v1 (no isV2 selector).
        vm.prank(alice);
        LaunchToken(tokenA).transfer(bob, 1e18);
        assertEq(LaunchToken(tokenA).balanceOf(bob), 1e18);
        assertEq(LaunchToken(tokenA).name(), "Test Token");
        vm.expectRevert();
        LaunchTokenV2(tokenA).isV2();

        vm.prank(alice);
        address tokenB = factory.launchToken(_params(), bytes32(uint256(9)));
        assertTrue(LaunchTokenV2(tokenB).isV2());
    }

    function test_VersionBump_AllowsSaltReuse() public {
        bytes32 userSalt = bytes32(uint256(10));

        vm.prank(alice);
        address tokenV1 = factory.launchToken(_params(), userSalt);

        factory.setImplementation(address(new LaunchTokenV2()));

        // Different init code (new impl address) → different CREATE2 address,
        // so the same userSalt deploys cleanly.
        vm.prank(alice);
        address tokenV2 = factory.launchToken(_params(), userSalt);
        assertTrue(tokenV1 != tokenV2);
    }
}

/// @dev Template iteration stand-in: inherits LaunchToken's locked constructor
///      and external initialize, adds a marker selector v1 clones lack.
contract LaunchTokenV2 is LaunchToken {
    function isV2() external pure returns (bool) {
        return true;
    }
}
