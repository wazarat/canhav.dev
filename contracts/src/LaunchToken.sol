// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/// @title LaunchToken
/// @notice Minimal fixed-supply ERC20 deployed as an EIP-1167 clone by TokenFactory.
/// @dev Clones have no constructor, so name/symbol/supply are set in `initialize`,
///      which the factory calls in the same transaction as the clone deployment.
///      Every clone delegates to this implementation forever: no admin functions,
///      no minting after initialization, no upgradeability.
contract LaunchToken is Initializable, ERC20Upgradeable {
    /// @dev Lock the implementation contract so it can never be initialized directly.
    constructor() {
        _disableInitializers();
    }

    /// @param name_ Token name.
    /// @param symbol_ Token symbol.
    /// @param totalSupply_ Fixed total supply, minted once here.
    /// @param recipient_ Receives the entire supply.
    function initialize(
        string calldata name_,
        string calldata symbol_,
        uint256 totalSupply_,
        address recipient_
    ) external initializer {
        __ERC20_init(name_, symbol_);
        _mint(recipient_, totalSupply_);
    }
}
