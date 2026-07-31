import "server-only";

import {
  CHART_QUERIES,
  FALLBACK_SERIES,
  FALLBACK_STATS,
  LLAMA_CHAIN_SLUG,
  SNAPSHOT_DATE,
  STAT_QUERIES,
  type ChartQueryConfig,
  type StatQueryConfig,
} from "@/content/analytics";
import { formatUsdCompact } from "@/lib/format";

/** One revalidation per hour keeps upstream usage tiny regardless of traffic. */
const REVALIDATE_SECONDS = 3600;
const DUNE_API_BASE = "https://api.dune.com/api/v1";

export interface StatMetric {
  id: string;
  label: string;
  hint: string;
  value: number;
  formatted: string;
  /** % change vs prior day; null when no time series backs the value. */
  change24hPct: number | null;
  asOf: string;
  source: "live" | "snapshot";
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface ChartMetric {
  id: string;
  label: string;
  description: string;
  unit: "usd" | "count";
  latest: number;
  change24hPct: number | null;
  daily14: SeriesPoint[];
  allTime: SeriesPoint[];
  asOf: string;
  source: "live" | "snapshot";
}

export interface AnalyticsData {
  stats: StatMetric[];
  charts: ChartMetric[];
  /** Latest upstream timestamp across live fetches; null if fully degraded. */
  updatedAt: string | null;
  degraded: boolean;
}

// ---------------------------------------------------------------------------
// Upstream fetchers
// ---------------------------------------------------------------------------

async function fetchDuneRows(queryId: number, limit: number) {
  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey) throw new Error("DUNE_API_KEY is not set");

