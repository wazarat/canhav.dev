// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
// Solady's minimal proxy is the gas-optimized variant, NOT byte-identical to
// ERC-1167 — so CREATE2 addresses DIVERGE from the OZ Clones math for the
// same salt (pinned by the parity fuzz test). The invariant the UI relies on
// is unaffected: predictTokenAddress and cloneDeterministic share LibClone's
// math, so predicted == deployed always. Never mix OZ predictions with
// LibClone deploys (or vice versa) for this factory version.
import {LibClone} from "solady/utils/LibClone.sol";

import {LaunchToken} from "./LaunchToken.sol";
import {LaunchVestingWallet} from "./LaunchVestingWallet.sol";

/// @title TokenFactory
/// @notice Deploys LaunchToken clones deterministically (CREATE2), optionally
///         with a LaunchVestingWallet clone funded in the same transaction,
///         and records launch metadata in events for off-chain indexing.
///         Image, X handle, website, and the description/journey commitments
///         deliberately live in the event rather than token storage: the token
///         stays minimal, the indexer reads the log.
/// @dev Admin surface (setImplementation, setLaunchFee, setTreasury, setPauser,
///      unpause) is Ownable2Step, intended to be owned by a TimelockController
///      so every change carries a public delay. `pause()` alone is also open to
///      a `pauser` guardian: emergencies can't wait out a timelock; recovery can.
///      The launch fee can never exceed the hardcoded MAX_LAUNCH_FEE — an
///      immutable ceiling anyone can read off the contract.
contract TokenFactory is Ownable2Step, Pausable {
    struct LaunchParams {
        string name;
        string symbol;
        uint256 totalSupply;
        string imageURI;
        string xHandle;
        string website;
        bytes32 descriptionHash;
        bytes32 journeyHash;
    }

    /// @notice Optional vesting for part (or all) of the supply. `amount == 0`
    ///         means no vesting — the other fields must then be zero too.
    ///         `startTimestamp == 0` resolves to block.timestamp at launch.
    struct VestingParams {
        uint256 amount;
        uint64 startTimestamp;
        uint64 durationSeconds;
        uint64 cliffSeconds;
    }

    /// @notice Version registry: token template implementations by version.
    ///         Versions start at 1; 0 is never used. Launches always clone the
    ///         current version; old versions stay readable for indexers but are
    ///         intentionally not launchable.
    uint64 public currentVersion;
    mapping(uint64 => address) public implementations;

    /// @notice The vesting wallet template every vesting clone delegates to.
    address public immutable vestingImplementation;

    /// @notice Hard ceiling on `launchFee`. A constant, not storage: no admin,
    ///         timelock, or upgrade can ever raise the fee past this.
    uint256 public constant MAX_LAUNCH_FEE = 0.05 ether;

    /// @notice Fee required (exactly) with every launch. Defaults to zero.
    uint256 public launchFee;

    /// @notice Where accrued fees go. Fees accumulate in the factory and move
    ///         only via the permissionless `withdraw()` — withdrawal-only, so
    ///         no key can redirect already-accrued funds without a timelocked
    ///         `setTreasury` first.
    address public treasury;

    /// @notice Guardian that can `pause()` (but never unpause) without waiting
    ///         on the timelock that owns the factory.
    address public pauser;

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

    error EmptyName();
    error EmptySymbol();
    error ZeroSupply();
    error ZeroImplementation();
    error NotAContract();
    error VestingParamsNotEmpty();
    error VestingAmountExceedsSupply();
    error VestingDurationZero();
    error WrongLaunchFee(uint256 sent, uint256 required);
    error FeeExceedsMax(uint256 fee);
    error ZeroTreasury();
    error NotPauser();
    error WithdrawFailed();
    error NothingToWithdraw();

    constructor(
        address initialImplementation,
        address initialVestingImplementation,
        address initialOwner,
        address initialTreasury,
        address initialPauser
    ) Ownable(initialOwner) {
        _requireContract(initialVestingImplementation);
        vestingImplementation = initialVestingImplementation;
        _setImplementation(initialImplementation);
        _setTreasury(initialTreasury);
        pauser = initialPauser;
        emit PauserSet(initialPauser);
    }

    /// @notice The LaunchToken logic contract new clones will delegate to.
    /// @dev Kept as a function so the external ABI survives the move from an
    ///      immutable to the version registry.
    function implementation() public view returns (address) {
        return implementations[currentVersion];
    }

    /// @notice Register a new token template version. Existing clones are
    ///         unaffected: each stays bound to the implementation it was
    ///         cloned against.
    function setImplementation(address newImplementation) external onlyOwner {
        _setImplementation(newImplementation);
    }

    /// @notice Stop new launches. Already-launched tokens and vesting wallets
    ///         are untouched — pause lives on the factory, never downstream.
    ///         Open to the guardian `pauser` as well as the owner so an
    ///         emergency stop never waits on the owning timelock's delay.
    function pause() external {
        if (msg.sender != pauser && msg.sender != owner()) revert NotPauser();
        _pause();
    }

    /// @dev Deliberately owner-only (i.e. timelocked): resuming is never an
    ///      emergency, and a compromised guardian must not be able to undo a
    ///      protective pause.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Set the fee required with every launch. Capped by
    ///         MAX_LAUNCH_FEE forever.
    function setLaunchFee(uint256 newFee) external onlyOwner {
        if (newFee > MAX_LAUNCH_FEE) revert FeeExceedsMax(newFee);
        launchFee = newFee;
        emit LaunchFeeSet(newFee);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        _setTreasury(newTreasury);
    }

    function setPauser(address newPauser) external onlyOwner {
        pauser = newPauser;
        emit PauserSet(newPauser);
    }

    /// @notice Move all accrued fees to the treasury. Permissionless: anyone
    ///         may trigger it, funds can only ever land at `treasury`.
    function withdraw() external {
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();
        address to = treasury;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert WithdrawFailed();
        emit FeesWithdrawn(to, amount);
    }

    /// @notice Deploy and initialize a new token clone — and, when
    ///         `v.amount > 0`, a vesting wallet clone funded with that amount —
    ///         in one transaction.
    /// @dev The salt is scoped to msg.sender so no one can front-run or squat
    ///      another creator's predicted address. The vesting clone's salt is
    ///      derived from the TOKEN ADDRESS (not the scoped salt): the token
    ///      address already encodes (version, sender, salt), so vesting
    ///      addresses stay collision-free even when a userSalt is reused
    ///      across template versions.
    function launchToken(LaunchParams calldata p, VestingParams calldata v, bytes32 userSalt)
        external
        payable
        whenNotPaused
        returns (address token)
    {
        // Strict equality: the fee is fixed and public, wallets simulate the
        // exact value, and refund paths are more surface than they're worth.
        if (msg.value != launchFee) revert WrongLaunchFee(msg.value, launchFee);
        if (bytes(p.name).length == 0) revert EmptyName();
        if (bytes(p.symbol).length == 0) revert EmptySymbol();
        if (p.totalSupply == 0) revert ZeroSupply();

        bool vesting = v.amount > 0;
        if (!vesting) {
            if (v.startTimestamp != 0 || v.durationSeconds != 0 || v.cliffSeconds != 0) {
                revert VestingParamsNotEmpty();
            }
        } else {
            if (v.amount > p.totalSupply) revert VestingAmountExceedsSupply();
            if (v.durationSeconds == 0) revert VestingDurationZero();
        }

        bytes32 salt = _scopedSalt(msg.sender, userSalt);
        token = LibClone.cloneDeterministic(implementations[currentVersion], salt);
        LaunchToken(token).initialize(
            p.name, p.symbol, p.totalSupply, vesting ? address(this) : msg.sender
        );

        emit TokenLaunched(
            token,
            msg.sender,
            p.name,
            p.symbol,
            p.totalSupply,
            p.imageURI,
            p.xHandle,
            p.website,
            p.descriptionHash,
            p.journeyHash,
            salt,
            currentVersion,
            msg.value,
            treasury
        );

        if (vesting) {
            uint64 start =
                v.startTimestamp == 0 ? uint64(block.timestamp) : v.startTimestamp;

            address wallet = LibClone.cloneDeterministic(
                vestingImplementation, keccak256(abi.encode(token))
            );
            // Init before funding; cliff > duration reverts inside (OZ
            // InvalidCliffDuration). No reentrancy surface: LaunchToken is a
            // hook-free ERC20 and both callees are factory-authored clones.
            LaunchVestingWallet(payable(wallet)).initialize(
                msg.sender, start, v.durationSeconds, v.cliffSeconds
            );

            LaunchToken(token).transfer(wallet, v.amount);
            uint256 remainder = p.totalSupply - v.amount;
            if (remainder != 0) LaunchToken(token).transfer(msg.sender, remainder);

            emit VestingCreated(
                token, wallet, msg.sender, v.amount, start, v.durationSeconds, v.cliffSeconds
            );
        }
    }

    /// @notice Address a token will deploy to for a given creator and salt.
    ///         Lets the UI show the address before the transaction is signed.
    /// @dev Valid ONLY for the current version: EIP-1167 bytecode embeds the
    ///      implementation address and CREATE2 hashes the init code, so a
    ///      version bump changes every predicted address. Frontends must treat
    ///      the TokenLaunched event's `token` field as truth, not a stale
    ///      prediction. Corollary: a userSalt used at version N can be reused
    ///      at version N+1 without a CREATE2 collision.
    function predictTokenAddress(address deployer, bytes32 userSalt)
        external
        view
        returns (address)
    {
        return _predictToken(deployer, userSalt);
    }

    /// @notice Address the vesting wallet will deploy to for a given creator
    ///         and salt. Same current-version-only caveat as
    ///         `predictTokenAddress` (the wallet address derives from the
    ///         predicted token address).
    function predictVestingAddress(address deployer, bytes32 userSalt)
        external
        view
        returns (address)
    {
        return LibClone.predictDeterministicAddress(
            vestingImplementation,
            keccak256(abi.encode(_predictToken(deployer, userSalt))),
            address(this)
        );
    }

    function _predictToken(address deployer, bytes32 userSalt) private view returns (address) {
        return LibClone.predictDeterministicAddress(
            implementations[currentVersion], _scopedSalt(deployer, userSalt), address(this)
        );
    }

    function _setImplementation(address impl) private {
        _requireContract(impl);
        unchecked {
            currentVersion += 1;
        }
        implementations[currentVersion] = impl;
        emit ImplementationSet(currentVersion, impl);
    }

    function _setTreasury(address newTreasury) private {
        if (newTreasury == address(0)) revert ZeroTreasury();
        treasury = newTreasury;
        emit TreasurySet(newTreasury);
    }

    function _requireContract(address impl) private view {
        if (impl == address(0)) revert ZeroImplementation();
        if (impl.code.length == 0) revert NotAContract();
    }

    function _scopedSalt(address deployer, bytes32 userSalt) private pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }
}
