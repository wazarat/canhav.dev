import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import { TEMPLATE_CATALOG } from "@/content/templates";
import { projectChainOf } from "@/lib/chains";
import { type ProjectDoc, testnetContractRows } from "@/lib/ideation";
import { kitShapes } from "@/lib/kits";
import { type DependencyRow, type DependencySummary, dependencySummary, resolveDependencies } from "@/lib/viability/dependencies";

/** The templates the team accepted (M163). */
export function acceptedTemplates(doc: ProjectDoc) {
  return TEMPLATE_CATALOG.filter((t) => doc.kit?.templates?.[t.id] === "accepted");
}

/**
 * The dependency check without the pools read (M163), for
 * get_project_status, AGENTS.md and the pack prompt, where a slow read has
 * no place. Pure, client and server. Liquidity reads as not read.
 */
export function dependencyCheckStatic(doc: ProjectDoc): { rows: DependencyRow[]; summary: DependencySummary } {
  const chain = projectChainOf(doc);
  const rows = resolveDependencies({
    chain,
    shapes: kitShapes(doc.kit),
    environment: KIT_ENVIRONMENTS[chain],
    templates: acceptedTemplates(doc),
    externalDeps: doc.architecture?.externalDeps ?? [],
    assets: doc.assets ?? [],
    contracts: testnetContractRows(doc),
    liquidity: null,
  });
  return { rows, summary: dependencySummary(rows, chain) };
}
