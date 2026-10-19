/**
 * Token analytics (M122, Studio+). Pure helpers over the indexer's day rows:
 * a 90 day window filled with empty days, the holder count carried forward
 * across days without a transfer, and the totals the facts line shows.
 * The indexer side lives in indexer/src/analytics.ts.
 */

export const ANALYTICS_DAYS = 90;

/** One UTC day of a token, as the indexer stores it (unix day = seconds / 86400). */
export interface TokenDayRow {
  day: number;
  volumeWei: string;
  trades: number;
  newTraders: number;
  holders: number;
}

export interface TokenStatRow {
  holders: number;
  traders: number;
}

export interface AnalyticsPoint {
  /** ISO date of the UTC day. */
  date: string;
  volumeWei: string;
  trades: number;
  newTraders: number;
  holders: number;
}

export interface TokenAnalytics {
  token: string;
  holders: number;
  traders: number;
  /** Oldest first, one point per day over the window. */
  days: AnalyticsPoint[];
  totals: { volumeWei: string; trades: number; newTraders: number };
  last7: { volumeWei: string; trades: number; newTraders: number };
  /** The holder count this many days ago, for the change line; null when the window has no earlier day. */
  holdersBefore: number | null;
}

export function unixDayOf(ms: number): number {
  return Math.floor(ms / 1000 / 86_400);
}

export function dateOfUnixDay(day: number): string {
  return new Date(day * 86_400 * 1000).toISOString().slice(0, 10);
}

/** Fill the window with the rows that exist, zero elsewhere, holders carried forward. */
export function fillSeries(rows: TokenDayRow[], stat: TokenStatRow | null, today: number, days = ANALYTICS_DAYS): TokenAnalytics["days"] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const first = today - days + 1;
  // Holders before the window: the newest row older than the window, else zero.
  let holders = rows.filter((r) => r.day < first).sort((a, b) => b.day - a.day)[0]?.holders ?? 0;
  const out: AnalyticsPoint[] = [];
  for (let d = first; d <= today; d++) {
    const row = byDay.get(d);
    if (row) holders = row.holders;
    out.push({ date: dateOfUnixDay(d), volumeWei: row?.volumeWei ?? "0", trades: row?.trades ?? 0, newTraders: row?.newTraders ?? 0, holders });
  }
  // The running count is the truth for today when no transfer happened yet.
  if (stat && out.length && !byDay.get(today)) out[out.length - 1] = { ...out[out.length - 1], holders: stat.holders };
  return out;
}

function sum(points: AnalyticsPoint[]) {
  let volume = 0n;
  let trades = 0;
  let newTraders = 0;
  for (const p of points) {
    volume += BigInt(p.volumeWei);
    trades += p.trades;
    newTraders += p.newTraders;
  }
  return { volumeWei: volume.toString(), trades, newTraders };
}

export function buildAnalytics(token: string, rows: TokenDayRow[], stat: TokenStatRow | null, nowMs = Date.now()): TokenAnalytics {
  const today = unixDayOf(nowMs);
  const days = fillSeries(rows, stat, today);
  const holders = stat?.holders ?? days[days.length - 1]?.holders ?? 0;
  const earlier = rows.filter((r) => r.day < today - 7).sort((a, b) => b.day - a.day)[0];
  return {
    token: token.toLowerCase(),
    holders,
    traders: stat?.traders ?? 0,
    days,
    totals: sum(days),
    last7: sum(days.slice(-7)),
    holdersBefore: earlier ? earlier.holders : null,
  };
}

/** "1.24 ETH", "0.0031 ETH" or "0 ETH" from wei, enough digits to read. */
export function formatEthWei(wei: string | bigint): string {
  const v = typeof wei === "bigint" ? wei : BigInt(wei);
  if (v === 0n) return "0 ETH";
  const eth = Number(v) / 1e18;
  const digits = eth >= 100 ? 0 : eth >= 1 ? 2 : eth >= 0.01 ? 4 : 6;
  return `${eth.toLocaleString("en-US", { maximumFractionDigits: digits })} ETH`;
}
