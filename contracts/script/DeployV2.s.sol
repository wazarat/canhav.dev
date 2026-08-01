// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

import {LaunchVestingWallet} from "../src/LaunchVestingWallet.sol";
import {TokenFactory} from "../src/TokenFactory.sol";

/// @notice Deploys the vesting wallet implementation and the v2 TokenFactory,
///         REUSING the already-deployed-and-verified LaunchToken implementation
///         (LAUNCH_TOKEN_IMPL env var) as version 1.
///
///        LAUNCH_TOKEN_IMPL=0x3E8c9be8BB486abEc132B0d1C35266b2336b129B \
///        forge script script/DeployV2.s.sol --rpc-url robinhood_testnet --broadcast
contract DeployV2 is Script {
    function run() external {
        address tokenImpl = vm.envAddress("LAUNCH_TOKEN_IMPL");

        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        LaunchVestingWallet vestingImpl = new LaunchVestingWallet();
        TokenFactory factory = new TokenFactory(tokenImpl, address(vestingImpl));

        vm.stopBroadcast();

        console.log("LaunchToken implementation (reused v1):", tokenImpl);
        console.log("LaunchVestingWallet implementation:", address(vestingImpl));
        console.log("TokenFactory v2:", address(factory));
        console.log("Factory owner:", factory.owner());
        console.log("Current version:", factory.currentVersion());
    }
}
