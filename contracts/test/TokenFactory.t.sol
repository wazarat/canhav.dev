// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, Vm} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
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
    address internal treasuryAddr = makeAddr("treasury");
    address internal pauserGuardian = makeAddr("pauser");

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
        uint64 version,
        uint256 launchFee,
        address treasury
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

    event LaunchFeeSet(uint256 launchFee);
    event TreasurySet(address indexed treasury);
    event PauserSet(address indexed pauser);
    event FeesWithdrawn(address indexed treasury, uint256 amount);

    function setUp() public {
        implementation = new LaunchToken();
        vestingImplementation = new LaunchVestingWallet();
        factory = _newFactory(address(this));
    }

    function _newFactory(address owner_) internal returns (TokenFactory) {
        return new TokenFactory(
            address(implementation),
            address(vestingImplementation),
            owner_,
            treasuryAddr,
            pauserGuardian
        );
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
            1,
            0,
            treasuryAddr
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
        assertEq(factory.treasury(), treasuryAddr);
        assertEq(factory.pauser(), pauserGuardian);
        assertEq(factory.launchFee(), 0);
    }

    function test_RevertWhen_ConstructorImplementationZeroOrEOA() public {
        vm.expectRevert(TokenFactory.ZeroImplementation.selector);
        new TokenFactory(
            address(0), address(vestingImplementation), address(this), treasuryAddr, pauserGuardian
        );

        vm.expectRevert(TokenFactory.NotAContract.selector);
        new TokenFactory(
            makeAddr("eoa"),
            address(vestingImplementation),
            address(this),
            treasuryAddr,
            pauserGuardian
        );
    }

    function test_RevertWhen_VestingImplZeroOrEOA() public {
        vm.expectRevert(TokenFactory.ZeroImplementation.selector);
        new TokenFactory(
            address(implementation), address(0), address(this), treasuryAddr, pauserGuardian
        );

        vm.expectRevert(TokenFactory.NotAContract.selector);
        new TokenFactory(
            address(implementation), makeAddr("eoa2"), address(this), treasuryAddr, pauserGuardian
        );
    }

    function test_RevertWhen_ConstructorTreasuryZero() public {
        vm.expectRevert(TokenFactory.ZeroTreasury.selector);
        new TokenFactory(
            address(implementation),
            address(vestingImplementation),
            address(this),
            address(0),
            pauserGuardian
        );
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

    function test_RevertWhen_PauseUnpauseByStranger() public {
        vm.prank(alice);
        vm.expectRevert(TokenFactory.NotPauser.selector);
        factory.pause();

        factory.pause();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.unpause();
    }

    function test_PauserCanPause_ButNeverUnpause() public {
        vm.prank(pauserGuardian);
        factory.pause();
        assertTrue(factory.paused());

        // Recovery stays behind the owner (i.e. the timelock in production).
        vm.prank(pauserGuardian);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, pauserGuardian)
        );
        factory.unpause();

        factory.unpause();
        assertFalse(factory.paused());
    }

    function test_SetPauser_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.setPauser(alice);

        vm.expectEmit(true, true, true, true, address(factory));
        emit PauserSet(bob);
        factory.setPauser(bob);
        assertEq(factory.pauser(), bob);

        // Old guardian is out, new one works.
        vm.prank(pauserGuardian);
        vm.expectRevert(TokenFactory.NotPauser.selector);
        factory.pause();
        vm.prank(bob);
        factory.pause();
        assertTrue(factory.paused());
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

        // Old owner has lost the admin surface (and was never the pauser).
        vm.expectRevert(TokenFactory.NotPauser.selector);
        factory.pause();
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(this))
        );
        factory.setLaunchFee(1);
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
            2,
            0,
            treasuryAddr
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
            1,
            0,
            treasuryAddr
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

    // ------------------------------------------------------------------- fees

    function test_RevertWhen_ValueSentWhileFeeZero() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(TokenFactory.WrongLaunchFee.selector, 1 wei, 0)
        );
        factory.launchToken{value: 1 wei}(_params(), _noVesting(), bytes32(uint256(40)));
    }

    function test_SetLaunchFee_AppliesAndEnforcesExactValue() public {
        vm.expectEmit(true, true, true, true, address(factory));
        emit LaunchFeeSet(0.01 ether);
        factory.setLaunchFee(0.01 ether);
        assertEq(factory.launchFee(), 0.01 ether);

        vm.deal(alice, 1 ether);

        // Underpay and overpay both revert with the exact shortfall visible.
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(TokenFactory.WrongLaunchFee.selector, 0, 0.01 ether)
        );
        factory.launchToken(_params(), _noVesting(), bytes32(uint256(41)));

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(TokenFactory.WrongLaunchFee.selector, 0.02 ether, 0.01 ether)
        );
        factory.launchToken{value: 0.02 ether}(_params(), _noVesting(), bytes32(uint256(41)));

        // Exact fee launches; fee accrues in the factory, supply untouched.
        vm.prank(alice);
        address token =
            factory.launchToken{value: 0.01 ether}(_params(), _noVesting(), bytes32(uint256(41)));
        assertEq(address(factory).balance, 0.01 ether);
        assertEq(LaunchToken(token).balanceOf(alice), _params().totalSupply);
    }

    function test_TokenLaunched_CarriesFeeAndTreasury() public {
        factory.setLaunchFee(0.01 ether);

        bytes32 userSalt = bytes32(uint256(42));
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
            1,
            0.01 ether,
            treasuryAddr
        );

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        factory.launchToken{value: 0.01 ether}(p, _noVesting(), userSalt);
    }

    function test_SetLaunchFee_CapBoundary() public {
        uint256 cap = factory.MAX_LAUNCH_FEE();

        factory.setLaunchFee(cap);
        assertEq(factory.launchFee(), cap);

        vm.expectRevert(abi.encodeWithSelector(TokenFactory.FeeExceedsMax.selector, cap + 1));
        factory.setLaunchFee(cap + 1);
    }

    function test_RevertWhen_SetLaunchFeeByNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.setLaunchFee(1);
    }

    function test_Withdraw_PermissionlessAndTreasuryOnly() public {
        factory.setLaunchFee(0.02 ether);
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        factory.launchToken{value: 0.02 ether}(_params(), _noVesting(), bytes32(uint256(43)));

        vm.expectEmit(true, true, true, true, address(factory));
        emit FeesWithdrawn(treasuryAddr, 0.02 ether);

        // Anyone can trigger; funds can only land at the treasury.
        vm.prank(bob);
        factory.withdraw();
        assertEq(treasuryAddr.balance, 0.02 ether);
        assertEq(address(factory).balance, 0);
    }

    function test_RevertWhen_WithdrawWithNothingAccrued() public {
        vm.expectRevert(TokenFactory.NothingToWithdraw.selector);
        factory.withdraw();
    }

    function test_SetTreasury_RotatesAndRejectsZero() public {
        vm.expectEmit(true, true, true, true, address(factory));
        emit TreasurySet(bob);
        factory.setTreasury(bob);
        assertEq(factory.treasury(), bob);

        vm.expectRevert(TokenFactory.ZeroTreasury.selector);
        factory.setTreasury(address(0));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        factory.setTreasury(alice);
    }

    // --------------------------------------------------------------- timelock

    function _newTimelock(address proposer, uint256 delay)
        internal
        returns (TimelockController)
    {
        address[] memory proposers = new address[](1);
        proposers[0] = proposer;
        address[] memory executors = new address[](1);
        executors[0] = address(0); // open execution: anyone may run a ready op
        return new TimelockController(delay, proposers, executors, address(0));
    }

    function test_TimelockOwnedFactory_AdminGoesThroughDelay() public {
        address proposer = makeAddr("proposer");
        TimelockController timelock = _newTimelock(proposer, 1 days);
        TokenFactory tlFactory = _newFactory(address(timelock));
        assertEq(tlFactory.owner(), address(timelock));

        // No one — not even the proposer — can hit the admin surface directly.
        vm.prank(proposer);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, proposer)
        );
        tlFactory.setLaunchFee(0.01 ether);

        bytes memory call = abi.encodeCall(TokenFactory.setLaunchFee, (0.01 ether));
        vm.prank(proposer);
        timelock.schedule(address(tlFactory), 0, call, bytes32(0), bytes32(0), 1 days);

        // Executing before the published delay fails.
        vm.expectRevert();
        timelock.execute(address(tlFactory), 0, call, bytes32(0), bytes32(0));
        assertEq(tlFactory.launchFee(), 0);

        vm.warp(block.timestamp + 1 days);
        timelock.execute(address(tlFactory), 0, call, bytes32(0), bytes32(0));
        assertEq(tlFactory.launchFee(), 0.01 ether);
    }

    function test_TimelockOwnedFactory_GuardianPausesInstantly() public {
        TimelockController timelock = _newTimelock(makeAddr("proposer"), 1 days);
        TokenFactory tlFactory = _newFactory(address(timelock));

        // The guardian needs no timelock hop to stop launches...
        vm.prank(pauserGuardian);
        tlFactory.pause();
        assertTrue(tlFactory.paused());

        // ...but cannot undo a pause: recovery waits on the timelock.
        vm.prank(pauserGuardian);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, pauserGuardian)
        );
        tlFactory.unpause();
    }
}

/// @dev Template iteration stand-in: inherits LaunchToken's locked constructor
///      and external initialize, adds a marker selector v1 clones lack.
contract LaunchTokenV2 is LaunchToken {
    function isV2() external pure returns (bool) {
        return true;
    }
}
