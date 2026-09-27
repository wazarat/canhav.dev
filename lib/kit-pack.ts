import { KIT_CATALOG } from "@/content/kits/catalog";
import { checklistFor } from "@/content/kits/checklists";
import { REVIEW_PASSES } from "@/content/kits/review-passes";
import { FAMILY_LABELS, shapeLabel, shapeLabels } from "@/content/kits/credit";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import type { ProjectDoc } from "@/lib/ideation";
import {
  type ChecklistItem,
  type FamilyEnvironment,
  type KitFamily,
  type KitFlag,
  type KitPriority,
  type KitResource,
  type KitResourceKind,
  type KitStep,
  type PackFilter,
  type ReviewPass,
  type ReviewVerdict,
  checklistProgress,
  effectiveSelection,
  effectiveSubsectors,
  environmentPlanFor,
  kitShapes,
  packCounts,
  packFor,
  reviewPassesFor,
  reviewProgress,
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
  /** The first shape. Kept for readers from before a project could build several. */
  shape: string;
  shapeLabel: string | null;
  /** Every shape the project is building, in table order. */
  shapes: string[];
  shapeLabels: string[];
  subsectors: string[];
  startingPoint: string;
  environment: { checkedOn: string | null; families: FamilyEnvironment[] };
  readFirst: string[];
  resources: PackResourceView[];
  counts: ReturnType<typeof packCounts>;
  /** The ordered build steps for the shape and which are done. */
  checklist: { done: number; total: number; items: Array<ChecklistItem & { done: boolean }> };
  /** Pre-launch review passes for the shape with recorded verdicts. */
  review: ReviewView;
  howToUse: string;
}

export interface ReviewPassView extends Omit<ReviewPass, "resources"> {
  verdict: ReviewVerdict | null;
  resources: Array<{ id: string; title: string; url: string; rawUrl?: string }>;
}

export interface ReviewView {
  shape: string;
  shapeLabel: string | null;
  shapes: string[];
  shapeLabels: string[];
  progress: ReturnType<typeof reviewProgress>;
  passes: ReviewPassView[];
}

const BY_ID = new Map(KIT_CATALOG.map((r) => [r.id, r] as const));

/** The review passes for a project's shape with verdicts, or null without a shape. */
export function buildReviewView(doc: ProjectDoc): ReviewView | null {
  const kit = doc.kit;
  const shapes = kitShapes(kit);
  if (!kit || !shapes.length) return null;
  const passes = reviewPassesFor(REVIEW_PASSES, shapes);
  return {
    shape: kit.shape,
    shapeLabel: shapeLabel(kit.shape),
    shapes,
    shapeLabels: shapeLabels(kit),
    progress: reviewProgress(passes, kit),
    passes: passes.map((p) => ({
      ...p,
      verdict: kit.review?.[p.id] ?? null,
      resources: p.resources
        .map((id) => BY_ID.get(id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map((r) => ({ id: r.id, title: r.title, url: r.href, ...(r.rawHref ? { rawUrl: r.rawHref } : {}) })),
    })),
  };
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
  const shapes = kitShapes(kit);
  if (!kit || !shapes.length) return null;
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
  const families = environmentPlanFor(shapes, KIT_ENVIRONMENTS);
  const checklistItems = checklistFor(shapes);
  const checkedOn = families.length
    ? families.map((f) => f.checkedOn).sort().at(-1) ?? null
    : null;
  return {
    kit: "credit",
    shape: kit.shape,
    shapeLabel: shapeLabel(kit.shape),
    shapes,
    shapeLabels: shapeLabels(kit),
    subsectors: effectiveSubsectors(kit, doc),
    startingPoint: kit.startingPoint,
    environment: { checkedOn, families },
    readFirst: fullPack
      .filter((r) => r.priority === "core" && selection.has(r.id))
      .map((r) => r.id),
    resources,
    counts: packCounts(fullPack, selection),
    checklist: {
      ...checklistProgress(checklistItems, kit),
      items: checklistItems.map((i) => ({ ...i, done: kit.checklist?.[i.id] === true })),
    },
    review: buildReviewView(doc)!,
    howToUse: HOW_TO_USE,
  };
}
