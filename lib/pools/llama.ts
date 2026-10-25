import "server-only";

import { LLAMA_CHAIN } from "@/content/competitors/llama-categories";
import { PROJECT_CHAINS, type ProjectChain } from "@/lib/chains";
import { getPoolSnapshot, upsertPoolSnapshot } from "@/lib/pools/snapshots-db";
import type { Liquidity } from "@/lib/viability/dependencies";

/**
 * DefiLlama's pools on the mainnet a project chain stands in for (M162).
 * One daily snapshot per chain in Neon beside the competitor snapshots,
 * taken lazily on the first read of a day since the feed is one 10 MB
 * document for every chain; the dependency check sums liquidity per
 * asset from it and the unit economics read rates from it. Keyless.
 * Nothing here throws: a failed fetch answers the newest snapshot, else
 * an empty list.
 */
export interface LlamaPool {
  /** DefiLlama's pool id, a contract address for many venues, an opaque id for others. */
  pool: string;
  /** The project slug, morpho-blue, spark-savings. */
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  /** Token addresses, lowercased, as the feed gives them. */
  underlyingTokens: string[];
  volumeUsd1d: number | null;
  /** Lending pools only (M167): the base borrow rate and the two sides of the market. */
  apyBaseBorrow?: number | null;
  totalSupplyUsd?: number | null;
  totalBorrowUsd?: number | null;
}

export interface PoolsRead {
  chain: ProjectChain;
  /** DefiLlama's name of the mainnet. */
  chainName: string;
  rows: LlamaPool[];
  /** ISO time the rows were read from DefiLlama. */
  readAt: string;
}

const POOLS_URL = "https://yields.llama.fi/pools";
/** The lending side of the same pools (M167), keyed by pool id: the base borrow rate and the two sides of the market. */
const LEND_BORROW_URL = "https://yields.llama.fi/lendBorrow";
let inflight: Promise<Record<ProjectChain, LlamaPool[]> | null> | null = null;

interface RawPool {
  pool?: string;
  project?: string;
  symbol?: string;
  chain?: string;
  tvlUsd?: number | null;
  apy?: number | null;
  apyBase?: number | null;
  apyReward?: number | null;
  underlyingTokens?: string[] | null;
  volumeUsd1d?: number | null;
  apyBaseBorrow?: number | null;
  totalSupplyUsd?: number | null;
  totalBorrowUsd?: number | null;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The feed read once and split by project chain. One read is shared between concurrent callers. */
async function fetchAllPools(): Promise<Record<ProjectChain, LlamaPool[]> | null> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [res, lendRes] = await Promise.all([fetch(POOLS_URL, { cache: "no-store" }), fetch(LEND_BORROW_URL, { cache: "no-store" }).catch(() => null)]);
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: RawPool[] };
      // The lending fields ride along by pool id; a failed lendBorrow read leaves them out.
      const lend = new Map<string, RawPool>();
      if (lendRes?.ok) {
        const rows = (await lendRes.json().catch(() => [])) as RawPool[] | { data?: RawPool[] };
        for (const r of Array.isArray(rows) ? rows : (rows.data ?? [])) if (r.pool) lend.set(r.pool, r);
      }
      const out = Object.fromEntries(PROJECT_CHAINS.map((c) => [c, [] as LlamaPool[]])) as Record<ProjectChain, LlamaPool[]>;
      for (const p of json.data ?? []) {
        if (!p.pool || !p.project || typeof p.tvlUsd !== "number") continue;
        const chain = PROJECT_CHAINS.find((c) => LLAMA_CHAIN[c] === p.chain);
        if (!chain) continue;
        out[chain].push({
          pool: p.pool,
          project: p.project,
          symbol: p.symbol ?? "",
          tvlUsd: p.tvlUsd,
          apy: num(p.apy),
          apyBase: num(p.apyBase),
          apyReward: num(p.apyReward),
          underlyingTokens: Array.isArray(p.underlyingTokens) ? p.underlyingTokens.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase()) : [],
          volumeUsd1d: num(p.volumeUsd1d),
          ...(num(lend.get(p.pool)?.apyBaseBorrow) !== null ? { apyBaseBorrow: num(lend.get(p.pool)?.apyBaseBorrow) } : {}),
          ...(num(lend.get(p.pool)?.totalSupplyUsd) !== null ? { totalSupplyUsd: num(lend.get(p.pool)?.totalSupplyUsd) } : {}),
          ...(num(lend.get(p.pool)?.totalBorrowUsd) !== null ? { totalBorrowUsd: num(lend.get(p.pool)?.totalBorrowUsd) } : {}),
        });
      }
      for (const c of PROJECT_CHAINS) out[c].sort((a, b) => b.tvlUsd - a.tvlUsd);
      return out;
    } catch (err) {
      console.warn("[pools] fetch failed", err);
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Today as the snapshot day, UTC. */
export function poolsDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Today's pools for a chain, read from the snapshot or taken now and
 * stored for every chain at once. `refresh` takes a new snapshot even
 * when today's exists (the Check again link).
 */
export async function poolsFor(chain: ProjectChain, opts: { refresh?: boolean } = {}): Promise<PoolsRead> {
  const day = poolsDay();
  const chainName = LLAMA_CHAIN[chain];
  if (!opts.refresh) {
    const hit = await getPoolSnapshot(chain, day);
    if (hit) return { chain, chainName, rows: hit.rows, readAt: hit.fetchedAt };
  }
  const all = await fetchAllPools();
  if (all) {
    const readAt = new Date().toISOString();
    await Promise.all(PROJECT_CHAINS.map((c) => upsertPoolSnapshot(c, day, all[c], readAt)));
    return { chain, chainName, rows: all[chain], readAt };
  }
  const latest = await getPoolSnapshot(chain, null);
  return latest ? { chain, chainName, rows: latest.rows, readAt: latest.fetchedAt } : { chain, chainName, rows: [], readAt: new Date().toISOString() };
}

export type { Liquidity } from "@/lib/viability/dependencies";

/** The symbols a pool's own symbol names, "WETH-USDG" reads WETH and USDG, "STEAKUSDG" reads itself. */
function poolSymbols(symbol: string): string[] {
  return symbol.toUpperCase().split(/[-/ ]+/).filter(Boolean);
}

/**
 * Liquidity for one asset: every pool whose underlying tokens hold its
 * address, or whose symbol names it when no address is known. Null when
 * no pool holds it.
 */
export function liquidityFor(asset: { symbol: string; address?: string }, rows: readonly LlamaPool[]): Liquidity | null {
  const address = asset.address?.toLowerCase();
  const symbol = asset.symbol.toUpperCase();
  const hits = rows.filter((p) => (address ? p.underlyingTokens.includes(address) : poolSymbols(p.symbol).includes(symbol)));
  if (!hits.length) return null;
  return {
    usd: hits.reduce((s, p) => s + p.tvlUsd, 0),
    pools: hits.length,
    top: hits.slice(0, 3).map((p) => ({ project: p.project, symbol: p.symbol, tvlUsd: p.tvlUsd })),
  };
}
