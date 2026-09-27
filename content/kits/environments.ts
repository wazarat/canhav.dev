import type { FamilyEnvironment } from "@/lib/kits";

/**
 * Where each protocol family can run today on Robinhood Chain. One row per
 * family; SHAPE_FAMILIES decides which rows a shape shows, and Boros never
 * appears in a shape plan because it does not run here (it is listed for
 * the public catalog tool only). Every row carries the date it was last
 * checked. No colons, no em dashes in notes.
 */

const DEV_PATH = [
  "Testnet 46630 first, with mocks for anything that is not deployed there",
  "A local fork of mainnet 4663 against the real contracts",
  "Mainnet staging behind strict caps before the full surface opens",
] as const;

export const KIT_ENVIRONMENTS: Partial<Record<FamilyEnvironment["family"], FamilyEnvironment>> = {
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
