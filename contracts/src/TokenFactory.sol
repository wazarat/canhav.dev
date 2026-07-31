// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {LaunchToken} from "./LaunchToken.sol";

/// @title TokenFactory
/// @notice Deploys LaunchToken clones deterministically (CREATE2) and records
///         launch metadata in an event for off-chain indexing. Image, X handle,
///         website, and the description/journey commitments deliberately live in
///         the event rather than token storage: the token stays minimal, the
///         indexer reads the log.
/// @dev Admin surface (pause, setImplementation) is Ownable2Step owned by the
///      deployer EOA — acceptable for testnet. Migrate ownership to a
///      TimelockController before anything real.
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

    /// @notice Version registry: template implementations by version.
    ///         Versions start at 1; 0 is never used. Launches always clone the
    ///         current version; old versions stay readable for indexers but are
    ///         intentionally not launchable.
    uint64 public currentVersion;
    mapping(uint64 => address) public implementations;

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

    error EmptyName();
    error EmptySymbol();
    error ZeroSupply();
    error ZeroImplementation();
    error NotAContract();

    constructor(address initialImplementation) Ownable(msg.sender) {
        _setImplementation(initialImplementation);
    }

    /// @notice The LaunchToken logic contract new clones will delegate to.
    /// @dev Kept as a function so the external ABI survives the move from an
    ///      immutable to the version registry.
    function implementation() public view returns (address) {
        return implementations[currentVersion];
    }

    /// @notice Register a new template version. Existing clones are unaffected:
    ///         each stays bound to the implementation it was cloned against.
    function setImplementation(address newImplementation) external onlyOwner {
        _setImplementation(newImplementation);
    }

    /// @notice Stop new launches. Already-launched tokens are untouched —
    ///         pause lives on the factory, never on tokens.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Deploy and initialize a new token clone in one transaction.
    /// @dev The salt is scoped to msg.sender so no one can front-run or squat
    ///      another creator's predicted address.
    function launchToken(LaunchParams calldata p, bytes32 userSalt)
        external
        whenNotPaused
        returns (address token)
    {
        if (bytes(p.name).length == 0) revert EmptyName();
        if (bytes(p.symbol).length == 0) revert EmptySymbol();
        if (p.totalSupply == 0) revert ZeroSupply();

        bytes32 salt = _scopedSalt(msg.sender, userSalt);
        token = Clones.cloneDeterministic(implementations[currentVersion], salt);
        LaunchToken(token).initialize(p.name, p.symbol, p.totalSupply, msg.sender);

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
            currentVersion
        );
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
        return Clones.predictDeterministicAddress(
            implementations[currentVersion], _scopedSalt(deployer, userSalt), address(this)
        );
    }

    function _setImplementation(address impl) private {
        if (impl == address(0)) revert ZeroImplementation();
        if (impl.code.length == 0) revert NotAContract();
        unchecked {
            currentVersion += 1;
        }
        implementations[currentVersion] = impl;
        emit ImplementationSet(currentVersion, impl);
    }

    function _scopedSalt(address deployer, bytes32 userSalt) private pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }
}
