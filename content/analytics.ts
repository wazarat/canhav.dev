/**
 * Robinhood Chain analytics config: where each metric comes from, how to
 * read it, and a committed snapshot used when a live fetch is unavailable.
 *
 * Providers:
 * - "dune":              official Dune API, latest results of a PUBLIC query.
 *                        (Entropy Advisors' dashboard queries are private —
 *                        visible on dune.com but not readable via the API —
 *                        so we use public community queries instead.)
 * - "llama-chain-tvl":   DefiLlama chain TVL history (free, keyless).
 * - "llama-stablecoins": DefiLlama stablecoin circulating supply history.
 * - "snapshot":          no public live source; committed value below.
 */

export const DUNE_DASHBOARD_URL =
  "https://dune.com/entropy_advisors/robinhood-chain-network-overview";

export const LLAMA_CHAIN_SLUG = "Robinhood Chain";

export type MetricProvider = "dune" | "llama-chain-tvl" | "llama-stablecoins" | "snapshot";

export interface StatQueryConfig {
  id: string;
  label: string;
  hint: string;
  provider: MetricProvider;
  /** Dune-only fields. */
  queryId?: number;
  valueColumns?: string[];
}

export interface ChartQueryConfig {
  id: string;
  label: string;
  description: string;
  unit: "usd" | "count";
  provider: MetricProvider;
  queryId?: number;
  dateColumns?: string[];
  valueColumns?: string[];
}

/** The four headline counters. */
export const STAT_QUERIES: StatQueryConfig[] = [
  {
    id: "asset-market-cap",
    label: "Total asset market cap",
    hint: "All onchain assets",
    // Entropy's asset-landscape query (7741713) is private; no public equivalent yet.
    provider: "snapshot",
  },
  {
    id: "stablecoin-market-cap",
    label: "Stablecoin market cap",
    hint: "Circulating on Robinhood Chain",
    provider: "llama-stablecoins",
  },
  {
    id: "rwa-tokenized-value",
    label: "Total tokenized value",
    hint: "Real-world assets",
    // Entropy's RWA query (7741618) is private; no public equivalent yet.
    provider: "snapshot",
  },
  {
    id: "protocol-tvl",
    label: "Protocol TVL",
    hint: "Across Robinhood Chain protocols",
    provider: "llama-chain-tvl",
  },
];

/** Time-series charts, driven by the global 24h / All-time toggle. */
export const CHART_QUERIES: ChartQueryConfig[] = [
  {
    id: "transactions",
    label: "Transactions",
    description: "Daily transactions on Robinhood Chain.",
    unit: "count",
    provider: "dune",
    // "Robinhood Chain Core Metrics - Daily" by @2on4 — public query.
    queryId: 7970045,
    dateColumns: ["block_date", "day", "date", "time", "dt"],
    valueColumns: ["tx_count", "transactions", "txs", "num_txs", "transaction_count"],
  },
  {
    id: "chain-tvl",
    label: "Protocol TVL",
    description: "Value locked across Robinhood Chain protocols.",
    unit: "usd",
    provider: "llama-chain-tvl",
  },
];

/**
 * Last-known values, captured from the public Entropy Advisors dashboard.
 * Used for "snapshot" metrics and as fallback when live fetches fail; the
 * footnote in the UI discloses which figures are periodic snapshots.
 */
export const SNAPSHOT_DATE = "2026-07-31";

export const FALLBACK_STATS: Record<string, number> = {
  "asset-market-cap": 866_470_000,
  "stablecoin-market-cap": 523_730_000,
  "rwa-tokenized-value": 27_060_000,
  "protocol-tvl": 666_350_000,
};

/**
 * No committed series for the charts — when live data is unavailable the
 * chart cards render an "unavailable" state rather than invented history.
 */
export const FALLBACK_SERIES: Record<string, Array<{ date: string; value: number }>> = {
  transactions: [],
  "chain-tvl": [],
};
