// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

import {AllocationSale} from "../src/AllocationSale.sol";

/// @notice Deploys the AllocationSale singleton: fixed-price, fee-free
///         allocation sales with milestone-dated proceeds lockups. No
///         constructor args, no owner, no platform cut — nothing to wire.
///
///        forge script script/DeploySale.s.sol --rpc-url robinhood_testnet --broadcast
contract DeploySale is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        AllocationSale saleContract = new AllocationSale();

        vm.stopBroadcast();

        console.log("AllocationSale:", address(saleContract));
    }
}
