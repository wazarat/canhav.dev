// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

import {LaunchToken} from "../src/LaunchToken.sol";
import {TokenFactory} from "../src/TokenFactory.sol";

/// @notice Deploys the LaunchToken implementation, then TokenFactory pointing
///         at it (registered as version 1). Factory owner = broadcast EOA.
///
///        forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast
contract Deploy is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        LaunchToken impl = new LaunchToken();
        TokenFactory factory = new TokenFactory(address(impl));

        vm.stopBroadcast();

        console.log("LaunchToken implementation (v1):", address(impl));
        console.log("TokenFactory:", address(factory));
        console.log("Factory owner:", factory.owner());
        console.log("Current version:", factory.currentVersion());
    }
}
