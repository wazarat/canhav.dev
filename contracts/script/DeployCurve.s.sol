// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

import {CurveLauncher} from "../src/CurveLauncher.sol";

/// @notice Deploys the CurveLauncher. Reuses the deployed LaunchToken
///         implementation and the LaunchAMM singleton, and hands ownership to
///         the existing TimelockController at construction (the v4 pattern),
///         so every admin change waits out the public delay. Treasury and
///         pauser start as the deployer EOA, like the factory.
///
///         Curve parameters are immutables. The defaults below are the
///         testnet calibration (0.1 ETH graduation so a graduation can be
///         exercised from faucet balances); override any of them by env.
///
///        LAUNCH_TOKEN_IMPL=0x3E8c9be8BB486abEc132B0d1C35266b2336b129B \
///        LAUNCH_AMM=0xDd070b1f8e000D27491A3d38543ef0D72C758Df4 \
///        TIMELOCK=0x080cCDC07e2a0a5D11e9dDaA873ea68F540109ae \
///        forge script script/DeployCurve.s.sol --rpc-url robinhood_testnet --broadcast --slow \
///          --verify --verifier blockscout \
///          --verifier-url https://explorer.testnet.chain.robinhood.com/api
contract DeployCurve is Script {
    function run() external {
        address tokenImpl = vm.envAddress("LAUNCH_TOKEN_IMPL");
        address amm = vm.envAddress("LAUNCH_AMM");
        address timelock = vm.envAddress("TIMELOCK");
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        uint256 graduationEth = vm.envOr("GRADUATION_ETH", uint256(0.1 ether));
        uint16 curveShareBps = uint16(vm.envOr("CURVE_SHARE_BPS", uint256(8000)));
        uint64 snipeWindowSeconds = uint64(vm.envOr("SNIPE_WINDOW_SECONDS", uint256(60)));
        uint16 snipeTaxBps = uint16(vm.envOr("SNIPE_TAX_BPS", uint256(2000)));
        uint16 maxDevBuyBps = uint16(vm.envOr("MAX_DEV_BUY_BPS", uint256(500)));

        vm.startBroadcast(pk);
        CurveLauncher launcher = new CurveLauncher(
            tokenImpl,
            amm,
            timelock,
            deployer,
            deployer,
            graduationEth,
            curveShareBps,
            snipeWindowSeconds,
            snipeTaxBps,
            maxDevBuyBps
        );
        vm.stopBroadcast();

        console.log("CurveLauncher:", address(launcher));
        console.log("Owner (timelock):", launcher.owner());
        console.log("VERSION:", launcher.VERSION());
        console.log("graduationEth (wei):", launcher.graduationEth());
        console.log("curveShareBps:", launcher.curveShareBps());
        console.log("virtualEthReserve (wei):", launcher.virtualEthReserve());
        console.log("snipeWindowSeconds:", launcher.snipeWindowSeconds());
        console.log("snipeTaxBps:", launcher.snipeTaxBps());
        console.log("maxDevBuy (wei):", launcher.maxDevBuy());
        console.log("launchFee:", launcher.launchFee());
        console.log("MAX_LAUNCH_FEE:", launcher.MAX_LAUNCH_FEE());
    }
}
