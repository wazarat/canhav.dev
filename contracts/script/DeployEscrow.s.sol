// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

import {JourneyUpdates} from "../src/JourneyUpdates.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";

/// @notice Deploys the two admin-less singletons: MilestoneEscrow (milestone-
///         dated token lockups) and JourneyUpdates (content-addressed progress
///         update anchor). No constructor args, no owner, no wiring.
///
///        forge script script/DeployEscrow.s.sol --rpc-url robinhood_testnet --broadcast
contract DeployEscrow is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        MilestoneEscrow escrow = new MilestoneEscrow();
        JourneyUpdates updates = new JourneyUpdates();

        vm.stopBroadcast();

        console.log("MilestoneEscrow:", address(escrow));
        console.log("JourneyUpdates:", address(updates));
    }
}
