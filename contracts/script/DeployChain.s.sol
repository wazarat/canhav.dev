// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

import {AllocationSale} from "../src/AllocationSale.sol";
import {CurveLauncher} from "../src/CurveLauncher.sol";
import {FeeSplitter} from "../src/FeeSplitter.sol";
import {JourneyUpdates} from "../src/JourneyUpdates.sol";
import {LaunchAMM} from "../src/LaunchAMM.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {LaunchVestingWallet} from "../src/LaunchVestingWallet.sol";
import {MilestoneEscrow} from "../src/MilestoneEscrow.sol";
import {TokenFactory} from "../src/TokenFactory.sol";

/// @notice The whole launchpad on a fresh chain, in one broadcast (M55). On
///         Robinhood Chain testnet the set was built up over six scripts as
///         the contracts were written; a second chain needs all of it at
///         once, in dependency order, with the same wiring:
///
///         - LaunchToken and LaunchVestingWallet implementations (locked).
///         - TimelockController, proposer and canceller the deployer EOA,
///           executor open, no admin.
///         - TokenFactory, CurveLauncher, LaunchAMM and FeeSplitter owned by
///           the timelock from construction. Treasury and pauser start as
///           the deployer EOA, the fee payee is the deployer at 100%.
///         - MilestoneEscrow, JourneyUpdates and AllocationSale, which have
///           no admin at all.
///
///         The curve parameters are immutables and default to the Robinhood
///         calibration, which content/launch.ts LAUNCH_CURVE mirrors for both
///         chains. Change them only together with that file.
///
///         Launch fees start at zero on both the factory and the launcher.
///         Setting one is a timelock operation, as it was on Robinhood.
///
///         Dry run against a fork first, then broadcast:
///
///        forge script script/DeployChain.s.sol --fork-url arbitrum_sepolia
///        forge script script/DeployChain.s.sol --rpc-url arbitrum_sepolia --broadcast --slow \
///          --verify --verifier blockscout \
///          --verifier-url https://arbitrum-sepolia.blockscout.com/api
///
///         Then copy the logged addresses and the first deploy block into
///         content/launch.ts (LAUNCH_CHAINS.arbitrum_sepolia, live true) and
///         indexer/ponder.config.ts (ARBITRUM).
contract DeployChain is Script {
    function run() external {
        uint256 minDelay = vm.envOr("TIMELOCK_MIN_DELAY", uint256(300));
        uint256 graduationEth = vm.envOr("GRADUATION_ETH", uint256(0.1 ether));
        uint16 curveShareBps = uint16(vm.envOr("CURVE_SHARE_BPS", uint256(8000)));
        uint64 snipeWindowSeconds = uint64(vm.envOr("SNIPE_WINDOW_SECONDS", uint256(60)));
        uint16 snipeTaxBps = uint16(vm.envOr("SNIPE_TAX_BPS", uint256(2000)));
        uint16 maxDevBuyBps = uint16(vm.envOr("MAX_DEV_BUY_BPS", uint256(500)));

        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address[] memory proposers = new address[](1);
        proposers[0] = deployer;
        address[] memory executors = new address[](1);
        executors[0] = address(0);
        address[] memory payees = new address[](1);
        payees[0] = deployer;
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10_000;

        vm.startBroadcast(pk);

        LaunchToken tokenImpl = new LaunchToken();
        LaunchVestingWallet vestingImpl = new LaunchVestingWallet();
        TimelockController timelock = new TimelockController(minDelay, proposers, executors, address(0));
        TokenFactory factory =
            new TokenFactory(address(tokenImpl), address(vestingImpl), address(timelock), deployer, deployer);
        MilestoneEscrow escrow = new MilestoneEscrow();
        JourneyUpdates updates = new JourneyUpdates();
        AllocationSale sale = new AllocationSale();
        FeeSplitter splitter = new FeeSplitter(address(timelock), payees, shares);
        LaunchAMM amm = new LaunchAMM(address(splitter), address(timelock));
        CurveLauncher launcher = new CurveLauncher(
            address(tokenImpl),
            address(amm),
            address(timelock),
            deployer,
            deployer,
            graduationEth,
            curveShareBps,
            snipeWindowSeconds,
            snipeTaxBps,
            maxDevBuyBps
        );

        vm.stopBroadcast();

        console.log("Chain id:", block.chainid);
        console.log("Deployer, treasury, pauser, fee payee:", deployer);
        console.log("LaunchToken implementation:", address(tokenImpl));
        console.log("LaunchVestingWallet implementation:", address(vestingImpl));
        console.log("timelockAddress:", address(timelock));
        console.log("factoryAddress:", address(factory));
        console.log("escrowAddress:", address(escrow));
        console.log("updatesAddress:", address(updates));
        console.log("saleAddress:", address(sale));
        console.log("splitterAddress:", address(splitter));
        console.log("ammAddress:", address(amm));
        console.log("curveAddress:", address(launcher));
        console.log("Factory owner (timelock):", factory.owner());
        console.log("Launcher owner (timelock):", launcher.owner());
        console.log("AMM owner (timelock):", amm.owner());
        console.log("graduationEth (wei):", launcher.graduationEth());
        console.log("virtualEthReserve (wei):", launcher.virtualEthReserve());
        console.log("maxDevBuy (wei):", launcher.maxDevBuy());
    }
}
