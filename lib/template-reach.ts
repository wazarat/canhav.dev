import { checklistFor } from "@/content/kits/checklists";
import { featuresFor } from "@/content/kits/features";
import { TEMPLATE_CATALOG, templateById } from "@/content/templates";
import { type ShapeInput, toShapeList } from "@/lib/kits";
import type { ProjectChain } from "@/lib/chains";
import {
  type ContractTemplate,
  type TemplateFilter,
  sortTemplates,
  templatesForShapes,
  templatesForSubsectors,
} from "@/lib/templates";
import type { Subsector } from "@/lib/sectors";

/**
 * The one set of contract templates a project with these shapes can decide
 * (M80). The catalog places a template under subsectors, and
 * templatesForShapes reaches it through the shapes' subsectors. Build steps
 * and features cite templates too, and a cited template can sit under a
 * subsector the shapes do not open (robinhood-stock-tokens is placed under
 * Tokenized securities and cited by a Collateral loans feature). Before M80
 * get_build_steps printed such an id and set_template_decisions refused it.
 * Now every surface reads this set, so what an agent sees it can decide.
 */
export type TemplateVia = "subsector" | "step" | "feature";

export interface ReachableTemplates {
  /** Subsector templates in pack order, then the cited extras in the same order rule. */
  items: ContractTemplate[];
  /** How each id is reached. A subsector placement wins over a citation. */
  via: Map<string, TemplateVia>;
}

export function reachableTemplatesFor(
  shapes: ShapeInput,
  chain: ProjectChain,
  filter: TemplateFilter = {},
  /** Subsectors lent by the team's own subsectors (M182), placed like the modules' own. */
  lent: readonly Subsector[] = [],
): ReachableTemplates {
  const list = toShapeList(shapes);
  const via = new Map<string, TemplateVia>();
  const own = templatesForShapes(TEMPLATE_CATALOG, list, chain, filter);
  const ownIds = new Set(own.map((t) => t.id));
  const base = [...own, ...(lent.length ? templatesForSubsectors(TEMPLATE_CATALOG, lent, chain, filter).filter((t) => !ownIds.has(t.id)) : [])];
  for (const t of base) via.set(t.id, "subsector");
  const extras: ContractTemplate[] = [];
  const cite = (id: string, how: TemplateVia) => {
    if (via.has(id)) return;
    const t = templateById(id);
    if (!t) return;
    if (!filter.includeInactive && t.status === "inactive") return;
    via.set(id, how);
    extras.push(t);
  };
  for (const item of checklistFor(list)) for (const id of item.templates ?? []) cite(id, "step");
  for (const f of featuresFor(list)) for (const id of f.templates ?? []) cite(id, "feature");
  return { items: [...base, ...sortTemplates(extras, chain)], via };
}

/** The ids of reachableTemplatesFor, for validation. */
export function reachableTemplateIds(shapes: ShapeInput, chain: ProjectChain, filter: TemplateFilter = {}, lent: readonly Subsector[] = []): Set<string> {
  return new Set(reachableTemplatesFor(shapes, chain, filter, lent).items.map((t) => t.id));
}

/** The subsectors the team's own subsectors lend (M182), each closest one once. */
export function lentSubsectors(doc: { customSubsectors?: ReadonlyArray<{ closest?: Subsector }> }): Subsector[] {
  return [...new Set((doc.customSubsectors ?? []).map((c) => c.closest).filter((x): x is Subsector => Boolean(x)))];
}
