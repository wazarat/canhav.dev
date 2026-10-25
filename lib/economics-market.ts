import "server-only";

import { categoriesFor } from "@/lib/competitors/llama";
import { getLatestCompetitorSnapshot } from "@/lib/competitors/snapshots-db";
import { type EconomicsFamily, type EconSource, type EconValues } from "@/lib/economics";
import { type ProjectChain } from "@/lib/chains";
import { type LlamaPool, poolsFor } from "@/lib/pools/llama";
import type { Subsector } from "@/lib/sectors";

/**
 * Fill from market (M167): rates read from DefiLlama's pools snapshot for
 * the subsector's projects on the chain's mainnet. The median base yield
 * fills the yield or reward rate, the median base borrow rate and the
 * borrowed over supplied share fill a lending model, the median daily
 * volume over liquidity fills a pools model. Fee tiers, reserve factors
 * and costs are never filled; they are the team's. Each value comes back
 * with its source and read date.
 */
export interface MarketFill {
  values: EconValues;
  sources: Record<string, EconSource>;
  /** How many pools the medians were read over. */
  pools: number;
  readAt: string;
}

function median(nums: number[]): number | null {
  const v = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const round = (n: number, places = 2) => Number(n.toFixed(places));

export async function marketFill(family: EconomicsFamily, subsectors: readonly Subsector[], chain: ProjectChain): Promise<MarketFill> {
  const pools = await poolsFor(chain);
  // The subsector's projects, from the competitor snapshots' slugs; every pool on the chain when the snapshots name none.
  const slugs = new Set<string>();
  for (const c of categoriesFor(subsectors)) {
    const snap = await getLatestCompetitorSnapshot(c, chain);
    for (const r of snap?.rows ?? []) slugs.add(r.slug);
  }
  const all = pools.rows.filter((p) => p.tvlUsd > 0);
  const ours = all.filter((p) => slugs.has(p.project));
  const source: EconSource = { source: "DefiLlama", readAt: pools.readAt };
  const values: EconValues = {};
  const sources: Record<string, EconSource> = {};
  let used = 0;
  // A metric is read over the subsector's pools that carry it, else over every pool on the chain that does; a zero is not a market rate.
  const read = (key: string, pick: (p: LlamaPool) => number | null | undefined, places = 2) => {
    const of = (rows: LlamaPool[]) => rows.map(pick).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0);
    let nums = of(ours);
    if (nums.length < 3) nums = of(all);
    const m = median(nums);
    if (m === null) return;
    values[key] = round(m, places);
    sources[key] = source;
    used = Math.max(used, nums.length);
  };
  const ratio = (a: number | null | undefined, b: number | null | undefined) => (typeof a === "number" && typeof b === "number" && b > 0 ? (100 * a) / b : null);
  switch (family) {
    case "lending":
      read("borrowRatePct", (p) => p.apyBaseBorrow);
      read("utilizationPct", (p) => ratio(p.totalBorrowUsd, p.totalSupplyUsd));
      break;
    case "vaults":
      read("strategyYieldPct", (p) => p.apyBase);
      break;
    case "staking":
      read("rewardRatePct", (p) => p.apyBase);
      break;
    case "pools":
      read("volumeToTvlPct", (p) => ratio(p.volumeUsd1d, p.tvlUsd));
      break;
    case "rwa":
      read("feeRateAumPct", (p) => (typeof p.apyBase === "number" ? Math.min(p.apyBase, 5) : null));
      break;
    default:
      break;
  }
  return { values, sources, pools: used, readAt: pools.readAt };
}
