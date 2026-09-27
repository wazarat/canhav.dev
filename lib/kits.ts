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

/** Declared subsectors plus the ones the chosen shapes imply. */
export function effectiveSubsectors(
  kit: Pick<ProjectKit, "shape" | "shapes"> | undefined,
  doc: Pick<ProjectDoc, "subsectors">,
): Subsector[] {
  const out = new Set<Subsector>(doc.subsectors ?? []);
  for (const shape of kitShapes(kit)) for (const s of SHAPE_SUBSECTORS[shape]) out.add(s);
  return [...out];
}

/** One shape, a list of shapes or nothing, as a list. */
export type ShapeInput = ProductShape | "" | undefined | readonly ProductShape[];

export function toShapeList(input: ShapeInput): ProductShape[] {
  if (!input) return [];
  return typeof input === "string" ? [input] : [...input];
}

/**
 * The shapes a project is building, in table order. Reads `shapes` and falls
 * back to the older single `shape` so a kit patched in memory before the
 * normaliser runs still answers.
 */
export function kitShapes(kit: Pick<ProjectKit, "shape" | "shapes"> | undefined): ProductShape[] {
  if (!kit) return [];
  if (kit.shapes?.length) return kit.shapes;
  return kit.shape ? [kit.shape] : [];
}

/**
 * The field patch for a new set of shapes. Deduplicated, in table order, and
 * `shape` follows as the first one so every older reader keeps working.
 */
export function withShapes(input: ShapeInput): Pick<ProjectKit, "shape" | "shapes"> {
  const chosen = new Set(toShapeList(input));
  const shapes = PRODUCT_SHAPE_VALUES.filter((s) => chosen.has(s));
  return { shapes, shape: shapes[0] ?? "" };
}

// ---------------------------------------------------------------------------
// The kit stored on the project document

export type StartingPoint = "scratch" | "existing_product";

export const STARTING_POINT_VALUES: readonly StartingPoint[] = ["scratch", "existing_product"];

export type KitId = "credit";

export interface ProjectKit {
  id: KitId;
  /** The first of `shapes`, kept so stored docs, exports and MCP readers from before multi-shape keep working. */
  shape: ProductShape | "";
  /** Every shape the project is building, in table order. Use kitShapes() to read. */
  shapes: ProductShape[];
  startingPoint: StartingPoint | "";
  /** A link or one line about the existing product. Only meaningful for existing_product. */
  existingProduct?: string;
  /** Resource ids the builder opted into beyond the core set. */
  selected: string[];
  /** Core resource ids the builder opted out of. */
  dismissed: string[];
  /** Build checklist item id to done. Only true entries are stored. */
  checklist?: Record<string, true>;
  /** Pre-launch review pass id to verdict. Only set verdicts are stored. */
  review?: Record<string, ReviewVerdict>;
}

export type ReviewVerdict = "pass" | "fail" | "na";

export const REVIEW_VERDICTS: readonly ReviewVerdict[] = ["pass", "fail", "na"];

export const KIT_LIMITS = {
  existingProduct: { max: 200 },
  /** Every shape at most once. */
  shapes: { max: PRODUCT_SHAPE_VALUES.length },
  /** Cap on each id list, well above any catalog size. */
  ids: { max: 200 },
  /** Cap on stored checklist entries. */
  checklist: { max: 200 },
  /** Cap on stored review verdicts. */
  review: { max: 200 },
} as const;

export function emptyProjectKit(): ProjectKit {
  return { id: "credit", shape: "", shapes: [], startingPoint: "", selected: [], dismissed: [] };
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
  const rawShapes = Array.isArray(r.shapes) ? [...(r.shapes as unknown[])] : [];
  if (typeof r.shape === "string" && r.shape) rawShapes.unshift(r.shape);
  const { shape, shapes } = withShapes(
    rawShapes.filter((x): x is ProductShape => PRODUCT_SHAPE_VALUES.includes(x as ProductShape)),
  );
  const startingPoint = STARTING_POINT_VALUES.includes(r.startingPoint as StartingPoint)
    ? (r.startingPoint as StartingPoint)
    : "";
  const kit: ProjectKit = {
    id: "credit",
    shape,
    shapes,
    startingPoint,
    selected: idList(r.selected),
    dismissed: idList(r.dismissed),
  };
  if (typeof r.existingProduct === "string")
    kit.existingProduct = r.existingProduct.slice(0, KIT_LIMITS.existingProduct.max);
  if (r.checklist && typeof r.checklist === "object" && !Array.isArray(r.checklist)) {
    const done: Record<string, true> = {};
    let n = 0;
    for (const [k, v] of Object.entries(r.checklist as Record<string, unknown>)) {
      if (v === true && k && n < KIT_LIMITS.checklist.max) {
        done[k] = true;
        n++;
      }
    }
    if (n > 0) kit.checklist = done;
  }
  if (r.review && typeof r.review === "object" && !Array.isArray(r.review)) {
    const verdicts: Record<string, ReviewVerdict> = {};
    let n = 0;
    for (const [k, v] of Object.entries(r.review as Record<string, unknown>)) {
      if (k && REVIEW_VERDICTS.includes(v as ReviewVerdict) && n < KIT_LIMITS.review.max) {
        verdicts[k] = v as ReviewVerdict;
        n++;
      }
    }
    if (n > 0) kit.review = verdicts;
  }
  return kit;
}