  const res = await fetch(`${DUNE_API_BASE}/query/${queryId}/results?limit=${limit}`, {
    headers: { "X-Dune-API-Key": apiKey },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`Dune query ${queryId} responded ${res.status}`);

  const json = (await res.json()) as {
    execution_ended_at?: string;
    result?: { rows?: Array<Record<string, unknown>> };
  };
  const rows = json.result?.rows;
  if (!rows || rows.length === 0) throw new Error(`Dune query ${queryId} returned no rows`);
  return { rows, asOf: json.execution_ended_at ?? new Date().toISOString() };
}

/** DefiLlama chain TVL history: [{date: unixSeconds, tvl}] */
async function fetchLlamaChainTvl(): Promise<{ points: SeriesPoint[]; asOf: string }> {
  const res = await fetch(
    `https://api.llama.fi/v2/historicalChainTvl/${encodeURIComponent(LLAMA_CHAIN_SLUG)}`,
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
  if (!res.ok) throw new Error(`DefiLlama chain TVL responded ${res.status}`);
  const json = (await res.json()) as Array<{ date: number; tvl: number }>;
  const points = json
    .filter((p) => Number.isFinite(p.tvl))
    .map((p) => ({ date: new Date(p.date * 1000).toISOString().slice(0, 10), value: p.tvl }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (points.length === 0) throw new Error("DefiLlama chain TVL returned no points");
  return { points, asOf: new Date().toISOString() };
}

/** DefiLlama stablecoin circulating history for the chain. */
async function fetchLlamaStablecoins(): Promise<{ points: SeriesPoint[]; asOf: string }> {
  const res = await fetch(
    `https://stablecoins.llama.fi/stablecoincharts/${encodeURIComponent(LLAMA_CHAIN_SLUG)}`,
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
  if (!res.ok) throw new Error(`DefiLlama stablecoins responded ${res.status}`);
  const json = (await res.json()) as Array<{
    date: string | number;
    totalCirculatingUSD?: { peggedUSD?: number };
  }>;
  const points = json
    .map((p) => ({
      date: new Date(Number(p.date) * 1000).toISOString().slice(0, 10),
      value: p.totalCirculatingUSD?.peggedUSD,
    }))
    .filter((p): p is SeriesPoint => Number.isFinite(p.value))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (points.length === 0) throw new Error("DefiLlama stablecoins returned no points");
  return { points, asOf: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function pickNumber(row: Record<string, unknown>, candidates: string[]): number | null {
  for (const col of candidates) {
    const raw = row[col];
    if (raw === undefined || raw === null) continue;
    const num = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function pickDateColumn(row: Record<string, unknown>, candidates: string[]): string | null {
  for (const col of candidates) {
    const raw = row[col];
    if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) return col;
  }
  for (const [col, raw] of Object.entries(row)) {
    if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) return col;
  }
  return null;
}

function duneRowsToSeries(rows: Array<Record<string, unknown>>, config: ChartQueryConfig): SeriesPoint[] {
  const dateCol = pickDateColumn(rows[0], config.dateColumns ?? []);
  if (!dateCol) throw new Error(`Dune query ${config.queryId}: no date column found`);

  const byDay = new Map<string, number>();
  for (const row of rows) {
    const value = pickNumber(row, config.valueColumns ?? []);
    if (value === null) continue;
    byDay.set(String(row[dateCol]).slice(0, 10), value);
  }
  if (byDay.size === 0) throw new Error(`Dune query ${config.queryId}: no matching value column`);

  return [...byDay.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Drop the partial current UTC day so the latest bar is a completed day. */
function dropPartialToday(points: SeriesPoint[]): SeriesPoint[] {
  const today = new Date().toISOString().slice(0, 10);
  if (points.length > 1 && points[points.length - 1].date === today) return points.slice(0, -1);
  return points;
}

/** Evenly thin long series to ~90 points for the all-time view. */
function downsample(points: SeriesPoint[], maxPoints = 90): SeriesPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const out: SeriesPoint[] = [];
  for (let i = points.length - 1; i >= 0; i -= step) out.push(points[i]);
  return out.reverse();
}

function deltaPct(points: SeriesPoint[]): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1].value;
  const prev = points[points.length - 2].value;
  return prev !== 0 ? ((last - prev) / prev) * 100 : null;
}

// ---------------------------------------------------------------------------
// Metric builders
// ---------------------------------------------------------------------------

function statFromSeries(config: StatQueryConfig, points: SeriesPoint[], asOf: string): StatMetric {
  const value = points[points.length - 1].value;
  return {
    id: config.id,
    label: config.label,
    hint: config.hint,
    value,
    formatted: formatUsdCompact(value),
    change24hPct: deltaPct(points),
    asOf,
    source: "live",
  };
}

function statFromSnapshot(config: StatQueryConfig): StatMetric {
  const value = FALLBACK_STATS[config.id] ?? 0;
  return {
    id: config.id,
    label: config.label,
    hint: config.hint,
    value,
    formatted: formatUsdCompact(value),
    change24hPct: null,
    asOf: SNAPSHOT_DATE,
    source: "snapshot",
  };
}

function chartFromSeries(config: ChartQueryConfig, points: SeriesPoint[], asOf: string): ChartMetric {
  const completed = dropPartialToday(points);
  const latest = completed[completed.length - 1];
  return {
    id: config.id,
    label: config.label,
    description: config.description,
    unit: config.unit,
    latest: latest.value,
    change24hPct: deltaPct(completed),
    daily14: completed.slice(-14),
    allTime: downsample(completed),
    asOf,
    source: "live",
  };
}

function chartFromSnapshot(config: ChartQueryConfig): ChartMetric {
  const series = FALLBACK_SERIES[config.id] ?? [];
  return {
    id: config.id,
    label: config.label,
    description: config.description,
    unit: config.unit,
    latest: series.length > 0 ? series[series.length - 1].value : 0,
    change24hPct: null,
    daily14: series.slice(-14),
    allTime: series,
    asOf: SNAPSHOT_DATE,
    source: "snapshot",
  };
}

async function seriesForProvider(config: StatQueryConfig | ChartQueryConfig): Promise<{ points: SeriesPoint[]; asOf: string }> {
  switch (config.provider) {
    case "llama-chain-tvl":
      return fetchLlamaChainTvl();
    case "llama-stablecoins":
      return fetchLlamaStablecoins();
    case "dune": {
      if (!config.queryId) throw new Error(`${config.id}: dune provider requires queryId`);
      const { rows, asOf } = await fetchDuneRows(config.queryId, 1000);
      return { points: duneRowsToSeries(rows, config as ChartQueryConfig), asOf };
    }
    case "snapshot":
      throw new Error("snapshot provider has no live series");
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches all analytics in parallel. Never throws: each metric that fails
 * falls back to the committed snapshot individually.
 */
export async function getAnalytics(): Promise<AnalyticsData> {
  const statResults = await Promise.allSettled(
    STAT_QUERIES.map(async (config) => {
      const { points, asOf } = await seriesForProvider(config);
      return statFromSeries(config, points, asOf);
    }),
  );
  const chartResults = await Promise.allSettled(
    CHART_QUERIES.map(async (config) => {
      const { points, asOf } = await seriesForProvider(config);
      return chartFromSeries(config, points, asOf);
    }),
  );

  const stats = statResults.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    if (STAT_QUERIES[i].provider !== "snapshot") {
      console.warn(`[analytics] stat "${STAT_QUERIES[i].id}" fell back to snapshot:`, result.reason);
    }
    return statFromSnapshot(STAT_QUERIES[i]);
  });
  const charts = chartResults.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    if (CHART_QUERIES[i].provider !== "snapshot") {
      console.warn(`[analytics] chart "${CHART_QUERIES[i].id}" fell back to snapshot:`, result.reason);
    }
    return chartFromSnapshot(CHART_QUERIES[i]);
  });

  const liveTimestamps = [...stats, ...charts]
    .filter((m) => m.source === "live")
    .map((m) => m.asOf)
    .sort();

  return {
    stats,
    charts,
    updatedAt: liveTimestamps.length > 0 ? liveTimestamps[liveTimestamps.length - 1] : null,
    degraded: [...stats, ...charts].some((m) => m.source === "snapshot"),
  };
}
