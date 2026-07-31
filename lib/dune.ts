import "server-only";

import {
  CHART_QUERIES,
  FALLBACK_SERIES,
  FALLBACK_STATS,
  SNAPSHOT_DATE,
  STAT_QUERIES,
  type ChartQueryConfig,
  type StatQueryConfig,
} from "@/content/analytics";
import { formatUsdCompact } from "@/lib/format";

/** One revalidation per hour keeps Dune credit usage tiny regardless of traffic. */
const REVALIDATE_SECONDS = 3600;
const DUNE_API_BASE = "https://api.dune.com/api/v1";

export interface StatMetric {
  id: string;
  label: string;
  hint: string;
  value: number;
  formatted: string;
  asOf: string;
  source: "dune" | "snapshot";
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
  source: "dune" | "snapshot";
}

export interface AnalyticsData {
  stats: StatMetric[];
  charts: ChartMetric[];
  /** Latest Dune execution timestamp across live fetches; null if fully degraded. */
  updatedAt: string | null;
  degraded: boolean;
}

interface DuneResult {
  rows: Array<Record<string, unknown>>;
  executionEndedAt: string;
}

async function fetchDuneResults(queryId: number, limit: number): Promise<DuneResult> {
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
  return { rows, executionEndedAt: json.execution_ended_at ?? new Date().toISOString() };
}

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
  // Fall back to any column whose value parses as a date.
  for (const [col, raw] of Object.entries(row)) {
    if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) return col;
  }
  return null;
}

function toDayString(raw: unknown): string {
  return String(raw).slice(0, 10);
}

/** Weekly buckets (last point of each ISO week) capped to ~90 points. */
function downsample(points: SeriesPoint[], maxPoints = 90): SeriesPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const out: SeriesPoint[] = [];
  for (let i = points.length - 1; i >= 0; i -= step) out.push(points[i]);
  return out.reverse();
}

function normalizeSeries(rows: Array<Record<string, unknown>>, config: ChartQueryConfig): SeriesPoint[] {
  const dateCol = pickDateColumn(rows[0], config.dateColumns);
  if (!dateCol) throw new Error(`Dune query ${config.queryId}: no date column found`);

  const byDay = new Map<string, number>();
  for (const row of rows) {
    const value = pickNumber(row, config.valueColumns);
    if (value === null) continue;
    byDay.set(toDayString(row[dateCol]), value);
  }
  if (byDay.size === 0) {
    throw new Error(`Dune query ${config.queryId}: no matching value column`);
  }

  const points = [...byDay.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Drop the partial current UTC day so the latest bar is a completed day.
  const today = new Date().toISOString().slice(0, 10);
  if (points.length > 1 && points[points.length - 1].date === today) points.pop();
  return points;
}

function statFromSnapshot(config: StatQueryConfig): StatMetric {
  const value = FALLBACK_STATS[config.id] ?? 0;
  return {
    id: config.id,
    label: config.label,
    hint: config.hint,
    value,
    formatted: formatUsdCompact(value),
    asOf: SNAPSHOT_DATE,
    source: "snapshot",
  };
}

function chartFromSnapshot(config: ChartQueryConfig): ChartMetric {
  const series = FALLBACK_SERIES[config.id] ?? [];
  const latest = series.length > 0 ? series[series.length - 1].value : 0;
  return {
    id: config.id,
    label: config.label,
    description: config.description,
    unit: config.unit,
    latest,
    change24hPct: null,
    daily14: series.slice(-14),
    allTime: series,
    asOf: SNAPSHOT_DATE,
    source: "snapshot",
  };
}

async function fetchStat(config: StatQueryConfig): Promise<StatMetric> {
  // Counter widgets read from the first row; a small page is plenty.
  const { rows, executionEndedAt } = await fetchDuneResults(config.queryId, 10);
  const value = pickNumber(rows[0], config.valueColumns) ?? pickNumber(rows[rows.length - 1], config.valueColumns);
  if (value === null) throw new Error(`Dune query ${config.queryId}: no matching stat column`);
  return {
    id: config.id,
    label: config.label,
    hint: config.hint,
    value,
    formatted: formatUsdCompact(value),
    asOf: executionEndedAt,
    source: "dune",
  };
}

async function fetchChart(config: ChartQueryConfig): Promise<ChartMetric> {
  const { rows, executionEndedAt } = await fetchDuneResults(config.queryId, 1000);
  const points = normalizeSeries(rows, config);
  const latest = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : null;
  const change24hPct = prev && prev.value !== 0 ? ((latest.value - prev.value) / prev.value) * 100 : null;
  return {
    id: config.id,
    label: config.label,
    description: config.description,
    unit: config.unit,
    latest: latest.value,
    change24hPct,
    daily14: points.slice(-14),
    allTime: downsample(points),
    asOf: executionEndedAt,
    source: "dune",
  };
}

/**
 * Fetches all analytics in parallel. Never throws: each metric that fails
 * falls back to the committed snapshot individually.
 */
export async function getAnalytics(): Promise<AnalyticsData> {
  const hasKey = Boolean(process.env.DUNE_API_KEY);

  const statResults = await Promise.allSettled(
    STAT_QUERIES.map((config) => (hasKey ? fetchStat(config) : Promise.reject(new Error("no key")))),
  );
  const chartResults = await Promise.allSettled(
    CHART_QUERIES.map((config) => (hasKey ? fetchChart(config) : Promise.reject(new Error("no key")))),
  );

  const stats = statResults.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    if (hasKey) console.warn(`[analytics] stat ${STAT_QUERIES[i].queryId} fell back to snapshot:`, result.reason);
    return statFromSnapshot(STAT_QUERIES[i]);
  });
  const charts = chartResults.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    if (hasKey) console.warn(`[analytics] chart ${CHART_QUERIES[i].queryId} fell back to snapshot:`, result.reason);
    return chartFromSnapshot(CHART_QUERIES[i]);
  });

  const liveTimestamps = [...stats, ...charts]
    .filter((m) => m.source === "dune")
    .map((m) => m.asOf)
    .sort();
  const updatedAt = liveTimestamps.length > 0 ? liveTimestamps[liveTimestamps.length - 1] : null;

  return {
    stats,
    charts,
    updatedAt,
    degraded: [...stats, ...charts].some((m) => m.source === "snapshot"),
  };
}
