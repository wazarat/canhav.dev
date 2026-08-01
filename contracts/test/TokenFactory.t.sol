// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, Vm} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {LaunchToken} from "../src/LaunchToken.sol";
import {LaunchVestingWallet} from "../src/LaunchVestingWallet.sol";
import {TokenFactory} from "../src/TokenFactory.sol";

contract TokenFactoryTest is Test {
    LaunchToken internal implementation;
    LaunchVestingWallet internal vestingImplementation;
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

    event VestingCreated(
        address indexed token,
        address indexed vestingWallet,
        address indexed beneficiary,
        uint256 amount,
        uint64 startTimestamp,
        uint64 durationSeconds,
        uint64 cliffSeconds
    );

    event ImplementationSet(uint64 indexed version, address indexed implementation);

    function setUp() public {
        implementation = new LaunchToken();
        vestingImplementation = new LaunchVestingWallet();
        factory = new TokenFactory(address(implementation), address(vestingImplementation));
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

    function _noVesting() internal pure returns (TokenFactory.VestingParams memory) {
        return TokenFactory.VestingParams({
            amount: 0,
            startTimestamp: 0,
            durationSeconds: 0,
            cliffSeconds: 0
        });
    }

    function _vesting(uint256 amount) internal pure returns (TokenFactory.VestingParams memory) {
        return TokenFactory.VestingParams({
            amount: amount,
            startTimestamp: 0,
            durationSeconds: 360 days,
            cliffSeconds: 90 days
        });
    }

    // ---------------------------------------------------------------- launches

    function test_PredictedAddressMatchesDeployed() public {
        bytes32 userSalt = bytes32(uint256(1));
        address predicted = factory.predictTokenAddress(alice, userSalt);

        vm.prank(alice);
        address deployed = factory.launchToken(_params(), _noVesting(), userSalt);

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
        factory.launchToken(p, _noVesting(), userSalt);
    }

    function test_CreatorReceivesFullSupply() public {
        vm.prank(alice);
        address token = factory.launchToken(_params(), _noVesting(), bytes32(uint256(3)));

        assertEq(LaunchToken(token).balanceOf(alice), _params().totalSupply);
        assertEq(LaunchToken(token).totalSupply(), _params().totalSupply);
        assertEq(LaunchToken(token).name(), "Test Token");
        assertEq(LaunchToken(token).symbol(), "TEST");
    }

    function test_RevertWhen_SameSenderReusesSalt() public {
        bytes32 userSalt = bytes32(uint256(4));
        vm.prank(alice);
        factory.launchToken(_params(), _noVesting(), userSalt);

        // CREATE2 collision at the same address (same version, same init code).
        vm.prank(alice);
        vm.expectRevert();
        factory.launchToken(_params(), _noVesting(), userSalt);
    }

    function test_SameSaltDifferentSendersYieldsDifferentAddresses() public {
        bytes32 userSalt = bytes32(uint256(5));

        vm.prank(alice);
        address tokenA = factory.launchToken(_params(), _noVesting(), userSalt);

        vm.prank(bob);
        address tokenB = factory.launchToken(_params(), _noVesting(), userSalt);

        assertTrue(tokenA != tokenB);
    }

    function test_RevertWhen_ParamsInvalid() public {
        TokenFactory.LaunchParams memory p = _params();

        p.name = "";
        vm.expectRevert(TokenFactory.EmptyName.selector);
        factory.launchToken(p, _noVesting(), bytes32(0));

        p = _params();
        p.symbol = "";
        vm.expectRevert(TokenFactory.EmptySymbol.selector);
        factory.launchToken(p, _noVesting(), bytes32(0));

        p = _params();
        p.totalSupply = 0;
        vm.expectRevert(TokenFactory.ZeroSupply.selector);
        factory.launchToken(p, _noVesting(), bytes32(0));
    }

    function testFuzz_LaunchWithArbitrarySaltAndSupply(bytes32 userSalt, uint256 supply) public {
        supply = bound(supply, 1, type(uint208).max);

        TokenFactory.LaunchParams memory p = _params();
        p.totalSupply = supply;

        address predicted = factory.predictTokenAddress(alice, userSalt);

        vm.prank(alice);
        address token = factory.launchToken(p, _noVesting(), userSalt);

        assertEq(token, predicted);
        assertEq(LaunchToken(token).balanceOf(alice), supply);
    }

    // ------------------------------------------------------------ constructor

    function test_ConstructorSetsVersionOneAndOwner() public view {
        assertEq(factory.currentVersion(), 1);
        assertEq(factory.implementations(1), address(implementation));
        assertEq(factory.implementation(), address(implementation));
        assertEq(factory.vestingImplementation(), address(vestingImplementation));
        assertEq(factory.owner(), address(this));
    }

    function test_RevertWhen_ConstructorImplementationZeroOrEOA() public {
        vm.expectRevert(TokenFactory.ZeroImplementation.selector);
        new TokenFactory(address(0), address(vestingImplementation));

        vm.expectRevert(TokenFactory.NotAContract.selector);
        new TokenFactory(makeAddr("eoa"), address(vestingImplementation));
    }

    function test_RevertWhen_VestingImplZeroOrEOA() public {
        vm.expectRevert(TokenFactory.ZeroImplementation.selector);
        new TokenFactory(address(implementation), address(0));

        vm.expectRevert(TokenFactory.NotAContract.selector);
        new TokenFactory(address(implementation), makeAddr("eoa2"));
    }

    // ------------------------------------------------------------------ pause

    function test_Pause_BlocksLaunch_UnpauseRestores() public {
        factory.pause();
        assertTrue(factory.paused());

        // Prediction is a view — not gated by pause.
        factory.predictTokenAddress(alice, bytes32(uint256(6)));

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        factory.launchToken(_params(), _noVesting(), bytes32(uint256(6)));

        factory.unpause();

        vm.prank(alice);
        address token = factory.launchToken(_params(), _noVesting(), bytes32(uint256(6)));
        assertTrue(token != address(0));
    }

    function test_Pause_BlocksVestingLaunch() public {
        factory.pause();
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        factory.launchToken(_params(), _vesting(1000e18), bytes32(uint256(60)));
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
        factory.setImplementation(makeAddr("eoa3"));
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
        address token = factory.launchToken(p, _noVesting(), userSalt);
        assertEq(token, predictedV2);
    }

    function test_OldClonesSurviveVersionBump() public {
        vm.prank(alice);
        address tokenA = factory.launchToken(_params(), _noVesting(), bytes32(uint256(8)));

        factory.setImplementation(address(new LaunchTokenV2()));

        // v1 clone still works and still delegates to v1 (no isV2 selector).
        vm.prank(alice);
        LaunchToken(tokenA).transfer(bob, 1e18);
        assertEq(LaunchToken(tokenA).balanceOf(bob), 1e18);
        assertEq(LaunchToken(tokenA).name(), "Test Token");
        vm.expectRevert();
        LaunchTokenV2(tokenA).isV2();

        vm.prank(alice);
        address tokenB = factory.launchToken(_params(), _noVesting(), bytes32(uint256(9)));
        assertTrue(LaunchTokenV2(tokenB).isV2());
    }

    function test_VersionBump_AllowsSaltReuse() public {
        bytes32 userSalt = bytes32(uint256(10));

        vm.prank(alice);
        address tokenV1 = factory.launchToken(_params(), _noVesting(), userSalt);

        factory.setImplementation(address(new LaunchTokenV2()));

        // Different init code (new impl address) → different CREATE2 address,
        // so the same userSalt deploys cleanly.
        vm.prank(alice);
        address tokenV2 = factory.launchToken(_params(), _noVesting(), userSalt);
        assertTrue(tokenV1 != tokenV2);
    }

    // ---------------------------------------------------------------- vesting

    function test_LaunchWithoutVesting_MatchesV1Behavior() public {
        vm.recordLogs();
        vm.prank(alice);
        address token = factory.launchToken(_params(), _noVesting(), bytes32(uint256(20)));

        assertEq(LaunchToken(token).balanceOf(alice), _params().totalSupply);

        // No VestingCreated anywhere in the launch.
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 vestingTopic = VestingCreated.selector;
        for (uint256 i = 0; i < logs.length; i++) {
            assertTrue(logs[i].topics[0] != vestingTopic);
        }
    }

    function test_RevertWhen_NoVestingAmountButScheduleSet() public {
        TokenFactory.VestingParams memory v = _noVesting();

        v.startTimestamp = 1;
        vm.expectRevert(TokenFactory.VestingParamsNotEmpty.selector);
        factory.launchToken(_params(), v, bytes32(0));

        v = _noVesting();
        v.durationSeconds = 1;
        vm.expectRevert(TokenFactory.VestingParamsNotEmpty.selector);
        factory.launchToken(_params(), v, bytes32(0));

        v = _noVesting();
        v.cliffSeconds = 1;
        vm.expectRevert(TokenFactory.VestingParamsNotEmpty.selector);
        factory.launchToken(_params(), v, bytes32(0));
    }

    function test_LaunchWithVesting_SplitsBalances() public {
        uint256 amount = 200_000e18;
        vm.prank(alice);
        address token = factory.launchToken(_params(), _vesting(amount), bytes32(uint256(21)));

        address wallet = factory.predictVestingAddress(alice, bytes32(uint256(21)));
        assertEq(LaunchToken(token).balanceOf(alice), _params().totalSupply - amount);
        assertEq(LaunchToken(token).balanceOf(wallet), amount);
        assertEq(LaunchToken(token).balanceOf(address(factory)), 0);
    }

    function test_LaunchWithVesting_FullSupplyToWallet() public {
        uint256 amount = _params().totalSupply;
        vm.prank(alice);
        address token = factory.launchToken(_params(), _vesting(amount), bytes32(uint256(22)));

        address wallet = factory.predictVestingAddress(alice, bytes32(uint256(22)));
        assertEq(LaunchToken(token).balanceOf(alice), 0);
        assertEq(LaunchToken(token).balanceOf(wallet), amount);
    }

    function test_RevertWhen_VestingAmountExceedsSupply() public {
        vm.expectRevert(TokenFactory.VestingAmountExceedsSupply.selector);
        factory.launchToken(_params(), _vesting(_params().totalSupply + 1), bytes32(0));
    }

    function test_RevertWhen_VestingDurationZero() public {
        TokenFactory.VestingParams memory v = _vesting(1000e18);
        v.durationSeconds = 0;
        v.cliffSeconds = 0;
        vm.expectRevert(TokenFactory.VestingDurationZero.selector);
        factory.launchToken(_params(), v, bytes32(0));
    }

    function test_RevertWhen_VestingCliffExceedsDuration() public {
        TokenFactory.VestingParams memory v = _vesting(1000e18);
        v.cliffSeconds = v.durationSeconds + 1;
        // Bubbles from LaunchVestingWallet.initialize (OZ InvalidCliffDuration).
        vm.expectRevert();
        factory.launchToken(_params(), v, bytes32(0));
    }

    function test_VestingCreated_EmitsResolvedStart() public {
        bytes32 userSalt = bytes32(uint256(23));
        TokenFactory.VestingParams memory v = _vesting(50_000e18); // startTimestamp = 0
        address predictedToken = factory.predictTokenAddress(alice, userSalt);
        address predictedWallet = factory.predictVestingAddress(alice, userSalt);

        vm.expectEmit(true, true, true, true, address(factory));
        emit VestingCreated(
            predictedToken,
            predictedWallet,
            alice,
            v.amount,
            uint64(block.timestamp), // resolved, never the 0 sentinel
            v.durationSeconds,
            v.cliffSeconds
        );

        vm.prank(alice);
        factory.launchToken(_params(), v, userSalt);
    }

    function test_VestingCreated_ExplicitStartPassedThrough() public {
        bytes32 userSalt = bytes32(uint256(24));
        TokenFactory.VestingParams memory v = _vesting(50_000e18);
        v.startTimestamp = uint64(block.timestamp) + 30 days;
        address predictedWallet = factory.predictVestingAddress(alice, userSalt);

        vm.prank(alice);
        factory.launchToken(_params(), v, userSalt);

        assertEq(LaunchVestingWallet(payable(predictedWallet)).start(), v.startTimestamp);
    }

    function test_TokenLaunchedEvent_IdenticalInVestingPath() public {
        // Indexer-compat proof: the vesting path emits exactly the same
        // TokenLaunched as the plain path.
        bytes32 userSalt = bytes32(uint256(25));
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
            p.journeyHash,
            scopedSalt,
            1
        );

        vm.prank(alice);
        factory.launchToken(p, _vesting(1000e18), userSalt);
    }

    function test_PredictVestingAddressMatchesDeployed() public {
        bytes32 userSalt = bytes32(uint256(26));
        address predictedWallet = factory.predictVestingAddress(alice, userSalt);

        vm.recordLogs();
        vm.prank(alice);
        factory.launchToken(_params(), _vesting(1000e18), userSalt);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        address emittedWallet;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == VestingCreated.selector) {
                emittedWallet = address(uint160(uint256(logs[i].topics[2])));
            }
        }
        assertEq(emittedWallet, predictedWallet);
        assertTrue(predictedWallet.code.length > 0);
    }

    function test_VestingWalletState_OwnerAndScheduleCorrect() public {
        bytes32 userSalt = bytes32(uint256(27));
        TokenFactory.VestingParams memory v = _vesting(1000e18);

        vm.prank(alice);
        factory.launchToken(_params(), v, userSalt);

        LaunchVestingWallet wallet =
            LaunchVestingWallet(payable(factory.predictVestingAddress(alice, userSalt)));
        assertEq(wallet.owner(), alice);
        assertEq(wallet.start(), block.timestamp);
        assertEq(wallet.duration(), v.durationSeconds);
        assertEq(wallet.cliff(), block.timestamp + v.cliffSeconds);
    }

    function test_SaltReuseAfterVersionBump_VestingLaunchesCleanly() public {
        // Regression: the vesting salt derives from the token address, so a
        // userSalt reused across template versions must not collide on the
        // fixed vesting implementation's CREATE2.
        bytes32 userSalt = bytes32(uint256(28));

        vm.prank(alice);
        factory.launchToken(_params(), _vesting(1000e18), userSalt);
        address walletV1 = factory.predictVestingAddress(alice, userSalt);

        factory.setImplementation(address(new LaunchTokenV2()));

        vm.prank(alice);
        factory.launchToken(_params(), _vesting(1000e18), userSalt);
        address walletV2 = factory.predictVestingAddress(alice, userSalt);

        assertTrue(walletV1 != walletV2);
        assertTrue(walletV1.code.length > 0 && walletV2.code.length > 0);
    }

    function test_RevertWhen_SaltReusedSameVersion_WithVesting() public {
        bytes32 userSalt = bytes32(uint256(29));
        vm.prank(alice);
        factory.launchToken(_params(), _vesting(1000e18), userSalt);

        // Still collides — on the token clone, before vesting is reached.
        vm.prank(alice);
        vm.expectRevert();
        factory.launchToken(_params(), _vesting(1000e18), userSalt);
    }

    function test_ReleaseAfterCliff_EndToEnd() public {
        uint256 amount = 100_000e18;
        bytes32 userSalt = bytes32(uint256(30));
        TokenFactory.VestingParams memory v = _vesting(amount);
        uint64 launchTime = uint64(block.timestamp);

        vm.prank(alice);
        address token = factory.launchToken(_params(), v, userSalt);
        LaunchVestingWallet wallet =
            LaunchVestingWallet(payable(factory.predictVestingAddress(alice, userSalt)));

        uint64 elapsed = v.cliffSeconds + 30 days;
        vm.warp(uint256(launchTime) + elapsed);

        uint256 expected = (amount * elapsed) / v.durationSeconds;
        wallet.release(token);

        assertEq(
            LaunchToken(token).balanceOf(alice),
            _params().totalSupply - amount + expected
        );
    }

    function testFuzz_VestingSplit(uint256 amount, uint256 supply) public {
        supply = bound(supply, 1, type(uint208).max);
        amount = bound(amount, 1, supply);

        TokenFactory.LaunchParams memory p = _params();
        p.totalSupply = supply;

        bytes32 userSalt = keccak256(abi.encode(amount, supply));
        vm.prank(alice);
        address token = factory.launchToken(p, _vesting(amount), userSalt);

        address wallet = factory.predictVestingAddress(alice, userSalt);
        assertEq(
            LaunchToken(token).balanceOf(alice) + LaunchToken(token).balanceOf(wallet),
            supply
        );
        assertEq(LaunchToken(token).balanceOf(wallet), amount);
    }
}

/// @dev Template iteration stand-in: inherits LaunchToken's locked constructor
///      and external initialize, adds a marker selector v1 clones lack.
contract LaunchTokenV2 is LaunchToken {
    function isV2() external pure returns (bool) {
        return true;
    }
}
