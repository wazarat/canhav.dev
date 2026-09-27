import type { ProjectDoc, Subsector } from "@/lib/ideation";

/**
 * The credit research kit: the guided workflow attached to a Credit project.
 * Types, limits and pure logic live here; every human-facing string lives in
 * content/kits/*. Imported by client components, MCP tools and the markdown
 * builders, so this file has no Node imports and no `server-only`.
 *
 * One kit per project, one product shape. The kit is created the first time
 * a builder picks a shape, is never a publish requirement, and is never
 * injected by normalizeProjectDoc. Stored docs from M21 carried id "lending";
 * normalizeProjectKit hard-codes the id, so they read back as "credit".
 */

// ---------------------------------------------------------------------------
// Shapes

export type ProductShape =
  | "curated_vault"
  | "embedded_earn"
  | "collateral_loans"
  | "fixed_rate_yield"
  | "embedded_fixed_rate"
  | "pt_backed_borrowing"
  | "leveraged_fixed_yield"
  | "yield_token_exposure";

/**
 * The one place subsector membership lives. Key order is picker order. A
 * shape listed under several subsectors is offered once, under the first of
 * them the builder has chosen.
 */
export const SHAPE_SUBSECTORS: Record<ProductShape, readonly Subsector[]> = {
  curated_vault: ["lending"],
  embedded_earn: ["lending"],
  collateral_loans: ["lending"],
  fixed_rate_yield: ["fixed_income"],
  embedded_fixed_rate: ["fixed_income"],
  pt_backed_borrowing: ["fixed_income", "lending"],
  leveraged_fixed_yield: ["leveraged_yield", "fixed_income", "lending"],
  yield_token_exposure: ["leveraged_yield"],
};

export const PRODUCT_SHAPE_VALUES = Object.keys(SHAPE_SUBSECTORS) as readonly ProductShape[];

/** Shapes offered for the chosen subsectors, in PRODUCT_SHAPE_VALUES order. */
export function shapesFor(subsectors: readonly Subsector[]): ProductShape[] {
  const chosen = new Set(subsectors);
  return PRODUCT_SHAPE_VALUES.filter((s) => SHAPE_SUBSECTORS[s].some((x) => chosen.has(x)));
}

/** Declared subsectors plus the ones the chosen shape implies. */
export function effectiveSubsectors(
  kit: Pick<ProjectKit, "shape"> | undefined,
  doc: Pick<ProjectDoc, "subsectors">,
): Subsector[] {
  const out = new Set<Subsector>(doc.subsectors ?? []);
  if (kit?.shape) for (const s of SHAPE_SUBSECTORS[kit.shape]) out.add(s);
  return [...out];
}

// ---------------------------------------------------------------------------
// The kit stored on the project document

export type StartingPoint = "scratch" | "existing_product";

export const STARTING_POINT_VALUES: readonly StartingPoint[] = ["scratch", "existing_product"];

export type KitId = "credit";

export interface ProjectKit {
  id: KitId;
  shape: ProductShape | "";
  startingPoint: StartingPoint | "";
  /** A link or one line about the existing product. Only meaningful for existing_product. */
  existingProduct?: string;
  /** Resource ids the builder opted into beyond the core set. */
  selected: string[];
  /** Core resource ids the builder opted out of. */
  dismissed: string[];
}

export const KIT_LIMITS = {
  existingProduct: { max: 200 },
  /** Cap on each id list, well above any catalog size. */
  ids: { max: 200 },
} as const;

export function emptyProjectKit(): ProjectKit {
  return { id: "credit", shape: "", startingPoint: "", selected: [], dismissed: [] };
}

function idList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const x of v) if (typeof x === "string" && x) out.add(x);
  return [...out].slice(0, KIT_LIMITS.ids.max);
}

/**
 * Coerce a stored kit to the current shape. Returns null for anything that
 * is not an object, so the caller can drop the key instead of inventing one.
 * Idempotent.
 */
export function normalizeProjectKit(raw: unknown): ProjectKit | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const shape = PRODUCT_SHAPE_VALUES.includes(r.shape as ProductShape)
    ? (r.shape as ProductShape)
    : "";
  const startingPoint = STARTING_POINT_VALUES.includes(r.startingPoint as StartingPoint)
    ? (r.startingPoint as StartingPoint)
    : "";
  const kit: ProjectKit = {
    id: "credit",
    shape,
    startingPoint,
    selected: idList(r.selected),
    dismissed: idList(r.dismissed),
  };
  if (typeof r.existingProduct === "string")
    kit.existingProduct = r.existingProduct.slice(0, KIT_LIMITS.existingProduct.max);
  return kit;
}

