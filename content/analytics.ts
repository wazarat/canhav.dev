/**
 * Robinhood Chain analytics config: which Dune queries power the section,
 * how to read their columns, and a committed snapshot used when the live
 * fetch is unavailable (missing key, credit exhaustion, upstream failure).
 *
 * Queries are public ones from Entropy Advisors' dashboard:
 * https://dune.com/entropy_advisors/robinhood-chain-network-overview
 */

export const DUNE_DASHBOARD_URL =
  "https://dune.com/entropy_advisors/robinhood-chain-network-overview";

export interface StatQueryConfig {
  id: string;
  label: string;
  hint: string;
  queryId: number;
  /** Candidate column names, first match wins (upstream may rename). */
  valueColumns: string[];
}

export interface ChartQueryConfig {
  id: string;
  label: string;
  description: string;
  unit: "usd" | "count";
  queryId: number;
  dateColumns: string[];
  valueColumns: string[];
}

/** The four headline counters, mirroring the dashboard's top row. */
export const STAT_QUERIES: StatQueryConfig[] = [
  {
    id: "asset-market-cap",
    label: "Total asset market cap",
    hint: "All onchain assets",
    queryId: 7741713,
    valueColumns: ["market_cap_counter", "total_market_cap", "market_cap"],
  },
  {
    id: "stablecoin-market-cap",
    label: "Stablecoin market cap",
    hint: "Circulating on Robinhood Chain",
    queryId: 7739347,
    valueColumns: ["total_market_cap", "stablecoin_market_cap", "market_cap"],
  },
  {
    id: "rwa-tokenized-value",
    label: "Total tokenized value",
    hint: "Real-world assets",
    queryId: 7741618,
    valueColumns: ["total_market_cap_counter", "total_market_cap", "tokenized_value"],
  },
  {
    id: "protocol-tvl",
    label: "Protocol TVL",
    hint: "Excludes stablecoin market cap",
    queryId: 7751086,
    valueColumns: ["chain_tvl", "protocol_tvl", "tvl"],
  },
];

/** Time-series charts. Prefer a canonical-bridge column when the query has one. */
export const CHART_QUERIES: ChartQueryConfig[] = [
  {
    id: "transactions",
    label: "Transactions",
    description: "Daily transactions on Robinhood Chain.",
    unit: "count",
    queryId: 7683036,
    dateColumns: ["day", "date", "block_date", "time", "dt"],
    valueColumns: ["transactions", "tx_count", "txs", "num_txs", "transaction_count", "daily_transactions"],
  },
  {
    id: "bridge-tvl",
    label: "Protocol TVL",
    description: "Value locked across Robinhood Chain protocols.",
    unit: "usd",
    queryId: 7751086,
    dateColumns: ["day", "date", "block_date", "time", "dt"],
    valueColumns: ["canonical_bridge_tvl", "bridge_tvl", "chain_tvl", "protocol_tvl", "tvl"],
  },
];

/**
 * Last-known values, hand-captured from the public dashboard. Used only when
 * the live Dune fetch is unavailable; the "Snapshot as of" hint makes the
 * staleness visible. Refresh by updating the numbers and SNAPSHOT_DATE.
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
  "bridge-tvl": [],
};
