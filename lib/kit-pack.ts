import { KIT_CATALOG } from "@/content/kits/catalog";
import { FAMILY_LABELS, shapeLabel } from "@/content/kits/credit";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import type { ProjectDoc } from "@/lib/ideation";
import {
  type FamilyEnvironment,
  type KitFamily,
  type KitFlag,
  type KitPriority,
  type KitResource,
  type KitResourceKind,
  type KitStep,
  type PackFilter,
  effectiveSelection,
  effectiveSubsectors,
  environmentPlanFor,
  packCounts,
  packFor,
} from "@/lib/kits";

/**
 * One view of a project's resource pack, shared by the MCP tool, the
 * markdown exports and the Review step so every surface agrees. Pure over
 * the doc plus static content, no DB.
 *
 * The output shape is a contract for agents. Fields are only ever added.
 */

export interface PackResourceView {
  id: string;
  family: KitFamily;
  familyLabel: string;
  kind: KitResourceKind;
  title: string;
  url: string;
  rawUrl?: string;
  why: string;
  priority: KitPriority;
  steps: readonly KitStep[];
  flags: KitFlag[];
  /** Dense position among the pack's core items, 1 first. Core only. */
  readOrder?: number;
  selected: boolean;
}

export interface ResourcePackView {
  kit: "credit";
  shape: string;
  shapeLabel: string | null;
  subsectors: string[];
  startingPoint: string;
  environment: { checkedOn: string | null; families: FamilyEnvironment[] };
  readFirst: string[];
  resources: PackResourceView[];
  counts: ReturnType<typeof packCounts>;
  howToUse: string;
}

export const HOW_TO_USE =
  "Fetch rawUrl where present (agent skills, references and templates) and load them into context in readFirst order before touching code. Respect the flags. mainnet_only means no testnet deployment exists, not_on_robinhood means the resource is background reading and cannot be integrated on this chain, unofficial means a community artifact to verify before trusting.";

export const NO_SHAPE_HINT =
  "This project has no product shape yet. Pick what you are building in the studio Basics step and the resource pack will follow.";

export function buildResourcePack(
  doc: ProjectDoc,
  opts: PackFilter & { includeUnselected?: boolean } = {},
): ResourcePackView | null {
  const kit = doc.kit;
  if (!kit?.shape) return null;
  const fullPack = packFor(KIT_CATALOG, kit, doc);
  const selection = effectiveSelection(fullPack, kit);
  const ranks = new Map<string, number>();
  fullPack.filter((r) => r.priority === "core").forEach((r, i) => ranks.set(r.id, i + 1));
  const filtered = packFor(KIT_CATALOG, kit, doc, opts);
  const view = (r: KitResource): PackResourceView => ({
    id: r.id,
    family: r.family,
    familyLabel: FAMILY_LABELS[r.family],
    kind: r.kind,
    title: r.title,
    url: r.href,
    ...(r.rawHref ? { rawUrl: r.rawHref } : {}),
    why: r.why,
    priority: r.priority,
    steps: r.steps,
    flags: [...(r.flags ?? [])],
    ...(ranks.has(r.id) ? { readOrder: ranks.get(r.id) } : {}),
    selected: selection.has(r.id),
  });
  const resources = filtered.filter((r) => opts.includeUnselected || selection.has(r.id)).map(view);
  const families = environmentPlanFor(kit.shape, KIT_ENVIRONMENTS);
  const checkedOn = families.length
    ? families.map((f) => f.checkedOn).sort().at(-1) ?? null
    : null;
  return {
    kit: "credit",
    shape: kit.shape,
    shapeLabel: shapeLabel(kit.shape),
    subsectors: effectiveSubsectors(kit, doc),
    startingPoint: kit.startingPoint,
    environment: { checkedOn, families },
    readFirst: fullPack
      .filter((r) => r.priority === "core" && selection.has(r.id))
      .map((r) => r.id),
    resources,
    counts: packCounts(fullPack, selection),
    howToUse: HOW_TO_USE,
  };
}
