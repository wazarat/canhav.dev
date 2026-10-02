import { createConfig } from "ponder";

import { AllocationSaleAbi } from "./abis/AllocationSaleAbi";
import { CurveLauncherAbi } from "./abis/CurveLauncherAbi";
import { FeeSplitterAbi } from "./abis/FeeSplitterAbi";
import { JourneyUpdatesAbi } from "./abis/JourneyUpdatesAbi";
import { LaunchAMMAbi } from "./abis/LaunchAMMAbi";
import { MilestoneEscrowAbi } from "./abis/MilestoneEscrowAbi";
import { TimelockControllerAbi } from "./abis/TimelockControllerAbi";
import { TokenFactoryAbi } from "./abis/TokenFactoryAbi";
import { TokenFactoryV3Abi } from "./abis/TokenFactoryV3Abi";

// Deployment records: contracts/broadcast/{Deploy,DeployV2,DeployV3,DeployCurve}.s.sol/46630/run-latest.json
// v1 factory (paused after v2 migration) deployed at block 95600880 (2026-07-31);
// v2 factory (vesting support) at block 95922560 (2026-08-01). Both watched with
// the v2 ABI — a superset; the v1 address simply never emits VestingCreated.
//
// v3 (launch fee plumbing, 2026-08-02) is a SEPARATE contract entry: its
// TokenLaunched gained launchFee/treasury params, which changes the event
// signature (topic0), so v1/v2 and v3 cannot share one ABI's TokenLaunched.
const PUBLIC_RPC = "https://rpc.testnet.chain.robinhood.com";

/**
 * `??` only falls back on null/undefined, so a secret that is set but empty
 * (or whitespace) reaches ponder as "" and surfaces as a bare
 * `BuildError: Invalid URL` at the config stage, with nothing naming the
 * variable. Treat blank as unset and say so.
 */
function rpcUrl(envName = "PONDER_RPC_URL_46630", fallback = PUBLIC_RPC): string {
  const raw = process.env[envName]?.trim();
  if (!raw) return fallback;
  try {
    new URL(raw);
  } catch {
    throw new Error(
      `${envName} is not a valid URL (received ${JSON.stringify(raw)}). ` +
        `Unset it to fall back to ${fallback}.`,
    );
  }
  return raw;
}

const robinhood = createConfig({
  chains: {
    robinhoodTestnet: {
      id: 46630,
      rpc: rpcUrl(),
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
    // Fee-era factories: v3 + v4 share this entry — v4 (Solady LibClone,
    // 2026-08-02, block 96243249) kept the ABI/events byte-identical, so it
    // is just a second address, exactly like v1/v2 above.
    TokenFactoryV3: {
      chain: "robinhoodTestnet",
      abi: TokenFactoryV3Abi,
      address: [
        "0xD6166E156B52eB9B301D56Bd68d5D9c551d7d4c5",
        "0x30Db3A828F65B92434c6aDB27AEeD01850277b08",
      ],
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
    // Bonding-curve launcher (2026-09-29, M19a). Emits the same TokenLaunched
    // as v3/v4 (selector checked byte-identical, see README) so its launches
    // land in `token` through a shared insert, plus CurveCreated, CurveBuy,
    // CurveSell and Graduated into `curve` and `curve_trade`. Its own entry
    // rather than a third address on TokenFactoryV3, so one log reaches one
    // handler and the start block is its own. Deployment record:
    // broadcast/DeployCurve.s.sol.
    CurveLauncher: {
      chain: "robinhoodTestnet",
      abi: CurveLauncherAbi,
      address: "0xb2e1F2df7775d17CE70c8CE7586c7bb01bD10981",
      startBlock: 126200516,
    },
  },
});

// ---------------------------------------------------------------------------
// Arbitrum Sepolia (421614). The same contracts, deployed once by
// contracts/script/DeployChain.s.sol, so one address per entry and one start
// block for all of them. This instance runs beside the Robinhood one, each
// with its own database schema; the app picks the indexer by chain
// (lib/indexer.ts INDEXER_URLS). Select it with PONDER_CHAIN=arbitrum_sepolia.
//
// Deployment record: contracts/broadcast/DeployChain.s.sol/421614/run-latest.json.
const ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

const ARBITRUM: {
  startBlock: number | null;
  factory: `0x${string}` | null;
  timelock: `0x${string}` | null;
  escrow: `0x${string}` | null;
  updates: `0x${string}` | null;
  sale: `0x${string}` | null;
  amm: `0x${string}` | null;
  splitter: `0x${string}` | null;
  curve: `0x${string}` | null;
} = {
  // The LaunchToken implementation, the first transaction of the broadcast (2026-10-02).
  startBlock: 315002357,
  factory: "0xdC3521DDEFfca6825771da6c23679A7BA1E82475",
  timelock: "0xeD66C31FFAC1C5dCf4f327536a7540B22DF2B5E1",
  escrow: "0x3F7AcbFE98c5Ac72259F7e838886c310f3E0D8ce",
  updates: "0x97d41F630025f83AdF72f00BaD8dC9B5e01eBEFC",
  sale: "0x10F33eE0f6a72D7Cc1f41196B4EF80B28C909Bc0",
  amm: "0x4EA372acAb7be21113f474CEd2B7b317019afeD3",
  splitter: "0x37dC58e2098b61249E12e0674D0C137EDf5248B4",
  curve: "0x6Dde90B06b920565ccBA93D8ad7d5AfE5846426f",
};

// The pre-fee factories (v1, v2) only ever existed on Robinhood. Their entry
// has to exist because src/index.ts registers handlers on it, so here it
// watches an address that never emits a log.
const NO_LOGS = "0x000000000000000000000000000000000000dEaD";

function arbitrum() {
  const missing = Object.entries(ARBITRUM)
    .filter(([, v]) => v === null)
    .map(([k]) => k);
  if (missing.length)
    throw new Error(
      `PONDER_CHAIN=arbitrum_sepolia but the deployment is not recorded in ponder.config.ts (missing ${missing.join(", ")}).`,
    );
  const d = ARBITRUM as { [K in keyof typeof ARBITRUM]: NonNullable<(typeof ARBITRUM)[K]> };
  const at = { chain: "arbitrumSepolia" as const, startBlock: d.startBlock };
  return createConfig({
    chains: {
      arbitrumSepolia: { id: 421614, rpc: rpcUrl("PONDER_RPC_URL_421614", ARBITRUM_SEPOLIA_RPC) },
    },
    contracts: {
      TokenFactory: { ...at, abi: TokenFactoryAbi, address: NO_LOGS },
      TokenFactoryV3: { ...at, abi: TokenFactoryV3Abi, address: d.factory },
      Timelock: { ...at, abi: TimelockControllerAbi, address: d.timelock },
      MilestoneEscrow: { ...at, abi: MilestoneEscrowAbi, address: d.escrow },
      JourneyUpdates: { ...at, abi: JourneyUpdatesAbi, address: d.updates },
      AllocationSale: { ...at, abi: AllocationSaleAbi, address: d.sale },
      LaunchAMM: { ...at, abi: LaunchAMMAbi, address: d.amm },
      FeeSplitter: { ...at, abi: FeeSplitterAbi, address: d.splitter },
      CurveLauncher: { ...at, abi: CurveLauncherAbi, address: d.curve },
    },
  });
}

// The Robinhood config above is untouched and stays the default, so the
// running instance sees the same chains and contracts as before. The handler
// types come from it; the Arbitrum config carries the same contract names.
export default (process.env.PONDER_CHAIN?.trim() === "arbitrum_sepolia"
  ? arbitrum()
  : robinhood) as typeof robinhood;
