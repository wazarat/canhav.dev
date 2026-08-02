import { createConfig } from "ponder";

import { AllocationSaleAbi } from "./abis/AllocationSaleAbi";
import { FeeSplitterAbi } from "./abis/FeeSplitterAbi";
import { JourneyUpdatesAbi } from "./abis/JourneyUpdatesAbi";
import { LaunchAMMAbi } from "./abis/LaunchAMMAbi";
import { MilestoneEscrowAbi } from "./abis/MilestoneEscrowAbi";
import { TimelockControllerAbi } from "./abis/TimelockControllerAbi";
import { TokenFactoryAbi } from "./abis/TokenFactoryAbi";
import { TokenFactoryV3Abi } from "./abis/TokenFactoryV3Abi";

// Deployment records: contracts/broadcast/{Deploy,DeployV2,DeployV3}.s.sol/46630/run-latest.json
// v1 factory (paused after v2 migration) deployed at block 95600880 (2026-07-31);
// v2 factory (vesting support) at block 95922560 (2026-08-01). Both watched with
// the v2 ABI — a superset; the v1 address simply never emits VestingCreated.
//
// v3 (launch fee plumbing, 2026-08-02) is a SEPARATE contract entry: its
// TokenLaunched gained launchFee/treasury params, which changes the event
// signature (topic0), so v1/v2 and v3 cannot share one ABI's TokenLaunched.
export default createConfig({
  chains: {
    robinhoodTestnet: {
      id: 46630,
      rpc: process.env.PONDER_RPC_URL_46630 ?? "https://rpc.testnet.chain.robinhood.com",
    },
  },
  contracts: {
    TokenFactory: {
      chain: "robinhoodTestnet",
      abi: TokenFactoryAbi,
      address: [
        "0x1dAaa8294806d216Df36dc07B3803ED26584c909",
        "0x10F33eE0f6a72D7Cc1f41196B4EF80B28C909Bc0",
      ],
      startBlock: 95600880,
    },
    TokenFactoryV3: {
      chain: "robinhoodTestnet",
      abi: TokenFactoryV3Abi,
      address: "0xD6166E156B52eB9B301D56Bd68d5D9c551d7d4c5",
      startBlock: 96208927,
    },
    // TimelockController that owns the v3 factory — indexed so the governance
    // page can show pending/executed admin operations.
    Timelock: {
      chain: "robinhoodTestnet",
      abi: TimelockControllerAbi,
      address: "0x080cCDC07e2a0a5D11e9dDaA873ea68F540109ae",
      startBlock: 96208926,
    },
    // Admin-less singletons (2026-08-02): milestone-dated lockups + progress
    // update anchor. Deployment record: broadcast/DeployEscrow.s.sol.
    MilestoneEscrow: {
      chain: "robinhoodTestnet",
      abi: MilestoneEscrowAbi,
      address: "0x90C71DBA8A61Da14CA699f72D311e404094Cf192",
      startBlock: 96220433,
    },
    JourneyUpdates: {
      chain: "robinhoodTestnet",
      abi: JourneyUpdatesAbi,
      address: "0x31358209375591b1285EaA437c2c9f189c48D073",
      startBlock: 96220433,
    },
    // Fixed-price fee-free allocation sales with milestone-dated proceeds
    // lockups (2026-08-02). Deployment record: broadcast/DeploySale.s.sol.
    AllocationSale: {
      chain: "robinhoodTestnet",
      abi: AllocationSaleAbi,
      address: "0x869cE70ff8174802d98D26835ce4040754Ad284A",
      startBlock: 96229564,
    },
    // Minimal AMM + platform fee splitter (2026-08-02). Deployment record:
    // broadcast/DeployAMM.s.sol.
    LaunchAMM: {
      chain: "robinhoodTestnet",
      abi: LaunchAMMAbi,
      address: "0xDd070b1f8e000D27491A3d38543ef0D72C758Df4",
      startBlock: 96235054,
    },
    FeeSplitter: {
      chain: "robinhoodTestnet",
      abi: FeeSplitterAbi,
      address: "0x9FDFae007b65d4c8F3CCA6AC242E3f141eC9DA18",
      startBlock: 96235052,
    },
  },
});