/** Bounds only. The kit never blocks publishing; it just has to be well formed. */
export function validateProjectKit(kit: ProjectKit): string | null {
  if (kit.id !== "credit") return "Unknown research kit.";
  if (kit.shape && !PRODUCT_SHAPE_VALUES.includes(kit.shape)) return "Unknown product shape.";
  if (kit.shapes.some((s) => !PRODUCT_SHAPE_VALUES.includes(s))) return "Unknown product shape.";
  if (new Set(kit.shapes).size !== kit.shapes.length || kit.shapes.length > KIT_LIMITS.shapes.max)
    return "Too many product shapes.";
  if (kit.shape && !kit.shapes.includes(kit.shape)) return "Product shapes are out of step.";
  if (kit.startingPoint && !STARTING_POINT_VALUES.includes(kit.startingPoint))
    return "Unknown starting point.";
  if ((kit.existingProduct?.length ?? 0) > KIT_LIMITS.existingProduct.max)
    return `Existing product note is over ${KIT_LIMITS.existingProduct.max} characters.`;
  if (kit.selected.length > KIT_LIMITS.ids.max || kit.dismissed.length > KIT_LIMITS.ids.max)
    return "Too many resource selections.";
  if (kit.checklist && Object.keys(kit.checklist).length > KIT_LIMITS.checklist.max)
    return "Too many checklist entries.";
  if (kit.review) {
    const entries = Object.entries(kit.review);
    if (entries.length > KIT_LIMITS.review.max) return "Too many review verdicts.";
    if (entries.some(([, v]) => !REVIEW_VERDICTS.includes(v))) return "Unknown review verdict.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pre-launch review passes

export interface ReviewPass {
  /** "review.<slug>", immutable once shipped. */
  id: string;
  title: string;
  /** What a reviewer checks and what counts as evidence. */
  detail: string;
  /** Shapes this pass applies to, or "all". */
  shapes: readonly ProductShape[] | "all";
  /** Catalog resource ids that define the pass. */
  resources: readonly string[];
}

/** The passes that apply to any of the given shapes, in catalog order, each once. */
export function reviewPassesFor(passes: readonly ReviewPass[], shapes: ShapeInput): ReviewPass[] {
  const list = toShapeList(shapes);
  if (!list.length) return [];
  return passes.filter((p) => p.shapes === "all" || p.shapes.some((s) => list.includes(s)));
}

export function reviewProgress(
  passes: readonly ReviewPass[],
  kit: Pick<ProjectKit, "review"> | undefined,
): { pass: number; fail: number; na: number; open: number; total: number } {
  const v = kit?.review ?? {};
  const out = { pass: 0, fail: 0, na: 0, open: 0, total: passes.length };
  for (const p of passes) {
    const verdict = v[p.id];
    if (verdict === "pass") out.pass++;
    else if (verdict === "fail") out.fail++;
    else if (verdict === "na") out.na++;
    else out.open++;
  }
  return out;
}

/** Set or clear one verdict. Never stores an empty map. */
export function setReviewVerdict(
  kit: Pick<ProjectKit, "review">,
  id: string,
  verdict: ReviewVerdict | null,
): Pick<ProjectKit, "review"> {
  const next: Record<string, ReviewVerdict> = { ...(kit.review ?? {}) };
  if (verdict) next[id] = verdict;
  else delete next[id];
  return Object.keys(next).length ? { review: next } : { review: undefined };
}

export function assertReviewPasses(
  passes: readonly ReviewPass[],
  knownResourceIds: ReadonlySet<string>,
): void {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const p of passes) {
    if (seen.has(p.id)) problems.push(`duplicate review id ${p.id}`);
    seen.add(p.id);
    if (!p.id.startsWith("review.")) problems.push(`${p.id} must start with review.`);
    if (p.shapes !== "all")
      for (const s of p.shapes)
        if (!PRODUCT_SHAPE_VALUES.includes(s)) problems.push(`${p.id} unknown shape ${s}`);
    for (const r of p.resources)
      if (!knownResourceIds.has(r)) problems.push(`${p.id} references unknown resource ${r}`);
  }
  if (problems.length) throw new Error(`Review passes are invalid. ${problems.join("; ")}`);
}

// ---------------------------------------------------------------------------
// Build checklist

export interface ChecklistItem {
  /** "<shape>.<slug>", immutable once shipped. */
  id: string;
  title: string;
  /** One or two sentences on what done looks like. */
  detail: string;
  /** The editor step this item informs. */
  step: KitStep;
  /** Catalog resource ids that help with this item. */
  resources: readonly string[];
}

export function checklistProgress(
  items: readonly ChecklistItem[],
  kit: Pick<ProjectKit, "checklist"> | undefined,
): { done: number; total: number } {
  const done = kit?.checklist ?? {};
  return { done: items.filter((i) => done[i.id] === true).length, total: items.length };
}

/** Flip one item and return the patched field. Never stores false. */
export function toggleChecklistItem(
  kit: Pick<ProjectKit, "checklist">,
  id: string,
  done: boolean,
): Pick<ProjectKit, "checklist"> {
  const next: Record<string, true> = { ...(kit.checklist ?? {}) };
  if (done) next[id] = true;
  else delete next[id];
  return Object.keys(next).length ? { checklist: next } : { checklist: undefined };
}

export function assertChecklists(
  lists: Partial<Record<ProductShape, readonly ChecklistItem[]>>,
  knownResourceIds: ReadonlySet<string>,
): void {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const [shape, items] of Object.entries(lists)) {
    for (const item of items ?? []) {
      if (seen.has(item.id)) problems.push(`duplicate checklist id ${item.id}`);
      seen.add(item.id);
      if (!item.id.startsWith(`${shape}.`)) problems.push(`${item.id} is not under ${shape}`);
      if (!KIT_STEPS.includes(item.step)) problems.push(`${item.id} unknown step ${item.step}`);
      for (const r of item.resources)
        if (!knownResourceIds.has(r)) problems.push(`${item.id} references unknown resource ${r}`);
    }
  }
  if (problems.length) throw new Error(`Kit checklists are invalid. ${problems.join("; ")}`);
}

