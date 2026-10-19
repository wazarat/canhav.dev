import "server-only";

import { LLAMA_CATEGORIES } from "@/content/competitors/llama-categories";
import { type ProjectChain, PROJECT_CHAINS, projectChainOf } from "@/lib/chains";
import { type LlamaProtocol, categoriesFor, fetchLlamaListedAt, fetchLlamaProtocols, pickProtocols } from "@/lib/competitors/llama";
import { COMPETITOR_LIMITS } from "@/lib/competitors/record";
import { getCompetitorSnapshot, getLatestCompetitorSnapshot, snapshotMonth, upsertCompetitorSnapshot } from "@/lib/competitors/snapshots-db";
import type { ProjectDoc } from "@/lib/ideation";
import { buildResourcePack } from "@/lib/kit-pack";

/**
 * The competitor landscape of a project (M115): the DefiLlama protocols
 * in its subsectors' categories on its chain, from this month's snapshot
 * (taken by the cron, or inline once on a cold miss), plus the families
 * its research kit already names.
 */
export interface Landscape {
  categories: string[];
  chain: ProjectChain;
  /** True when the chain had enough rows of its own; false when every chain was used. */
  onChain: boolean;
  month: string;
  rows: LlamaProtocol[];
  /** Protocol families the resource pack names, "In your kit". */
  kitFamilies: string[];
}

/** Listing dates for the largest rows only, which bounds the per-protocol requests. */
const LISTED_AT_ROWS = 12;

/** Take one category's snapshot for one chain this month. Returns the rows. */
export async function refreshCategory(category: string, chain: ProjectChain, all?: LlamaProtocol[]): Promise<LlamaProtocol[]> {
  const protocols = all ?? (await fetchLlamaProtocols());
  const { rows } = pickProtocols(protocols, [category], chain, COMPETITOR_LIMITS.tableRows);
  const withDates = await Promise.all(
    rows.map(async (r, i) => (i < LISTED_AT_ROWS && r.listedAt === null ? { ...r, listedAt: await fetchLlamaListedAt(r.slug) } : r)),
  );
  await upsertCompetitorSnapshot(category, chain, snapshotMonth(), withDates);
  return withDates;
}

/** Every category and chain pair the mapping names, the cron's work list. */
export async function refreshAllCategories(): Promise<{ pairs: number; unknown: string[] }> {
  const all = await fetchLlamaProtocols();
  const known = new Set(all.map((p) => p.category));
  const categories = [...new Set(Object.values(LLAMA_CATEGORIES).flat())];
  const unknown = categories.filter((c) => !known.has(c));
  let pairs = 0;
  for (const category of categories) {
    if (!known.has(category)) continue;
    for (const chain of PROJECT_CHAINS) {
      await refreshCategory(category, chain, all);
      pairs += 1;
    }
  }
  return { pairs, unknown };
}

export async function landscapeFor(doc: ProjectDoc): Promise<Landscape> {
  const chain = projectChainOf(doc);
  const categories = categoriesFor(doc.subsectors ?? []);
  const month = snapshotMonth();
  const merged = new Map<string, LlamaProtocol>();
  let all: LlamaProtocol[] | undefined;
  for (const category of categories) {
    let rows = await getCompetitorSnapshot(category, chain, month);
    if (!rows) {
      const latest = await getLatestCompetitorSnapshot(category, chain);
      if (latest) rows = latest.rows;
      else {
        all = all ?? (await fetchLlamaProtocols());
        rows = await refreshCategory(category, chain, all);
      }
    }
    for (const r of rows) if (!merged.has(r.slug)) merged.set(r.slug, r);
  }
  const rows = [...merged.values()].sort((a, b) => b.tvl - a.tvl).slice(0, COMPETITOR_LIMITS.tableRows);
  const pack = buildResourcePack(doc);
  const kitFamilies = pack ? [...new Set(pack.resources.map((r) => r.familyLabel))] : [];
  const chainName = { robinhood_testnet: "Robinhood Chain", arbitrum_sepolia: "Arbitrum" }[chain];
  const onChain = rows.length > 0 && rows.filter((r) => r.chains.includes(chainName)).length >= 3;
  return { categories, chain, onChain, month, rows, kitFamilies };
}