/** Bounds only. The kit never blocks publishing; it just has to be well formed. */
export function validateProjectKit(kit: ProjectKit): string | null {
  if (kit.id !== "credit") return "Unknown research kit.";
  if (kit.shape && !PRODUCT_SHAPE_VALUES.includes(kit.shape)) return "Unknown product shape.";
  if (kit.startingPoint && !STARTING_POINT_VALUES.includes(kit.startingPoint))
    return "Unknown starting point.";
  if ((kit.existingProduct?.length ?? 0) > KIT_LIMITS.existingProduct.max)
    return `Existing product note is over ${KIT_LIMITS.existingProduct.max} characters.`;
  if (kit.selected.length > KIT_LIMITS.ids.max || kit.dismissed.length > KIT_LIMITS.ids.max)
    return "Too many resource selections.";
  return null;
}

// ---------------------------------------------------------------------------
// Resource catalog

export type KitFamily = "shared" | "robinhood" | "morpho" | "pendle" | "boros";

export const KIT_FAMILY_ORDER: readonly KitFamily[] = [
  "shared",
  "robinhood",
  "morpho",
  "pendle",
  "boros",
];

export type KitFlag = "unofficial" | "mainnet_only" | "not_on_robinhood" | "testnet_only";

export type KitStep = "basics" | "architecture" | "security" | "reality" | "review";

export const KIT_STEPS: readonly KitStep[] = ["basics", "architecture", "security", "reality", "review"];

export type KitPriority = "core" | "recommended" | "deep_dive";

export const KIT_PRIORITY_ORDER: readonly KitPriority[] = ["core", "recommended", "deep_dive"];

export type KitResourceKind =
  | "skill"
  | "docs"
  | "repo"
  | "spec"
  | "paper"
  | "checklist"
  | "template"
  | "addresses"
  | "dataset"
  | "tool";

export interface KitResource {
  /** "<source>.<slug>", immutable once shipped. Renames go through RETIRED_IDS. */
  id: string;
  family: KitFamily;
  title: string;
  kind: KitResourceKind;
  /** Human URL. */
  href: string;
  /** Fetchable markdown or JSON for agents, when it differs from href. */
  rawHref?: string;
  /** Our one line on why it matters. No colons, no em dashes. */
  why: string;
  /** Shapes this applies to, or "all" (then `subsectors` may narrow it). */
  shapes: readonly ProductShape[] | "all";
  /** Only read when shapes is "all". Absent means every subsector. */
  subsectors?: readonly Subsector[];
  steps: readonly KitStep[];
  priority: KitPriority;
  /** Core only. Lower reads first. */
  readOrder?: number;
  /** Absent means both starting points. */
  startingPoints?: readonly StartingPoint[];
  flags?: readonly KitFlag[];
}

export interface PackFilter {
  step?: KitStep;
  priority?: KitPriority;
  family?: KitFamily;
}

function appliesTo(
  r: KitResource,
  kit: Pick<ProjectKit, "shape" | "startingPoint">,
  subsectors: readonly Subsector[],
): boolean {
  if (!kit.shape) return false;
  if (r.shapes === "all") {
    if (r.subsectors && !r.subsectors.some((s) => subsectors.includes(s))) return false;
  } else if (!r.shapes.includes(kit.shape)) return false;
  if (r.startingPoints && kit.startingPoint && !r.startingPoints.includes(kit.startingPoint))
    return false;
  return true;
}

function compareResources(a: KitResource, b: KitResource): number {
  const p = KIT_PRIORITY_ORDER.indexOf(a.priority) - KIT_PRIORITY_ORDER.indexOf(b.priority);
  if (p) return p;
  const ra = a.readOrder ?? Number.MAX_SAFE_INTEGER;
  const rb = b.readOrder ?? Number.MAX_SAFE_INTEGER;
  if (ra !== rb) return ra - rb;
  const f = KIT_FAMILY_ORDER.indexOf(a.family) - KIT_FAMILY_ORDER.indexOf(b.family);
  if (f) return f;
  return a.title.localeCompare(b.title);
}

/**
 * The resources that apply to a project, sorted priority then readOrder then
 * family then title. Empty when no shape is chosen.
 */
export function packFor(
  catalog: readonly KitResource[],
  kit: ProjectKit | undefined,
  doc: Pick<ProjectDoc, "subsectors">,
  filter: PackFilter = {},
): KitResource[] {
  if (!kit?.shape) return [];
  const subs = effectiveSubsectors(kit, doc);
  return catalog
    .filter((r) => appliesTo(r, kit, subs))
    .filter((r) => !filter.step || r.steps.includes(filter.step))
    .filter((r) => !filter.priority || r.priority === filter.priority)
    .filter((r) => !filter.family || r.family === filter.family)
    .sort(compareResources);
}

