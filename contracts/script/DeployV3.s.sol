// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

import {TokenFactory} from "../src/TokenFactory.sol";

/// @notice Deploys the TimelockController and the v3 TokenFactory owned by it,
///         REUSING the already-deployed-and-verified LaunchToken and
///         LaunchVestingWallet implementations (env vars). Treasury and pauser
///         start as the deployer EOA; both are rotatable later (treasury via
///         the timelock, pauser via the timelock).
///
///         Timelock roles: proposer/canceller = deployer EOA, executor = open
///         (anyone may execute a ready operation), no admin — the delay is the
///         only path to the factory's admin surface from day one.
///
///        LAUNCH_TOKEN_IMPL=0x3E8c9be8BB486abEc132B0d1C35266b2336b129B \
///        VESTING_IMPL=0x97d41F630025f83AdF72f00BaD8dC9B5e01eBEFC \
///        TIMELOCK_MIN_DELAY=300 \
///        forge script script/DeployV3.s.sol --rpc-url robinhood_testnet --broadcast
contract DeployV3 is Script {
    function run() external {
        address tokenImpl = vm.envAddress("LAUNCH_TOKEN_IMPL");
        address vestingImpl = vm.envAddress("VESTING_IMPL");
        // Testnet default: 5 minutes — long enough to demonstrate the delay,
        // short enough to drill. Anything real gets 24h+.
        uint256 minDelay = vm.envOr("TIMELOCK_MIN_DELAY", uint256(300));

        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = address(0);

        vm.startBroadcast(pk);

        TimelockController timelock =
            new TimelockController(minDelay, proposers, executors, address(0));
        TokenFactory factory = new TokenFactory(
            tokenImpl, vestingImpl, address(timelock), deployer, deployer
        );

        vm.stopBroadcast();

        console.log("LaunchToken implementation (reused):", tokenImpl);
        console.log("LaunchVestingWallet implementation (reused):", vestingImpl);
        console.log("TimelockController:", address(timelock));
        console.log("Timelock minDelay (s):", minDelay);
        console.log("TokenFactory v3:", address(factory));
        console.log("Factory owner (timelock):", factory.owner());
        console.log("Treasury:", factory.treasury());
        console.log("Pauser:", factory.pauser());
        console.log("MAX_LAUNCH_FEE (wei):", factory.MAX_LAUNCH_FEE());
        console.log("Current version:", factory.currentVersion());
    }
}
