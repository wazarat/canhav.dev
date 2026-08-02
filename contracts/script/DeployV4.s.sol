// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

import {TokenFactory} from "../src/TokenFactory.sol";

/// @notice Deploys the v4 TokenFactory — identical ABI/events to v3, cloning
///         via Solady LibClone (the phase-5 validation swap). Reuses the
///         deployed LaunchToken + LaunchVestingWallet implementations and the
///         existing TimelockController as owner.
///
///        LAUNCH_TOKEN_IMPL=0x3E8c9be8BB486abEc132B0d1C35266b2336b129B \
///        VESTING_IMPL=0x97d41F630025f83AdF72f00BaD8dC9B5e01eBEFC \
///        TIMELOCK=0x080cCDC07e2a0a5D11e9dDaA873ea68F540109ae \
///        forge script script/DeployV4.s.sol --rpc-url robinhood_testnet --broadcast
contract DeployV4 is Script {
    function run() external {
        address tokenImpl = vm.envAddress("LAUNCH_TOKEN_IMPL");
        address vestingImpl = vm.envAddress("VESTING_IMPL");
        address timelock = vm.envAddress("TIMELOCK");
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        TokenFactory factory =
            new TokenFactory(tokenImpl, vestingImpl, timelock, deployer, deployer);
        vm.stopBroadcast();

        console.log("TokenFactory v4 (LibClone):", address(factory));
        console.log("Owner (timelock):", factory.owner());
        console.log("launchFee:", factory.launchFee());
        console.log("MAX_LAUNCH_FEE:", factory.MAX_LAUNCH_FEE());
    }
}
