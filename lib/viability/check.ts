import "server-only";

import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import { ORACLES_CHECKED_ON } from "@/content/chains/oracles";
import type { AssetEntry } from "@/lib/assets";
import { projectChainOf } from "@/lib/chains";
import { type ProjectDoc, testnetContractRows } from "@/lib/ideation";
import { kitShapes } from "@/lib/kits";
import { liquidityFor, poolsFor } from "@/lib/pools/llama";
import { type DependencyRow, type DependencySummary, type Liquidity, dependencySummary, resolveDependencies } from "@/lib/viability/dependencies";
import { acceptedTemplates } from "@/lib/viability/static";

export interface DependencyCheck {
  rows: DependencyRow[];
  summary: DependencySummary;
  /** When this check ran. */
  readAt: string;
  /** When the pools snapshot was read from DefiLlama. */
  poolsReadAt: string;
  oraclesCheckedOn: string;
}

/**
 * The full dependency check of a project (M163): the pure resolver over
 * the kit environment, the accepted templates, Decisions, the assets and
 * the daily pools snapshot. `assets` overrides the stored list so the
 * studio can check what is on screen before the autosave lands; `refresh`
 * takes a new pools snapshot.
 */
export async function dependencyCheck(doc: ProjectDoc, opts: { refresh?: boolean; assets?: readonly AssetEntry[] } = {}): Promise<DependencyCheck> {
  const chain = projectChainOf(doc);
  const assets = opts.assets ?? doc.assets ?? [];
  const pools = await poolsFor(chain, { refresh: opts.refresh });
  const byAsset: Record<string, Liquidity | null> = {};
  for (const a of assets) byAsset[a.id] = liquidityFor(a, pools.rows);
  const rows = resolveDependencies({
    chain,
    shapes: kitShapes(doc.kit),
    environment: KIT_ENVIRONMENTS[chain],
    templates: acceptedTemplates(doc),
    externalDeps: doc.architecture?.externalDeps ?? [],
    assets,
    contracts: testnetContractRows(doc),
    liquidity: { byAsset, readAt: pools.readAt },
  });
  return { rows, summary: dependencySummary(rows, chain), readAt: new Date().toISOString(), poolsReadAt: pools.readAt, oraclesCheckedOn: ORACLES_CHECKED_ON };
}

export { dependencyCheckStatic } from "@/lib/viability/static";
