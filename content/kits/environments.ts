import type { ProjectChain } from "@/lib/chains";
import type { EnvironmentRows } from "@/lib/kits";

/**
 * Where each protocol family can run today, per chain a project can build
 * on (M52). One row per family per chain; SHAPE_FAMILIES decides which rows
 * a shape shows, after the chain's own row. On Robinhood Chain Boros never
 * appears in a shape plan because it does not run there (it is listed for
 * the public catalog tool only). A family with its own path (Uniswap, which
 * a team deploys itself on Robinhood testnet) shows it beside the shared
 * one. Every row carries the date it was last checked. No colons, no em
 * dashes in notes.
 */

const DEV_PATH = [
  "Testnet 46630 first, with mocks for anything that is not deployed there",
  "A local fork of mainnet 4663 against the real contracts",
  "Mainnet staging behind strict caps before the full surface opens",
] as const;

const ARBITRUM_DEV_PATH = [
  "Arbitrum Sepolia 421614 first, with mocks for anything that is not deployed there",
  "A local fork of Arbitrum One 42161 against the real contracts",
  "Mainnet staging behind strict caps before the full surface opens",
] as const;

const ROBINHOOD_ROWS: EnvironmentRows = {
  robinhood: {
    family: "robinhood",
    testnet: {
      chainId: 46630,
      status: "official",
      note: "Public RPC, explorer and faucet are live and rate limited. The chain team keeps the testnet active for developers.",
      source: "https://docs.robinhood.com/chain/connecting",
    },
    mainnet: {
      chainId: 4663,
      status: "official",
      note: "Live, with the chain team recommending a managed RPC provider for production traffic.",
      source: "https://docs.robinhood.com/chain/connecting",
    },
    devPath: DEV_PATH,
    checkedOn: "2026-09-27",
  },
  morpho: {
    family: "morpho",
    testnet: {
      chainId: 46630,
      status: "community",
      note: "A community deployment of the core market contracts and the adaptive rate model, verified on the explorer, with no oracle and no market created. It is not in the official registry.",
      source:
        "https://github.com/EqualFiLabs/Statics/blob/master/deployments/robinhood-testnet-46630-morpho.json",
    },
    mainnet: {
      chainId: 4663,
      status: "official",
      note: "Listed in the official address registry and supported by the API.",
      source: "https://docs.morpho.org/developers/contracts/addresses",
    },
    devPath: DEV_PATH,
    checkedOn: "2026-09-27",
  },
  pendle: {
    family: "pendle",
    testnet: {
      chainId: 46630,
      status: "none",
      note: "No deployment on testnet 46630 in the protocol's manifests or on its deployments page. Wrapper and market work runs against mocks or against a fork of mainnet.",
      source: "https://github.com/pendle-finance/pendle-core-v2-public/tree/main/deployments",
    },
    mainnet: {
      chainId: 4663,
      status: "manifest_only",
      note: "Router, factories, wrapper factory, deploy helper and oracles are in the protocol's manifest for chain 4663 and the hosted API lists the chain. The docs deployments page does not list it yet, so treat the addresses as unverified on your side until you have read them from the explorer.",
      source: "https://github.com/pendle-finance/pendle-core-v2-public/blob/main/deployments/4663-core.json",
    },
    devPath: DEV_PATH,
    checkedOn: "2026-09-27",
  },
  uniswap: {
    family: "uniswap",
    testnet: {
      chainId: 46630,
      status: "none",
      note: "No deployment on testnet 46630 in the protocol's deployment records or its docs. Deploy the v2 or v4 stack yourself with the runbook in the kit and keep your manifest as the source of truth.",
      source: "https://developers.uniswap.org/docs/protocols/v4/deployments",
    },
    mainnet: {
      chainId: 4663,
      status: "official",
      note: "v2, v3, v4, Permit2 and the Universal Router are in the protocol's deployment records for chain 4663 and in its docs, and the hosted routing serves the chain. Reference only until your own pool exists there.",
      source: "https://github.com/Uniswap/contracts/blob/main/deployments/4663.md",
    },
    devPath: [
      "Deploy the v2 or v4 stack to testnet 46630 yourself and record every address, commit and transaction in the manifest",
      "A local fork of mainnet 4663 against the canonical deployment",
      "Mainnet 4663 on the canonical contracts with your own pool and hook, behind a cap at first",
    ],
    checkedOn: "2026-09-28",
  },
  boros: {
    family: "boros",
    testnet: {
      chainId: 46630,
      status: "none",
      note: "Runs on Arbitrum. There is no deployment on Robinhood Chain testnet and none is announced.",
      source: "https://github.com/pendle-finance/boros-core-public/tree/main/deployments",
    },
    mainnet: {
      chainId: 4663,
      status: "none",
      note: "Runs on Arbitrum. There is no deployment on Robinhood Chain mainnet, which is why every Boros resource is background reading here.",
      source: "https://github.com/pendle-finance/boros-core-public/tree/main/deployments",
    },
    devPath: DEV_PATH,
    checkedOn: "2026-09-27",
  },
};

