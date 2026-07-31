// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {LaunchToken} from "./LaunchToken.sol";

/// @title TokenFactory
/// @notice Deploys LaunchToken clones deterministically (CREATE2) and records
///         launch metadata in an event for off-chain indexing. Image, X handle,
///         and website deliberately live in the event rather than token storage:
///         the token stays minimal, the indexer reads the log.
/// @dev No admin functions yet. When admin surface is added (fees, pausing),
///      it goes behind Ownable2Step owned by a TimelockController.
contract TokenFactory {
    struct LaunchParams {
        string name;
        string symbol;
        uint256 totalSupply;
        string imageURI;
        string xHandle;
        string website;
        bytes32 descriptionHash;
    }

    /// @notice The LaunchToken logic contract every clone delegates to.
    address public immutable implementation;

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

    error EmptyName();
    error EmptySymbol();
    error ZeroSupply();

    constructor() {
        implementation = address(new LaunchToken());
    }

    /// @notice Deploy and initialize a new token clone in one transaction.
    /// @dev The salt is scoped to msg.sender so no one can front-run or squat
    ///      another creator's predicted address.
    function launchToken(LaunchParams calldata p, bytes32 userSalt)
        external
        returns (address token)
    {
        if (bytes(p.name).length == 0) revert EmptyName();
        if (bytes(p.symbol).length == 0) revert EmptySymbol();
        if (p.totalSupply == 0) revert ZeroSupply();

        bytes32 salt = _scopedSalt(msg.sender, userSalt);
        token = Clones.cloneDeterministic(implementation, salt);
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
            salt
        );
    }

    /// @notice Address a token will deploy to for a given creator and salt.
    ///         Lets the UI show the address before the transaction is signed.
    function predictTokenAddress(address deployer, bytes32 userSalt)
        external
        view
        returns (address)
    {
        return Clones.predictDeterministicAddress(
            implementation, _scopedSalt(deployer, userSalt), address(this)
        );
    }

    function _scopedSalt(address deployer, bytes32 userSalt) private pure returns (bytes32) {
        return keccak256(abi.encode(deployer, userSalt));
    }
}
