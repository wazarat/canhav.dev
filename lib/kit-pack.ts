import { KIT_CATALOG } from "@/content/kits/catalog";
import { buildProgress, checklistFor, sectionsFor } from "@/content/kits/checklists";
import { REVIEW_PASSES } from "@/content/kits/review-passes";
import { FAMILY_LABELS, shapeLabel, shapeLabels } from "@/content/kits/copy";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import type { ProjectDoc } from "@/lib/ideation";
import { docSectors } from "@/lib/sectors";
import {
  type ChecklistItem,
  type KitId,
  type FamilyEnvironment,
  type KitFamily,
  type KitFlag,
  type KitPriority,
  type KitResource,
  type KitResourceKind,
  type KitStep,
  type ProductShape,
  type PackFilter,
  type ReviewPass,
  type ReviewVerdict,
  groupState,
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
  /** The first kit. Kept for readers from before a project could be in several sectors. */
  kit: KitId;
  /** Every kit the project's sectors open, in sector order. */
  kits: KitId[];
  /** The sectors the project is in, in table order. */
  sectors: string[];
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
  /**
   * done and total count shared steps once (M43). items stays per id with
   * the other ids of its group in sharedWith; groups is what the editor
   * shows, in section order.
   */
  checklist: {
    done: number;
    total: number;
    items: Array<ChecklistItem & { done: boolean; shape: ProductShape; sharedWith: string[] }>;
    groups: Array<{
      key: string;
      title: string;
      detail: string;
      step: KitStep;
      shape: ProductShape;
      shapes: ProductShape[];
      ids: string[];
      resources: string[];
      done: boolean;
    }>;
  };
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
  "Fetch rawUrl where present (agent skills, references and templates) and load them into context in readFirst order before touching code. Respect the flags. mainnet_only means no testnet deployment exists, not_on_robinhood means the resource is background reading and cannot be integrated on this chain, unofficial means a community artifact to verify before trusting, self_deploy means the protocol has no deployment on testnet 46630 and the team deploys these contracts itself and records them in its own manifest.";

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
  const sections = sectionsFor(shapes);
  const groupOf = new Map<string, { ids: readonly string[]; shape: ProductShape }>();
  for (const section of sections)
    for (const g of section.groups) for (const id of g.ids) groupOf.set(id, { ids: g.ids, shape: section.shape });
  const checkedOn = families.length
    ? families.map((f) => f.checkedOn).sort().at(-1) ?? null
    : null;
  return {
    kit: kit.id,
    kits: kit.kits,
    sectors: docSectors(doc),
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
      ...buildProgress(kit),
      items: checklistItems.map((i) => ({
        ...i,
        done: kit.checklist?.[i.id] === true,
        shape: i.id.slice(0, i.id.indexOf(".")) as ProductShape,
        sharedWith: (groupOf.get(i.id)?.ids ?? []).filter((id) => id !== i.id),
      })),
      groups: sections.flatMap((section) =>
        section.groups.map((g) => ({
          key: g.key,
          title: g.title,
          detail: g.detail,
          step: g.step,
          shape: section.shape,
          shapes: [...g.shapes],
          ids: [...g.ids],
          resources: [...g.resources],
          done: groupState(g, kit) === "done",
        })),
      ),
    },
    review: buildReviewView(doc)!,
    howToUse: HOW_TO_USE,
  };
}
