import "server-only";

import { LLAMA_CATEGORIES, LLAMA_CHAIN } from "@/content/competitors/llama-categories";
import { SECTOR_OPTIONS, subsectorLabel } from "@/content/ideation";
import { TEMPLATE_CATALOG } from "@/content/templates";
import { type ProjectChain, chainInfo } from "@/lib/chains";
import type { LlamaProtocol } from "@/lib/competitors/llama";
import { getLatestCompetitorSnapshot } from "@/lib/competitors/snapshots-db";
import { getPublishedProjectsOnChain } from "@/lib/ideation-db";
import { effectiveSubsectors } from "@/lib/kits";
import { SECTOR_SUBSECTORS, SECTOR_VALUES, type Sector, type Subsector } from "@/lib/sectors";
import { templateOnChain, templatesForSubsectors } from "@/lib/templates";

/**
 * The gap map (M164, V2): which subsectors already have live protocols on
 * the chain a project chain stands in for, and where nobody is yet. Read
 * from the monthly competitor snapshots (every category of the mapping on
 * both chains, taken by the cron), CanHav's own published projects on the
 * chain and the templates deployed on its mainnet, so the map does not
 * depend on DefiLlama's listing alone. Cached an hour per chain.
 */
export type GapSource = "llama" | "canhav" | "template";

export interface GapName {
  name: string;
  url: string | null;
  source: GapSource;
  /** DefiLlama's TVL on every chain, for the order; null for the other sources. */
  tvl: number | null;
}

export interface GapSubsector {
  subsector: Subsector;
  label: string;
  /** Live protocols on the chain, DefiLlama's count for the categories plus CanHav's records and templates not already named. */
  count: number;
  names: GapName[];
}

export interface GapSector {
  sector: Sector;
  label: string;
  subsectors: GapSubsector[];
}

export interface GapMap {
  chain: ProjectChain;
  /** DefiLlama's name of the mainnet. */
  chainName: string;
  /** The snapshot month the counts come from, the newest across categories. */
  month: string | null;
  /** When the newest snapshot was taken. */
  readAt: string | null;
  sectors: GapSector[];
  /** Subsectors with no live protocol on the chain. */
  open: Subsector[];
}

const TTL_MS = 3_600_000;
const cache = new Map<ProjectChain, { at: number; value: GapMap }>();

const MAX_NAMES = 12;

function sectorLabelOf(sector: Sector): string {
  return SECTOR_OPTIONS.find((o) => o.value === sector)?.label ?? sector;
}

export async function gapMap(chain: ProjectChain): Promise<GapMap> {
  const hit = cache.get(chain);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const chainName = LLAMA_CHAIN[chain];
  const info = chainInfo(chain);
  let month: string | null = null;
  let readAt: string | null = null;

  // DefiLlama per category, read once each.
  const categories = [...new Set(Object.values(LLAMA_CATEGORIES).flat())];
  const byCategory = new Map<string, { rows: LlamaProtocol[]; total: number }>();
  await Promise.all(
    categories.map(async (c) => {
      const snap = await getLatestCompetitorSnapshot(c, chain);
      if (!snap) return;
      byCategory.set(c, { rows: snap.rows.filter((r) => r.chains.includes(chainName)), total: snap.total });
      if (!month || snap.month > month) {
        month = snap.month;
        readAt = snap.fetchedAt;
      }
    }),
  );

  // CanHav's published projects on the chain, by subsector.
  const published = (await getPublishedProjectsOnChain(chain)) ?? [];
  const ours = new Map<Subsector, GapName[]>();
  for (const { row } of published) {
    const doc = row.draft_doc;
    for (const sub of effectiveSubsectors(doc.kit, doc)) {
      const list = ours.get(sub) ?? [];
      list.push({ name: doc.name, url: row.slug ? `/p/${row.slug}` : null, source: "canhav", tvl: null });
      ours.set(sub, list);
    }
  }

  const sectors: GapSector[] = SECTOR_VALUES.map((sector) => ({
    sector,
    label: sectorLabelOf(sector),
    subsectors: SECTOR_SUBSECTORS[sector].map((subsector) => {
      const names: GapName[] = [];
      const seen = new Set<string>();
      let count = 0;
      const slugs = new Set<string>();
      for (const c of LLAMA_CATEGORIES[subsector]) {
        const snap = byCategory.get(c);
        if (!snap) continue;
        // The total counts every protocol of the category on the chain; the rows name the largest.
        count += snap.total;
        for (const r of snap.rows) {
          if (slugs.has(r.slug)) {
            count -= 1;
            continue;
          }
          slugs.add(r.slug);
          seen.add(r.name.toLowerCase());
          names.push({ name: r.name, url: r.url, source: "llama", tvl: r.tvl });
        }
      }
      for (const n of ours.get(subsector) ?? []) {
        if (seen.has(n.name.toLowerCase())) continue;
        seen.add(n.name.toLowerCase());
        names.push(n);
        count += 1;
      }
      for (const t of templatesForSubsectors(TEMPLATE_CATALOG, [subsector], chain)) {
        if (templateOnChain(t, chain).status !== "deployed") continue;
        const key = t.name.toLowerCase();
        if (seen.has(key) || [...seen].some((s) => key.startsWith(s) || s.startsWith(key))) continue;
        seen.add(key);
        names.push({ name: t.name, url: t.docsUrl ?? t.repoUrl, source: "template", tvl: null });
        count += 1;
      }
      names.sort((a, b) => (b.tvl ?? -1) - (a.tvl ?? -1));
      return { subsector, label: subsectorLabel(subsector), count: Math.max(count, names.length), names: names.slice(0, MAX_NAMES) };
    }),
  }));
  const open = sectors.flatMap((s) => s.subsectors.filter((x) => x.count === 0).map((x) => x.subsector));
  const value: GapMap = { chain, chainName: info.mainnetName, month, readAt, sectors, open };
  cache.set(chain, { at: Date.now(), value });
  return value;
}

/** Forget the cached maps, after a refresh. */
export function clearGapCache(): void {
  cache.clear();
}
