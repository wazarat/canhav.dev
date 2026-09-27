import type { FamilyEnvironment } from "@/lib/kits";

/**
 * Where each protocol family can run today on Robinhood Chain. Robinhood and
 * Morpho rows since M23; Pendle and Boros rows arrive in M29. Every row
 * carries the date it was last checked. No colons, no em dashes in notes.
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
};