export function groupByPriority(list: readonly KitResource[]): Record<KitPriority, KitResource[]> {
  const out: Record<KitPriority, KitResource[]> = { core: [], recommended: [], deep_dive: [] };
  for (const r of list) out[r.priority].push(r);
  return out;
}

/**
 * Checked state is computed, never stored: every core resource in the pack
 * unless dismissed, plus anything explicitly selected. `pack` should be the
 * unfiltered pack so a step filter never changes what counts as selected.
 */
export function effectiveSelection(pack: readonly KitResource[], kit: ProjectKit): Set<string> {
  const dismissed = new Set(kit.dismissed);
  const out = new Set<string>();
  for (const r of pack) if (r.priority === "core" && !dismissed.has(r.id)) out.add(r.id);
  for (const id of kit.selected) out.add(id);
  return out;
}

/** Flip one resource and return the patched kit fields. */
export function toggleResource(
  kit: ProjectKit,
  r: KitResource,
  currentlySelected: boolean,
): Pick<ProjectKit, "selected" | "dismissed"> {
  const selected = kit.selected.filter((id) => id !== r.id);
  const dismissed = kit.dismissed.filter((id) => id !== r.id);
  if (r.priority === "core") {
    if (currentlySelected) dismissed.push(r.id);
  } else if (!currentlySelected) {
    selected.push(r.id);
  }
  return { selected, dismissed };
}

/** Drop or remap ids that left the catalog. Idempotent. */
export function applyRetiredIds(
  kit: ProjectKit,
  retired: Record<string, string | null>,
  known: ReadonlySet<string>,
): ProjectKit {
  const fix = (ids: string[]) => {
    const out: string[] = [];
    for (const id of ids) {
      const next = id in retired ? retired[id] : id;
      if (next && known.has(next) && !out.includes(next)) out.push(next);
    }
    return out;
  };
  const selected = fix(kit.selected);
  const dismissed = fix(kit.dismissed);
  if (
    selected.length === kit.selected.length &&
    dismissed.length === kit.dismissed.length &&
    selected.every((id, i) => id === kit.selected[i]) &&
    dismissed.every((id, i) => id === kit.dismissed[i])
  )
    return kit;
  return { ...kit, selected, dismissed };
}

/** Counts the rail and the MCP tool both report. */
export function packCounts(pack: readonly KitResource[], selection: ReadonlySet<string>) {
  const g = groupByPriority(pack);
  return {
    core: g.core.length,
    recommended: g.recommended.length,
    deepDive: g.deep_dive.length,
    total: pack.length,
    selected: pack.filter((r) => selection.has(r.id)).length,
  };
}

/**
 * Catalog sanity, run at import so a bad entry fails the build rather than
 * silently merging two resources.
 */
export function assertKitCatalog(
  catalog: readonly KitResource[],
  families: Partial<Record<KitFamily, readonly KitResource[]>> = {},
): void {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const r of catalog) {
    if (seen.has(r.id)) problems.push(`duplicate id ${r.id}`);
    seen.add(r.id);
    if (!/^[a-z0-9]+\.[a-z0-9-]+$/.test(r.id)) problems.push(`bad id ${r.id}`);
    if (!/^https:\/\/\S+$/.test(r.href)) problems.push(`${r.id} href must be https`);
    if (r.rawHref && !/^https:\/\/\S+$/.test(r.rawHref)) problems.push(`${r.id} rawHref must be https`);
    if (!r.why.trim()) problems.push(`${r.id} has no why`);
    if (r.readOrder !== undefined && r.priority !== "core")
      problems.push(`${r.id} readOrder on a non-core resource`);
    if (r.subsectors && r.shapes !== "all") problems.push(`${r.id} subsectors without shapes "all"`);
    if (r.subsectors && r.subsectors.length === 0) problems.push(`${r.id} empty subsectors`);
    if (r.shapes !== "all") {
      if (r.shapes.length === 0) problems.push(`${r.id} empty shapes`);
      for (const s of r.shapes)
        if (!PRODUCT_SHAPE_VALUES.includes(s)) problems.push(`${r.id} unknown shape ${s}`);
    }
    if (r.steps.length === 0) problems.push(`${r.id} has no steps`);
  }
  for (const [family, list] of Object.entries(families))
    for (const r of list ?? [])
      if (r.family !== family) problems.push(`${r.id} is in the ${family} file but says ${r.family}`);
  if (problems.length) throw new Error(`Kit catalog is invalid. ${problems.join("; ")}`);
}
