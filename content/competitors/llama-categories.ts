import type { ProjectChain } from "@/lib/chains";
import type { Subsector } from "@/lib/sectors";

/**
 * How CanHav's subsectors map to DefiLlama's protocol categories (M114,
 * M115), and the project chains to DefiLlama chain names. Categories are
 * DefiLlama's own strings and drift now and then; the competitor cron
 * logs the ones it no longer finds.
 */
export const LLAMA_CATEGORIES: Record<Subsector, readonly string[]> = {
  lending: ["Lending"],
  leveraged_yield: ["Leveraged Farming", "Yield"],
  fixed_income: ["Yield", "Basis Trading"],
  vaults: ["Yield Aggregator"],
  pools: ["Dexs", "Liquidity manager"],
  perp_dex: ["Derivatives"],
  option_vaults: ["Options Vault", "Options"],
  delta_neutral: ["Basis Trading", "Yield"],
  liquid_staking: ["Liquid Staking"],
  restaking: ["Restaking"],
  liquid_restaking: ["Liquid Restaking"],
  tokenized_securities: ["RWA"],
  private_credit: ["RWA Lending", "RWA"],
  asset_backed_tokens: ["RWA"],
  underwriting: ["Insurance"],
  governance: [],
};

/** DefiLlama's chain names for the mainnets the project chains stand in for. */
export const LLAMA_CHAIN: Record<ProjectChain, string> = {
  robinhood_testnet: "Robinhood Chain",
  arbitrum_sepolia: "Arbitrum",
};

/** Rows wanted before the chain filter falls back to every chain. */
export const LLAMA_MIN_ROWS = 3;
