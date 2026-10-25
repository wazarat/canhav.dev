/**
 * The saved Dune queries behind Reachable wallets (M168), one id per query
 * per mainnet, read from the environment: DUNE_QUERY_<name>_<chainId>.
 * The SQL lives in dune/queries; the owner registers each file on Dune
 * and sets its id. Pure, server side.
 */
export const DUNE_QUERY_NAMES = ["subsector_users", "asset_holders", "overlap"] as const;
export type DuneQueryName = (typeof DUNE_QUERY_NAMES)[number];

/** The mainnet chain ids the queries run against. */
export const DUNE_CHAIN_IDS = [4663, 42161] as const;

export function duneQueryId(name: DuneQueryName, mainnetChainId: number): number | null {
  const raw = process.env[`DUNE_QUERY_${name}_${mainnetChainId}`];
  const n = Number(raw ?? "");
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** True when every query of a chain has an id and the API key is set. */
export function duneConfigured(mainnetChainId: number): boolean {
  return Boolean(process.env.DUNE_API_KEY) && DUNE_QUERY_NAMES.every((n) => duneQueryId(n, mainnetChainId) !== null);
}
