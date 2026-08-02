// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

import {FeeSplitter} from "../src/FeeSplitter.sol";
import {LaunchAMM} from "../src/LaunchAMM.sol";

/// @notice Deploys the FeeSplitter (payee = deployer EOA for now, owner = the
///         TimelockController so any payee change waits out the public delay)
///         and the LaunchAMM (splitter wired in as an immutable, owner = the
///         timelock — its only knob is the capped default protocol fee).
///
///        TIMELOCK=0x080cCDC07e2a0a5D11e9dDaA873ea68F540109ae \
///        forge script script/DeployAMM.s.sol --rpc-url robinhood_testnet --broadcast
contract DeployAMM is Script {
    function run() external {
        address timelock = vm.envAddress("TIMELOCK");
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address[] memory payees = new address[](1);
        payees[0] = deployer;
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10_000;

        vm.startBroadcast(pk);

        FeeSplitter splitter = new FeeSplitter(timelock, payees, shares);
        LaunchAMM amm = new LaunchAMM(address(splitter), timelock);

        vm.stopBroadcast();

        console.log("FeeSplitter:", address(splitter));
        console.log("LaunchAMM:", address(amm));
        console.log("AMM owner (timelock):", amm.owner());
        console.log("Default protocol fee (bps):", amm.defaultProtocolFeeBps());
        console.log("MAX_PROTOCOL_FEE_BPS:", amm.MAX_PROTOCOL_FEE_BPS());
        console.log("PROJECT_SHARE_BPS:", amm.PROJECT_SHARE_BPS());
    }
}