/**
 * Arbitrum rows, each read from the protocol's own deployment records on
 * the date in checkedOn. Sepolia 421614 is the testnet, Arbitrum One 42161
 * the mainnet it stands in for.
 */
const ARBITRUM_ROWS: EnvironmentRows = {
  arbitrum: {
    family: "arbitrum",
    testnet: {
      chainId: 421614,
      status: "official",
      note: "Public RPC, explorer and faucets are live. The public endpoint is rate limited, so use a provider for anything beyond light testing.",
      source: "https://docs.arbitrum.io/build-decentralized-apps/reference/node-providers",
    },
    mainnet: {
      chainId: 42161,
      status: "official",
      note: "Arbitrum One is live, with a managed RPC provider recommended for production traffic.",
      source: "https://docs.arbitrum.io/build-decentralized-apps/reference/node-providers",
    },
    devPath: ARBITRUM_DEV_PATH,
    checkedOn: "2026-10-02",
  },
  morpho: {
    family: "morpho",
    testnet: {
      chainId: 421614,
      status: "none",
      note: "Not in the official address registry, which lists Sepolia and Base Sepolia as its only testnets. Market and vault work runs against mocks, your own deployment of the core contracts, or a fork of Arbitrum One.",
      source: "https://docs.morpho.org/developers/contracts/addresses",
    },
    mainnet: {
      chainId: 42161,
      status: "official",
      note: "Listed in the official address registry.",
      source: "https://docs.morpho.org/developers/contracts/addresses",
    },
    devPath: ARBITRUM_DEV_PATH,
    checkedOn: "2026-10-02",
  },
  pendle: {
    family: "pendle",
    testnet: {
      chainId: 421614,
      status: "none",
      note: "No manifest for chain 421614 in the protocol's deployments. Wrapper and market work runs against mocks or against a fork of Arbitrum One.",
      source: "https://github.com/pendle-finance/pendle-core-v2-public/tree/main/deployments",
    },
    mainnet: {
      chainId: 42161,
      status: "official",
      note: "The core and helper manifests for chain 42161 are in the protocol's repository.",
      source: "https://github.com/pendle-finance/pendle-core-v2-public/blob/main/deployments/42161-core.json",
    },
    devPath: ARBITRUM_DEV_PATH,
    checkedOn: "2026-10-02",
  },
  uniswap: {
    family: "uniswap",
    testnet: {
      chainId: 421614,
      status: "official",
      note: "The v4 pool manager is in the protocol's deployments table for Arbitrum Sepolia. Read every address from that table before relying on it.",
      source: "https://developers.uniswap.org/docs/protocols/v4/deployments",
    },
    mainnet: {
      chainId: 42161,
      status: "official",
      note: "The v4 pool manager is in the protocol's deployments table for Arbitrum One.",
      source: "https://developers.uniswap.org/docs/protocols/v4/deployments",
    },
    devPath: [
      "Arbitrum Sepolia 421614 against the canonical v4 deployment, with your own pool and hook",
      "A local fork of Arbitrum One 42161 against the canonical deployment",
      "Arbitrum One on the canonical contracts with your own pool and hook, behind a cap at first",
    ],
    checkedOn: "2026-10-02",
  },
  boros: {
    family: "boros",
    testnet: {
      chainId: 421614,
      status: "none",
      note: "The protocol's public deployment files name no testnet. Work against a fork of Arbitrum One.",
      source: "https://github.com/pendle-finance/boros-core-public/tree/main/deployments",
    },
    mainnet: {
      chainId: 42161,
      status: "official",
      note: "Runs on Arbitrum One. Read the addresses from the protocol's deployment files.",
      source: "https://github.com/pendle-finance/boros-core-public/tree/main/deployments",
    },
    devPath: ARBITRUM_DEV_PATH,
    checkedOn: "2026-10-02",
  },
};

export const KIT_ENVIRONMENTS: Record<ProjectChain, EnvironmentRows> = {
  robinhood_testnet: ROBINHOOD_ROWS,
  arbitrum_sepolia: ARBITRUM_ROWS,
};
