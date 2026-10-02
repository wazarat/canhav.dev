// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

import {CurveLauncher} from "../src/CurveLauncher.sol";
import {TokenFactory} from "../src/TokenFactory.sol";

/// @notice Sets the launch fee on the TokenFactory and the CurveLauncher of
///         one chain to the same value, through that chain's timelock. A fresh
///         deployment starts both at zero; this brings a new chain in line
///         with Robinhood Chain testnet, where both are 0.0002 ETH.
///
///         Two runs, because the timelock holds every admin change for its
///         public delay (300 s on testnet). PHASE=schedule queues one batch
///         with both calls, PHASE=execute lands it once the delay has passed.
///         Only the proposer (the deployer EOA) can schedule; anyone can
///         execute.
///
///        TIMELOCK=0x... FACTORY=0x... CURVE_LAUNCHER=0x... PHASE=schedule \
///        forge script script/SetLaunchFees.s.sol --rpc-url arbitrum_sepolia --broadcast
///        (wait out the delay, then the same line with PHASE=execute)
contract SetLaunchFees is Script {
    /// @dev The batch both phases must agree on, so it is built in one place.
    function batch(address factory, address launcher, uint256 fee)
        public
        pure
        returns (address[] memory targets, uint256[] memory values, bytes[] memory payloads)
    {
        targets = new address[](2);
        values = new uint256[](2);
        payloads = new bytes[](2);
        targets[0] = factory;
        payloads[0] = abi.encodeCall(TokenFactory.setLaunchFee, (fee));
        targets[1] = launcher;
        payloads[1] = abi.encodeCall(CurveLauncher.setLaunchFee, (fee));
    }

    function run() external {
        TimelockController timelock = TimelockController(payable(vm.envAddress("TIMELOCK")));
        address factory = vm.envAddress("FACTORY");
        address launcher = vm.envAddress("CURVE_LAUNCHER");
        uint256 fee = vm.envOr("LAUNCH_FEE", uint256(0.0002 ether));
        bytes32 salt = vm.envOr("SALT", bytes32(0));
        string memory phase = vm.envString("PHASE");
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");

        (address[] memory targets, uint256[] memory values, bytes[] memory payloads) = batch(factory, launcher, fee);
        bytes32 id = timelock.hashOperationBatch(targets, values, payloads, bytes32(0), salt);

        if (keccak256(bytes(phase)) == keccak256("schedule")) {
            uint256 delay = timelock.getMinDelay();
            vm.startBroadcast(pk);
            timelock.scheduleBatch(targets, values, payloads, bytes32(0), salt, delay);
            vm.stopBroadcast();
            console.log("Scheduled. Run PHASE=execute after (seconds):", delay);
        } else if (keccak256(bytes(phase)) == keccak256("execute")) {
            vm.startBroadcast(pk);
            timelock.executeBatch(targets, values, payloads, bytes32(0), salt);
            vm.stopBroadcast();
            console.log("Factory launchFee (wei):", TokenFactory(factory).launchFee());
            console.log("Launcher launchFee (wei):", CurveLauncher(payable(launcher)).launchFee());
        } else {
            revert("PHASE must be schedule or execute");
        }
        console.log("Fee (wei):", fee);
        console.logBytes32(id);
    }
}
