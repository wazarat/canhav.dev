// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

import {TokenFactory} from "../src/TokenFactory.sol";

/// @notice Deploys TokenFactory (which deploys its own LaunchToken implementation).
/// @dev NOT run yet — nothing is deployed anywhere. When Robinhood testnet
///      details are in contracts/.env:
///
///        forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast
contract Deploy is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        TokenFactory factory = new TokenFactory();

        vm.stopBroadcast();

        console.log("TokenFactory:", address(factory));
        console.log("LaunchToken implementation:", factory.implementation());
    }
}
