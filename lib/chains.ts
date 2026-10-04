/**
 * The chains a project can build on (M52). A project picks one while
 * ideating and its token launch follows it. Pure, no imports, so the
 * document, the kit, the launch layer and the MCP tools can all read it.
 *
 * `ProjectDoc.chain` is optional and never injected, so a document written
 * before M52 has no key, reads as Robinhood and keeps its published hash.
 */

export const PROJECT_CHAINS = ["robinhood_testnet", "arbitrum_sepolia"] as const;
export type ProjectChain = (typeof PROJECT_CHAINS)[number];

export const DEFAULT_PROJECT_CHAIN: ProjectChain = "robinhood_testnet";

export interface ProjectChainInfo {
  key: ProjectChain;
  /** Testnet chain id, where projects build and tokens launch. */
  chainId: number;
  /** The mainnet the testnet stands in for. */
  mainnetChainId: number;
  /** Name of that mainnet, for notes. */
  mainnetName: string;
  name: string;
  /** Short name for chips and notes. */
  short: string;
  /** The environment row and catalog family that describes the chain itself. */
  family: "robinhood" | "arbitrum";
}

export const PROJECT_CHAIN_INFO: Record<ProjectChain, ProjectChainInfo> = {
  robinhood_testnet: {
    key: "robinhood_testnet",
    chainId: 46630,
    mainnetChainId: 4663,
    mainnetName: "Robinhood Chain",
    name: "Robinhood Chain Testnet",
    short: "Robinhood testnet",
    family: "robinhood",
  },
  arbitrum_sepolia: {
    key: "arbitrum_sepolia",
    chainId: 421614,
    mainnetChainId: 42161,
    mainnetName: "Arbitrum One",
    name: "Arbitrum Sepolia",
    short: "Arbitrum Sepolia",
    family: "arbitrum",
  },
};

export function isProjectChain(v: unknown): v is ProjectChain {
  return PROJECT_CHAINS.includes(v as ProjectChain);
}

/** The chain a document builds on. Absent or unknown reads as Robinhood. */
export function projectChainOf(doc: { chain?: unknown } | null | undefined): ProjectChain {
  return isProjectChain(doc?.chain) ? doc.chain : DEFAULT_PROJECT_CHAIN;
}

export function chainInfo(chain: ProjectChain): ProjectChainInfo {
  return PROJECT_CHAIN_INFO[chain];
}

/** The project chain with this testnet id, or null. */
export function chainByChainId(chainId: number): ProjectChain | null {
  return PROJECT_CHAINS.find((c) => PROJECT_CHAIN_INFO[c].chainId === chainId) ?? null;
}