// ---------------------------------------------------------------------------
// Where a shape can run today

export type DeploymentStatus = "official" | "community" | "manifest_only" | "none";

export interface FamilyEnvironment {
  family: Exclude<KitFamily, "shared">;
  testnet: { chainId: 46630; status: DeploymentStatus; note: string; source?: string };
  mainnet: { chainId: 4663; status: DeploymentStatus; note: string; source?: string };
  /** The recommended path from first commit to production, in order. */
  devPath: readonly string[];
  /** ISO date the row was last checked against the world. */
  checkedOn: string;
}

/** Protocol families a shape relies on. Robinhood is always implied, Boros never. */
export const SHAPE_FAMILIES: Record<ProductShape, readonly Exclude<KitFamily, "shared" | "robinhood">[]> = {
  curated_vault: ["morpho"],
  embedded_earn: ["morpho"],
  collateral_loans: ["morpho"],
  fixed_rate_yield: ["pendle"],
  embedded_fixed_rate: ["pendle"],
  pt_backed_borrowing: ["pendle", "morpho"],
  leveraged_fixed_yield: ["pendle", "morpho"],
  yield_token_exposure: ["pendle"],
};

/** Environment rows for the given shapes, Robinhood first, each family once, from whatever rows exist. */
export function environmentPlanFor(
  shapes: ShapeInput,
  rows: Partial<Record<FamilyEnvironment["family"], FamilyEnvironment>>,
): FamilyEnvironment[] {
  const list = toShapeList(shapes);
  if (!list.length) return [];
  const out: FamilyEnvironment[] = [];
  const rh = rows.robinhood;
  if (rh) out.push(rh);
  const seen = new Set<FamilyEnvironment["family"]>();
  for (const shape of list)
    for (const f of SHAPE_FAMILIES[shape]) {
      const row = rows[f];
      if (row && !seen.has(f)) {
        seen.add(f);
        out.push(row);
      }
    }
  return out;
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
  shapes: readonly ProductShape[],
  kit: Pick<ProjectKit, "startingPoint">,
  subsectors: readonly Subsector[],
): boolean {
  if (!shapes.length) return false;
  if (r.shapes === "all") {
    if (r.subsectors && !r.subsectors.some((s) => subsectors.includes(s))) return false;
  } else if (!r.shapes.some((s) => shapes.includes(s))) return false;
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
 * The resources that apply to a project, the union over its shapes, sorted
 * priority then readOrder then family then title. Empty when no shape is
 * chosen.
 */
export function packFor(
  catalog: readonly KitResource[],
  kit: ProjectKit | undefined,
  doc: Pick<ProjectDoc, "subsectors">,
  filter: PackFilter = {},
): KitResource[] {
  const shapes = kitShapes(kit);
  if (!kit || !shapes.length) return [];
  const subs = effectiveSubsectors(kit, doc);
  return catalog
    .filter((r) => appliesTo(r, shapes, kit, subs))
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

/** Tick every resource in `list`. Core items lose any dismissal, the rest are selected. */
export function selectAllResources(
  kit: ProjectKit,
  list: readonly KitResource[],
): Pick<ProjectKit, "selected" | "dismissed"> {
  const ids = new Set(list.map((r) => r.id));
  const dismissed = kit.dismissed.filter((id) => !ids.has(id));
  const selected = [...kit.selected];
  for (const r of list) if (r.priority !== "core" && !selected.includes(r.id)) selected.push(r.id);
  return { selected, dismissed };
}

/** Back to the default: core ticked, nothing else. */
export function resetSelection(): Pick<ProjectKit, "selected" | "dismissed"> {
  return { selected: [], dismissed: [] };
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
