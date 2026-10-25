import { type ProjectChain, projectChainOf } from "@/lib/chains";
import type { ProjectDoc } from "@/lib/ideation";
import {
  SECTOR_SUBSECTORS,
  SUBSECTOR_VALUES,
  type Sector,
  type Subsector,
  docSectors,
  sectorOfSubsector,
  subsectorsOf,
} from "@/lib/sectors";

/**
 * The research kit: the guided workflow attached to a project in a sector
 * that has one (Credit since M20, Liquidity since M32). Types, limits and
 * pure logic live here; every human-facing string lives in content/kits/*.
 * Imported by client components, MCP tools and the markdown builders, so
 * this file has no Node imports and no `server-only`.
 *
 * One kit per project, any number of product shapes. The kit is created the
 * first time a builder picks a shape, is never a publish requirement, and is
 * never injected by normalizeProjectDoc. `id` is the first kit the project's
 * sectors qualify for and `kits` lists all of them; stored docs from M21
 * carried id "lending" and read back as "credit".
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
  | "yield_token_exposure"
  | "liquidity_allocator"
  | "permissioned_vault"
  | "basic_amm_pool"
  | "concentrated_liquidity_pool"
  | "hook_pool"
  | "perp_exchange"
  | "option_vault"
  | "delta_neutral_vault"
  | "liquid_staking_token"
  | "restaking_service"
  | "liquid_restaking_token"
  | "tokenized_security"
  | "private_credit_pool"
  | "asset_backed_token"
  | "cover_pool"
  | "governance_stack";

/**
 * The one place subsector membership lives. Key order is picker order. A
 * shape listed under several subsectors is offered once, under the first of
 * them the builder has chosen. Subsectors may belong to different sectors:
 * a curated vault is reached from Credit through Lending and from Liquidity
 * through Vaults, and carries the same pack, steps and passes either way.
 */
export const SHAPE_SUBSECTORS: Record<ProductShape, readonly Subsector[]> = {
  curated_vault: ["lending", "vaults"],
  embedded_earn: ["lending", "vaults"],
  collateral_loans: ["lending"],
  fixed_rate_yield: ["fixed_income"],
  embedded_fixed_rate: ["fixed_income"],
  pt_backed_borrowing: ["fixed_income", "lending"],
  leveraged_fixed_yield: ["leveraged_yield", "fixed_income", "lending"],
  yield_token_exposure: ["leveraged_yield"],
  liquidity_allocator: ["vaults"],
  permissioned_vault: ["vaults"],
  basic_amm_pool: ["pools"],
  concentrated_liquidity_pool: ["pools"],
  hook_pool: ["pools"],
  // One shape per subsector for the sectors opened in M65 to M67. Appended, never reordered.
  perp_exchange: ["perp_dex"],
  option_vault: ["option_vaults"],
  delta_neutral_vault: ["delta_neutral"],
  liquid_staking_token: ["liquid_staking"],
  restaking_service: ["restaking"],
  liquid_restaking_token: ["liquid_restaking"],
  tokenized_security: ["tokenized_securities"],
  private_credit_pool: ["private_credit"],
  asset_backed_token: ["asset_backed_tokens"],
  // Other (M68).
  cover_pool: ["underwriting"],
  governance_stack: ["governance"],
};

export const PRODUCT_SHAPE_VALUES = Object.keys(SHAPE_SUBSECTORS) as readonly ProductShape[];

/**
 * A shape the team made itself (M176), "own.<slug>". It carries no catalog
 * content of its own: the team picks catalog steps from any of our shapes
 * into it, adds its own steps and fills its board.
 */
export type OwnShapeId = `own.${string}`;
/** One of our shapes or one the team made (M176). */
export type ShapeId = ProductShape | OwnShapeId;

export const OWN_SHAPE_ID = /^own\.[a-z0-9-]{1,40}$/;

export function isOwnShapeId(v: unknown): v is OwnShapeId {
  return typeof v === "string" && OWN_SHAPE_ID.test(v);
}

export function isProductShape(v: unknown): v is ProductShape {
  return typeof v === "string" && (PRODUCT_SHAPE_VALUES as readonly string[]).includes(v);
}

/** Shapes offered for the chosen subsectors, in PRODUCT_SHAPE_VALUES order. */
export function shapesFor(subsectors: readonly Subsector[]): ProductShape[] {
  const chosen = new Set(subsectors);
  return PRODUCT_SHAPE_VALUES.filter((s) => SHAPE_SUBSECTORS[s].some((x) => chosen.has(x)));
}

/**
 * The shapes a set of subsectors picks on its own: every subsector that
 * offers exactly one shape names it, so the builder is not asked twice.
 * Picker order, each once.
 */
export function impliedShapesFor(subsectors: readonly Subsector[]): ProductShape[] {
  const out = new Set<ProductShape>();
  for (const sub of subsectors) {
    const offered = shapesFor([sub]);
    if (offered.length === 1) out.add(offered[0]);
  }
  return PRODUCT_SHAPE_VALUES.filter((s) => out.has(s));
}

/**
 * Declared subsectors plus the ones the chosen shapes imply, limited to the
 * sectors the project is in, so a Liquidity project building a curated vault
 * does not report Lending.
 */
export function effectiveSubsectors(
  kit: Pick<ProjectKit, "shape" | "shapes"> | undefined,
  doc: Pick<ProjectDoc, "subsectors" | "sector" | "sectors">,
): Subsector[] {
  const own = new Set(subsectorsOf(docSectors(doc)));
  const out = new Set<Subsector>((doc.subsectors ?? []).filter((s) => own.has(s)));
  for (const shape of kitShapes(kit))
    for (const s of SHAPE_SUBSECTORS[shape]) if (own.has(s)) out.add(s);
  return [...out];
}

// ---------------------------------------------------------------------------
// Overlaps across sectors (owner rule, M32). Ticking a subsector that shares a
// shape with a subsector under another chosen sector ticks that one too, so
// the builder sees every door the product can be reached through. Applied by
// the editor on change, never by the normaliser, so stored docs stay explicit.

/** Every other subsector that shares at least one shape with `sub`, in table order. */
export function overlappingSubsectors(sub: Subsector): Subsector[] {
  const out = new Set<Subsector>();
  for (const shape of PRODUCT_SHAPE_VALUES) {
    const list = SHAPE_SUBSECTORS[shape];
    if (list.includes(sub)) for (const other of list) if (other !== sub) out.add(other);
  }
  return SUBSECTOR_VALUES.filter((s) => out.has(s));
}

/**
 * `chosen` plus every overlapping subsector that belongs to a different
 * chosen sector, expanding from `seeds` (what was just ticked, by default
 * everything) to a fixpoint. Order follows the builder's clicks, with the
 * additions appended in table order. Expanding from the seeds only means an
 * implied subsector can be unticked again afterwards, and same-sector
 * overlaps are left alone so a Fixed income project that picks a borrowing
 * shape does not gain Lending.
 */
export function withImpliedSubsectors(
  chosen: readonly Subsector[],
  sectors: readonly Sector[],
  seeds: readonly Subsector[] = chosen,
): Subsector[] {
  const out = [...chosen];
  const chosenSectors = new Set(sectors);
  const frontier = seeds.filter((s) => out.includes(s));
  while (frontier.length) {
    const sub = frontier.shift()!;
    const home = sectorOfSubsector(sub);
    for (const other of overlappingSubsectors(sub)) {
      const otherHome = sectorOfSubsector(other);
      if (otherHome !== home && chosenSectors.has(otherHome) && !out.includes(other)) {
        out.push(other);
        frontier.push(other);
      }
    }
  }
  return out;
}

/**
 * `chosen` plus, for every chosen shape, its subsectors under a chosen sector
 * that no chosen subsector already reaches the shape through, then the
 * implied closure above. Picking Curated vault under Vaults in a Credit plus
 * Liquidity project ticks Lending; picking a borrowing shape under Fixed
 * income in a Credit-only project leaves Lending alone.
 */
export function withShapeSubsectors(
  chosen: readonly Subsector[],
  shapes: ShapeInput,
  sectors: readonly Sector[],
): Subsector[] {
  const out = [...chosen];
  const chosenSectors = new Set(sectors);
  const added: Subsector[] = [];
  for (const shape of toShapeList(shapes)) {
    const list = SHAPE_SUBSECTORS[shape];
    const reachedFrom = new Set(chosen.filter((s) => list.includes(s)).map(sectorOfSubsector));
    for (const sub of list) {
      const home = sectorOfSubsector(sub);
      if (chosenSectors.has(home) && !reachedFrom.has(home) && !out.includes(sub)) {
        out.push(sub);
        added.push(sub);
      }
    }
  }
  return withImpliedSubsectors(out, sectors, added);
}

/** The subsectors `after` has that `before` did not, in table order. */
export function addedSubsectors(before: readonly Subsector[], after: readonly Subsector[]): Subsector[] {
  const had = new Set(before);
  return SUBSECTOR_VALUES.filter((s) => after.includes(s) && !had.has(s));
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

export type KitId = "credit" | "liquidity" | "derivatives" | "staking" | "rwa" | "other";

export const KIT_ID_VALUES: readonly KitId[] = ["credit", "liquidity", "derivatives", "staking", "rwa", "other"];

/**
 * The kit a sector opens once one of its subsectors is chosen. One kit per
 * sector since M62; the four newer kits get their shapes, steps and files in
 * their own milestones (Derivatives, Staking, RWA, Other).
 */
export const SECTOR_KITS: Record<Sector, KitId> = {
  credit_lending: "credit",
  staking: "staking",
  liquidity_infra: "liquidity",
  perps_derivatives: "derivatives",
  rwa_infra: "rwa",
  other: "other",
};

/**
 * The kits a project qualifies for, in sector order: one per chosen sector
 * that has a kit and at least one chosen subsector of its own.
 */
export function kitsForSectors(
  sectors: readonly Sector[],
  subsectors: readonly Subsector[],
): KitId[] {
  const out: KitId[] = [];
  for (const sector of sectors) {
    const kit = SECTOR_KITS[sector];
    if (!kit || out.includes(kit)) continue;
    if (SECTOR_SUBSECTORS[sector].some((s) => subsectors.includes(s))) out.push(kit);
  }
  return out;
}

export interface ProjectKit {
  /** The first of `kits`, kept so stored docs, exports and MCP readers from before M32 keep working. */
  id: KitId;
  /** Every kit the project's sectors open, in sector order. */
  kits: KitId[];
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
  /** Review pass id to the evidence behind the verdict, a run link or a line (M121, every account). */
  reviewEvidence?: Record<string, string>;
  /** Build steps the team (or its agent) added to a shape's section (M50). */
  customSteps?: CustomStep[];
  /** Catalog build step ids the team removed from its sections (M50). A shared step stores every member id. */
  hiddenSteps?: string[];
  /**
   * Contract template decisions (M63), template id to accepted or rejected.
   * One decision per template per project, shown on every step that lists
   * it. Only decided ids are stored, never injected.
   */
  templates?: Record<string, TemplateDecision>;
  /**
   * Feature ids ticked (M64), "<shape>.f.<slug>" from the feature catalog.
   * A ticked feature shows the build steps it gates and ranks the templates
   * it suggests first. Only ticked ids are stored, never injected.
   */
  features?: string[];
  /**
   * What the team could build with each shape (M68 follow-up), the catalog
   * examples it ticked and the lines it wrote itself. Only ticked and own
   * lines are stored, never injected. Read through the project MCP server
   * and the exports so an agent can add to it.
   */
  ideas?: KitIdea[];
  /**
   * Evidence per ticked build step (M83), step id to one line, a file, a
   * test name, an address, an REA evidence id. Stored for every member id
   * of a shared step. Only non-empty lines are stored, never injected.
   */
  evidence?: Record<string, string>;
  /**
   * Build steps that do not apply to this product (M84), step id to the
   * reason. Left out of progress and shown struck through with the reason,
   * unlike a removed step, which disappears. Stored for every member id of
   * a shared step. Only reasoned ids are stored, never injected.
   */
  notApplicable?: Record<string, string>;
  /** Shapes the team made itself (M176), after the catalog shapes. Read with allShapes(). */
  ownShapes?: OwnShape[];
  /**
   * Where each shape sits (M177): core (part of the product), exploring
   * (being ideated) or later (to add and test later). Keyed by shape id,
   * ours or own; a shape with no entry reads as core.
   */
  shapeLanes?: Record<string, ShapeLane>;
  /** The icon and colour each shape shows with (M177), keyed by shape id, ours or own. */
  shapeStyles?: Record<string, ShapeStyle>;
}

/** The colours a shape can take (M177), theme tokens --shape-<name> in app/globals.css. */
export const SHAPE_COLORS = ["grey", "slate", "indigo", "cyan", "green", "yellow", "orange", "pink", "red"] as const;
export type ShapeColor = (typeof SHAPE_COLORS)[number];

/** A shape's icon (a name from components/build/shape-icons.ts) and colour (M177). */
export interface ShapeStyle {
  icon?: string;
  color?: ShapeColor;
}

export const SHAPE_ICON_NAME = /^[a-z0-9-]{1,40}$/;

/** A shape the team made (M176). `steps` are catalog step ids picked from any of our shapes. */
export interface OwnShape {
  id: OwnShapeId;
  title: string;
  /** One line on what it is. May be empty. */
  detail: string;
  /** The shape it was copied from, when it was. */
  basedOn?: ProductShape;
  steps: string[];
}

/** The three lanes the shapes sort into (M177). */
export const SHAPE_LANES = ["core", "exploring", "later"] as const;
export type ShapeLane = (typeof SHAPE_LANES)[number];

export interface KitIdea {
  shape: ShapeId;
  /** One line. A catalog example is stored by its exact text. */
  text: string;
  /** The catalog example this line was edited from. That example is shown no more while this line exists. */
  from?: string;
}

export type TemplateDecision = "accepted" | "rejected";

export const TEMPLATE_DECISIONS: readonly TemplateDecision[] = ["accepted", "rejected"];

/** A decision or, when none is recorded, open. */
export type TemplateState = TemplateDecision | "open";

/** The milestones an added step can land under (M163); absent reads as design. Launch holds no added steps. */
export const CUSTOM_STEP_MILESTONES = ["design", "testnet", "review"] as const;
export type CustomStepMilestone = (typeof CUSTOM_STEP_MILESTONES)[number];

/** Where an added step came from (M163): the dependency check on the Viability tab. Absent for a step typed by the team or its agent. */
export type CustomStepSource = "dependency";

/** A build step the team added. Ticked through `checklist` like any other, by its id. */
export interface CustomStep {
  /** "custom.<shape>.<n>", unique within the kit. */
  id: string;
  shape: ShapeId;
  /** Further shapes the step serves (M176), beyond `shape`. */
  shapes?: ShapeId[];
  title: string;
  /** What done looks like. May be empty. */
  detail: string;
  /** The milestone it sits under (M163). Absent reads as design. */
  milestone?: CustomStepMilestone;
  source?: CustomStepSource;
}

export type ReviewVerdict = "pass" | "fail" | "na";

export const REVIEW_VERDICTS: readonly ReviewVerdict[] = ["pass", "fail", "na"];

export const KIT_LIMITS = {
  existingProduct: { max: 200 },
  /**
   * Shapes per project, ours and own together (M131, M176): three on Studio,
   * ten on Studio+. Stored docs over it keep working. Read with shapeCap().
   */
  shapes: { max: 3, maxPlus: 10 },
  /** A shape the team makes (M176). */
  ownShapes: { titleMin: 3, titleMax: 60, detailMax: 400, steps: 200 },
  /** Cap on each id list, well above any catalog size. */
  ids: { max: 400 },
  /** Cap on stored checklist entries. */
  checklist: { max: 400 },
  /** Cap on stored review verdicts. */
  review: { max: 200 },
  /** Build steps a team may add across its shapes, and their text. */
  customSteps: { max: 40, titleMin: 3, titleMax: 120, detailMax: 400 },
  /** Cap on removed catalog step ids, well above the number that exist. */
  hiddenSteps: { max: 400 },
  /** Evidence lines per build step (M83). */
  evidence: { max: 400, textMax: 200 },
  /** Not applicable reasons per build step (M84). */
  notApplicable: { max: 400, textMin: 3, textMax: 200 },
  /** Cap on stored contract template decisions, above the catalog size. */
  templates: { max: 400 },
  /** What you could build lines across the shapes, and their text. */
  ideas: { max: 40, textMin: 3, textMax: 160 },
  /** Cap on ticked feature ids, above the catalog size. */
  features: { max: 400 },
} as const;

export function emptyProjectKit(kits: readonly KitId[] = ["credit"]): ProjectKit {
  const list = kits.length ? [...kits] : (["credit"] as KitId[]);
  return { id: list[0], kits: list, shape: "", shapes: [], startingPoint: "", selected: [], dismissed: [] };
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
 * `kits` is what the document's sectors and subsectors qualify for; when it
 * is empty a valid stored id is kept, otherwise "credit". Idempotent.
 */
/** Every shape of the project (M176), ours in table order, then the team's own in the order made. */
export function allShapes(kit: Pick<ProjectKit, "shape" | "shapes" | "ownShapes"> | undefined): ShapeId[] {
  return [...kitShapes(kit), ...(kit?.ownShapes ?? []).map((o) => o.id)];
}

/** The team's own shape by id. */
export function ownShapeOf(kit: Pick<ProjectKit, "ownShapes"> | undefined, id: ShapeId): OwnShape | undefined {
  return isOwnShapeId(id) ? kit?.ownShapes?.find((o) => o.id === id) : undefined;
}

/** How many shapes a project may hold (M176): three on Studio, ten on Studio+. */
export function shapeCap(plus: boolean): number {
  return plus ? KIT_LIMITS.shapes.maxPlus : KIT_LIMITS.shapes.max;
}

/** A fresh own shape id from a title, unique within the kit. */
function ownShapeId(title: string, taken: readonly string[]): OwnShapeId {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "shape";
  let id: OwnShapeId = `own.${base}`;
  for (let n = 2; taken.includes(id); n++) id = `own.${base}-${n}`;
  return id;
}

/** Add a shape the team made (M176). `steps` are the catalog step ids it starts with (a copy fills them). */
export function addOwnShape(
  kit: Pick<ProjectKit, "ownShapes">,
  input: { title: string; detail?: string; basedOn?: ProductShape; steps?: readonly string[] },
): { patch: Pick<ProjectKit, "ownShapes">; id: OwnShapeId } {
  const L = KIT_LIMITS.ownShapes;
  const existing = kit.ownShapes ?? [];
  const title = input.title.trim().slice(0, L.titleMax);
  const id = ownShapeId(title, existing.map((o) => o.id));
  const shape: OwnShape = {
    id,
    title,
    detail: (input.detail ?? "").trim().slice(0, L.detailMax),
    ...(input.basedOn ? { basedOn: input.basedOn } : {}),
    steps: [...new Set(input.steps ?? [])].slice(0, L.steps),
  };
  return { patch: { ownShapes: [...existing, shape] }, id };
}

/** Rename or redescribe an own shape (M176). */
export function editOwnShape(kit: Pick<ProjectKit, "ownShapes">, id: OwnShapeId, next: { title?: string; detail?: string }): Pick<ProjectKit, "ownShapes"> {
  const L = KIT_LIMITS.ownShapes;
  return {
    ownShapes: (kit.ownShapes ?? []).map((o) =>
      o.id === id
        ? { ...o, ...(next.title?.trim() ? { title: next.title.trim().slice(0, L.titleMax) } : {}), ...(next.detail !== undefined ? { detail: next.detail.trim().slice(0, L.detailMax) } : {}) }
        : o,
    ),
  };
}

/** Pick or drop catalog steps on an own shape (M176). */
export function setOwnShapeSteps(kit: Pick<ProjectKit, "ownShapes">, id: OwnShapeId, add: readonly string[], remove: readonly string[] = []): Pick<ProjectKit, "ownShapes"> {
  const drop = new Set(remove);
  return {
    ownShapes: (kit.ownShapes ?? []).map((o) =>
      o.id === id ? { ...o, steps: [...new Set([...o.steps.filter((x) => !drop.has(x)), ...add])].slice(0, KIT_LIMITS.ownShapes.steps) } : o,
    ),
  };
}

/**
 * Remove a shape from everything that names it (M176): its own shape entry,
 * its board cards and ideas, and the steps the team added. A step that
 * serves other shapes stays on them; a step on this shape alone goes.
 */
export function withoutShape(
  kit: Pick<ProjectKit, "ownShapes" | "ideas" | "customSteps" | "shapeStyles" | "shapeLanes">,
  id: ShapeId,
): Pick<ProjectKit, "ownShapes" | "ideas" | "customSteps" | "shapeStyles" | "shapeLanes"> {
  const own = (kit.ownShapes ?? []).filter((o) => o.id !== id);
  const ideas = (kit.ideas ?? []).filter((i) => i.shape !== id);
  const steps: CustomStep[] = [];
  for (const c of kit.customSteps ?? []) {
    const list = customStepShapes(c).filter((x) => x !== id);
    if (!list.length) continue;
    const [first, ...rest] = list;
    steps.push({ ...c, shape: first, ...(rest.length ? { shapes: rest } : { shapes: undefined }) });
  }
  return {
    ownShapes: own.length ? own : undefined,
    ideas: ideas.length ? ideas : undefined,
    customSteps: steps.length ? steps.map(({ shapes, ...c }) => (shapes?.length ? { ...c, shapes } : c)) : undefined,
    ...setShapeStyle(kit, id, { icon: undefined, color: undefined }),
    ...setShapeLane(kit, id, "core"),
  };
}

/** The lane a shape sits in (M177); core when none is set. */
export function laneOf(kit: Pick<ProjectKit, "shapeLanes"> | undefined, shape: ShapeId): ShapeLane {
  return kit?.shapeLanes?.[shape] ?? "core";
}

/** Put a shape in a lane (M177). Core is the default, so it is stored as no entry. */
export function setShapeLane(kit: Pick<ProjectKit, "shapeLanes">, shape: ShapeId, lane: ShapeLane): Pick<ProjectKit, "shapeLanes"> {
  const next: Record<string, ShapeLane> = { ...(kit.shapeLanes ?? {}) };
  if (lane === "core") delete next[shape];
  else next[shape] = lane;
  return { shapeLanes: Object.keys(next).length ? next : undefined };
}

/** Set or clear a shape's icon and colour (M177). Empty values are dropped. */
export function setShapeStyle(kit: Pick<ProjectKit, "shapeStyles">, shape: ShapeId, style: ShapeStyle): Pick<ProjectKit, "shapeStyles"> {
  const next: Record<string, ShapeStyle> = { ...(kit.shapeStyles ?? {}) };
  const merged = { ...(next[shape] ?? {}), ...style };
  const clean: ShapeStyle = { ...(merged.icon ? { icon: merged.icon } : {}), ...(merged.color ? { color: merged.color } : {}) };
  if (clean.icon || clean.color) next[shape] = clean;
  else delete next[shape];
  return { shapeStyles: Object.keys(next).length ? next : undefined };
}

/** Every shape an added step serves, `shape` first (M176). */
export function customStepShapes(c: Pick<CustomStep, "shape" | "shapes">): ShapeId[] {
  return [c.shape, ...(c.shapes ?? []).filter((x) => x !== c.shape)];
}

/** Put an added step on these shapes (M176), at least one. The id stays as made. */
export function setCustomStepShapes(kit: Pick<ProjectKit, "customSteps">, stepId: string, shapes: readonly ShapeId[]): Pick<ProjectKit, "customSteps"> {
  const list = [...new Set(shapes)];
  if (!list.length) return { customSteps: kit.customSteps };
  const [first, ...rest] = list;
  return {
    customSteps: (kit.customSteps ?? []).map((c) => {
      if (c.id !== stepId) return c;
      const { shapes: _old, ...base } = c;
      return { ...base, shape: first, ...(rest.length ? { shapes: rest } : {}) };
    }),
  };
}

export function normalizeProjectKit(raw: unknown, kits: readonly KitId[] = []): ProjectKit | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const storedId = KIT_ID_VALUES.includes(r.id as KitId) ? (r.id as KitId) : "credit";
  const kitList: KitId[] = kits.length ? [...kits] : [storedId];
  const rawShapes = Array.isArray(r.shapes) ? [...(r.shapes as unknown[])] : [];
  if (typeof r.shape === "string" && r.shape) rawShapes.unshift(r.shape);
  const { shape, shapes } = withShapes(
    rawShapes.filter((x): x is ProductShape => PRODUCT_SHAPE_VALUES.includes(x as ProductShape)),
  );
  const startingPoint = STARTING_POINT_VALUES.includes(r.startingPoint as StartingPoint)
    ? (r.startingPoint as StartingPoint)
    : "";
  const kit: ProjectKit = {
    id: kitList[0],
    kits: kitList,
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
  if (r.reviewEvidence && typeof r.reviewEvidence === "object" && !Array.isArray(r.reviewEvidence)) {
    const out: Record<string, string> = {};
    let n = 0;
    for (const [k, v] of Object.entries(r.reviewEvidence as Record<string, unknown>)) {
      if (k && typeof v === "string" && v.trim() && n < KIT_LIMITS.review.max) {
        out[k] = v.trim().slice(0, KIT_LIMITS.evidence.textMax);
        n++;
      }
    }
    if (n > 0) kit.reviewEvidence = out;
  }
  // The team's own shapes first (M176), so steps, ideas and cards may name them.
  if (Array.isArray(r.ownShapes)) {
    const L = KIT_LIMITS.ownShapes;
    const own: OwnShape[] = [];
    for (const raw of r.ownShapes as unknown[]) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      if (!isOwnShapeId(o.id) || own.some((x) => x.id === o.id)) continue;
      if (typeof o.title !== "string" || o.title.trim().length < L.titleMin) continue;
      if (own.length >= KIT_LIMITS.shapes.maxPlus) break;
      own.push({
        id: o.id,
        title: o.title.trim().slice(0, L.titleMax),
        detail: typeof o.detail === "string" ? o.detail.trim().slice(0, L.detailMax) : "",
        ...(isProductShape(o.basedOn) ? { basedOn: o.basedOn } : {}),
        steps: idList(o.steps).slice(0, L.steps),
      });
    }
    if (own.length) kit.ownShapes = own;
  }
  const known = new Set<string>([...PRODUCT_SHAPE_VALUES, ...(kit.ownShapes ?? []).map((o) => o.id)]);
  const isShape = (v: unknown): v is ShapeId => typeof v === "string" && known.has(v);
  if (Array.isArray(r.customSteps)) {
    const L = KIT_LIMITS.customSteps;
    const seen = new Set<string>();
    const steps: CustomStep[] = [];
    for (const raw of r.customSteps as unknown[]) {
      if (!raw || typeof raw !== "object") continue;
      const c = raw as Record<string, unknown>;
      if (typeof c.id !== "string" || !c.id.startsWith("custom.") || seen.has(c.id)) continue;
      if (!isShape(c.shape)) continue;
      if (typeof c.title !== "string" || !c.title.trim()) continue;
      if (steps.length >= L.max) break;
      seen.add(c.id);
      const more = Array.isArray(c.shapes) ? [...new Set((c.shapes as unknown[]).filter(isShape))].filter((x) => x !== c.shape) : [];
      steps.push({
        id: c.id,
        shape: c.shape,
        ...(more.length ? { shapes: more } : {}),
        title: c.title.slice(0, L.titleMax),
        detail: typeof c.detail === "string" ? c.detail.slice(0, L.detailMax) : "",
        ...(CUSTOM_STEP_MILESTONES.includes(c.milestone as CustomStepMilestone) ? { milestone: c.milestone as CustomStepMilestone } : {}),
        ...(c.source === "dependency" ? { source: "dependency" as const } : {}),
      });
    }
    if (steps.length) kit.customSteps = steps;
  }
  const hidden = idList(r.hiddenSteps).slice(0, KIT_LIMITS.hiddenSteps.max);
  if (hidden.length) kit.hiddenSteps = hidden;
  if (Array.isArray(r.ideas)) {
    const L = KIT_LIMITS.ideas;
    const seen = new Set<string>();
    const ideas: KitIdea[] = [];
    for (const raw of r.ideas as unknown[]) {
      if (!raw || typeof raw !== "object") continue;
      const c = raw as Record<string, unknown>;
      if (!isShape(c.shape)) continue;
      if (typeof c.text !== "string" || !c.text.trim()) continue;
      const text = c.text.trim().slice(0, L.textMax);
      const key = `${c.shape}\n${text}`;
      if (seen.has(key) || ideas.length >= L.max) continue;
      seen.add(key);
      const from = typeof c.from === "string" && c.from.trim() ? c.from.trim().slice(0, L.textMax) : undefined;
      ideas.push({ shape: c.shape, text, ...(from ? { from } : {}) });
    }
    if (ideas.length) kit.ideas = ideas;
  }
  if (r.templates && typeof r.templates === "object" && !Array.isArray(r.templates)) {
    const decisions: Record<string, TemplateDecision> = {};
    let n = 0;
    for (const [k, v] of Object.entries(r.templates as Record<string, unknown>)) {
      if (k && TEMPLATE_DECISIONS.includes(v as TemplateDecision) && n < KIT_LIMITS.templates.max) {
        decisions[k] = v as TemplateDecision;
        n++;
      }
    }
    if (n > 0) kit.templates = decisions;
  }
  const features = idList(r.features).slice(0, KIT_LIMITS.features.max);
  if (features.length) kit.features = features;
  if (r.shapeLanes && typeof r.shapeLanes === "object" && !Array.isArray(r.shapeLanes)) {
    const lanes: Record<string, ShapeLane> = {};
    for (const [k, v] of Object.entries(r.shapeLanes as Record<string, unknown>))
      if (isShape(k) && (v === "exploring" || v === "later")) lanes[k] = v;
    if (Object.keys(lanes).length) kit.shapeLanes = lanes;
  }
  if (r.shapeStyles && typeof r.shapeStyles === "object" && !Array.isArray(r.shapeStyles)) {
    const styles: Record<string, ShapeStyle> = {};
    for (const [k, v] of Object.entries(r.shapeStyles as Record<string, unknown>)) {
      if (!isShape(k) || !v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const icon = typeof o.icon === "string" && SHAPE_ICON_NAME.test(o.icon) ? o.icon : undefined;
      const color = SHAPE_COLORS.includes(o.color as ShapeColor) ? (o.color as ShapeColor) : undefined;
      if (icon || color) styles[k] = { ...(icon ? { icon } : {}), ...(color ? { color } : {}) };
    }
    if (Object.keys(styles).length) kit.shapeStyles = styles;
  }
  if (r.evidence && typeof r.evidence === "object" && !Array.isArray(r.evidence)) {
    const L = KIT_LIMITS.evidence;
    const lines: Record<string, string> = {};
    let n = 0;
    for (const [k, v] of Object.entries(r.evidence as Record<string, unknown>)) {
      if (!k || typeof v !== "string" || !v.trim() || n >= L.max) continue;
      lines[k] = v.trim().slice(0, L.textMax);
      n++;
    }
    if (n > 0) kit.evidence = lines;
  }
  if (r.notApplicable && typeof r.notApplicable === "object" && !Array.isArray(r.notApplicable)) {
    const L = KIT_LIMITS.notApplicable;
    const reasons: Record<string, string> = {};
    let n = 0;
    for (const [k, v] of Object.entries(r.notApplicable as Record<string, unknown>)) {
      if (!k || typeof v !== "string" || v.trim().length < L.textMin || n >= L.max) continue;
      reasons[k] = v.trim().slice(0, L.textMax);
      n++;
    }
    if (n > 0) kit.notApplicable = reasons;
  }
  return kit;
}

/**
 * Bounds only. The kit never blocks publishing; it just has to be well
 * formed and, when `expected` is given, agree with the document's sectors.
 */
export function validateProjectKit(kit: ProjectKit, expected: readonly KitId[] = []): string | null {
  if (!KIT_ID_VALUES.includes(kit.id)) return "Unknown research kit.";
  if (!Array.isArray(kit.kits) || kit.kits.some((k) => !KIT_ID_VALUES.includes(k)))
    return "Unknown research kit.";
  if (kit.kits.length === 0 || kit.kits[0] !== kit.id) return "Research kits are out of step.";
  if (expected.length && (expected.length !== kit.kits.length || expected.some((k, i) => k !== kit.kits[i])))
    return "Research kits are out of step.";
  if (kit.shape && !PRODUCT_SHAPE_VALUES.includes(kit.shape)) return "Unknown product shape.";
  if (kit.shapes.some((s) => !PRODUCT_SHAPE_VALUES.includes(s))) return "Unknown product shape.";
  // Stored docs from before the cap (M131) may hold more shapes than the picker allows now.
  if (new Set(kit.shapes).size !== kit.shapes.length || kit.shapes.length > PRODUCT_SHAPE_VALUES.length)
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
  if (kit.customSteps) {
    const L = KIT_LIMITS.customSteps;
    if (kit.customSteps.length > L.max) return `At most ${L.max} added build steps.`;
    for (const c of kit.customSteps) {
      if (customStepShapes(c).some((x) => !isProductShape(x) && !ownShapeOf(kit, x))) return "An added build step names an unknown product shape.";
      if (c.title.trim().length < L.titleMin) return `An added build step needs a title of at least ${L.titleMin} characters.`;
      if (c.title.length > L.titleMax) return `An added build step title is over ${L.titleMax} characters.`;
      if (c.detail.length > L.detailMax) return `An added build step detail is over ${L.detailMax} characters.`;
    }
  }
  if ((kit.hiddenSteps?.length ?? 0) > KIT_LIMITS.hiddenSteps.max) return "Too many removed build steps.";
  if (kit.ownShapes) {
    const L = KIT_LIMITS.ownShapes;
    for (const o of kit.ownShapes) {
      if (!isOwnShapeId(o.id)) return "A shape you made has an unreadable id.";
      if (o.title.trim().length < L.titleMin) return `A shape you made needs a name of at least ${L.titleMin} characters.`;
      if (o.title.length > L.titleMax) return `A shape name is over ${L.titleMax} characters.`;
      if (o.detail.length > L.detailMax) return `A shape description is over ${L.detailMax} characters.`;
    }
  }

  if (kit.evidence) {
    const L = KIT_LIMITS.evidence;
    const entries = Object.entries(kit.evidence);
    if (entries.length > L.max) return "Too many evidence lines.";
    if (entries.some(([, v]) => v.length > L.textMax)) return `An evidence line is over ${L.textMax} characters.`;
  }
  if (kit.notApplicable) {
    const L = KIT_LIMITS.notApplicable;
    const entries = Object.entries(kit.notApplicable);
    if (entries.length > L.max) return "Too many not applicable steps.";
    if (entries.some(([, v]) => v.trim().length < L.textMin)) return `A not applicable reason needs at least ${L.textMin} characters.`;
    if (entries.some(([, v]) => v.length > L.textMax)) return `A not applicable reason is over ${L.textMax} characters.`;
  }
  if (kit.ideas) {
    const L = KIT_LIMITS.ideas;
    if (kit.ideas.length > L.max) return `At most ${L.max} lines under what you could build.`;
    for (const i of kit.ideas) {
      if (!isProductShape(i.shape) && !ownShapeOf(kit, i.shape)) return "A what you could build line names an unknown product shape.";
      if (i.text.trim().length < L.textMin) return `A what you could build line needs at least ${L.textMin} characters.`;
      if (i.text.length > L.textMax) return `A what you could build line is over ${L.textMax} characters.`;
    }
  }
  if (kit.templates) {
    const entries = Object.entries(kit.templates);
    if (entries.length > KIT_LIMITS.templates.max) return "Too many template decisions.";
    if (entries.some(([, v]) => !TEMPLATE_DECISIONS.includes(v))) return "Unknown template decision.";
  }
  if ((kit.features?.length ?? 0) > KIT_LIMITS.features.max) return "Too many features.";
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

// ---------------------------------------------------------------------------
// Contract template decisions (M63). The catalog lives in content/templates;
// here only the stored map and its arithmetic.

export function templateState(kit: Pick<ProjectKit, "templates"> | undefined, id: string): TemplateState {
  return kit?.templates?.[id] ?? "open";
}

/** Set or clear one decision. Never stores an empty map. */
export function setTemplateDecision(
  kit: Pick<ProjectKit, "templates">,
  id: string,
  decision: TemplateDecision | null,
): Pick<ProjectKit, "templates"> {
  const next: Record<string, TemplateDecision> = { ...(kit.templates ?? {}) };
  if (decision) next[id] = decision;
  else delete next[id];
  return Object.keys(next).length ? { templates: next } : { templates: undefined };
}

/** Counts over a list of template ids, each once. */
export function templateCounts(
  ids: readonly string[],
  kit: Pick<ProjectKit, "templates"> | undefined,
): { accepted: number; rejected: number; open: number; total: number } {
  const out = { accepted: 0, rejected: 0, open: 0, total: 0 };
  for (const id of new Set(ids)) {
    out.total++;
    out[templateState(kit, id)]++;
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

/** Record or clear the evidence behind a review pass (M121). */
export function setReviewEvidence(kit: Pick<ProjectKit, "reviewEvidence">, id: string, text: string | null): Pick<ProjectKit, "reviewEvidence"> {
  const next: Record<string, string> = { ...(kit.reviewEvidence ?? {}) };
  const t = text?.trim().slice(0, KIT_LIMITS.evidence.textMax);
  if (t) next[id] = t;
  else delete next[id];
  return Object.keys(next).length ? { reviewEvidence: next } : { reviewEvidence: undefined };
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
  /** Contract template ids that fit this item (M61). The team accepts or rejects each on the kit. */
  templates?: readonly string[];
  /** A feature id (M64). The step is listed only while the team has that feature ticked. */
  feature?: string;
}

// ---------------------------------------------------------------------------
// Features (M64). What a product includes, as choices the team ticks. A
// ticked feature adds the build steps that carry its id and ranks the
// templates it suggests first on every step of the shape. Nothing is ever
// removed by a feature. Content lives in content/kits/features.

export interface FeatureItem {
  /** "<shape>.f.<slug>", immutable once shipped. */
  id: string;
  title: string;
  /** One or two sentences on what choosing it means and what it adds. */
  detail: string;
  /** Contract template ids this feature suggests. */
  templates?: readonly string[];
}

export type FeatureLists = Partial<Record<ProductShape, readonly FeatureItem[]>>;

// ---------------------------------------------------------------------------
// What you could build (M68 follow-up). Ticked catalog examples and own lines.

export function ideasFor(kit: Pick<ProjectKit, "ideas"> | undefined, shape: ShapeId): KitIdea[] {
  return (kit?.ideas ?? []).filter((i) => i.shape === shape);
}

export function hasIdea(kit: Pick<ProjectKit, "ideas"> | undefined, shape: ShapeId, text: string): boolean {
  return (kit?.ideas ?? []).some((i) => i.shape === shape && i.text === text);
}

/** Tick or untick one line. Never stores an empty list. */
export function toggleIdea(
  kit: Pick<ProjectKit, "ideas">,
  shape: ShapeId,
  text: string,
  on: boolean,
): Pick<ProjectKit, "ideas"> {
  const clean = text.trim().slice(0, KIT_LIMITS.ideas.textMax);
  const rest = (kit.ideas ?? []).filter((i) => !(i.shape === shape && i.text === clean));
  const next = on && clean ? [...rest, { shape, text: clean }].slice(0, KIT_LIMITS.ideas.max) : rest;
  return { ideas: next.length ? next : undefined };
}

/**
 * Replace one line with another (M68 follow-up). Editing a catalog example
 * stores the new text as the team's own line with `from` set, so the example
 * steps aside while the edit exists and comes back when the line is removed.
 * Editing an own line keeps its `from`.
 */
export function editIdea(
  kit: Pick<ProjectKit, "ideas">,
  shape: ShapeId,
  prevText: string,
  nextText: string,
  isCatalog: boolean,
): Pick<ProjectKit, "ideas"> {
  const clean = nextText.trim().slice(0, KIT_LIMITS.ideas.textMax);
  if (!clean || clean === prevText) return { ideas: kit.ideas };
  const prev = (kit.ideas ?? []).find((i) => i.shape === shape && i.text === prevText);
  const from = isCatalog ? prevText : prev?.from;
  const rest = (kit.ideas ?? []).filter((i) => !(i.shape === shape && (i.text === prevText || i.text === clean)));
  const line: KitIdea = { shape, text: clean, ...(from ? { from } : {}) };
  return { ideas: [...rest, line].slice(0, KIT_LIMITS.ideas.max) };
}

/**
 * The lines of a shape with the catalog examples first, each flagged own or
 * catalog. A catalog example an own line was edited from is left out.
 */
export function ideaRows(
  kit: Pick<ProjectKit, "ideas"> | undefined,
  shape: ShapeId,
  examples: readonly string[],
): Array<{ text: string; on: boolean; own: boolean; from?: string }> {
  const mine = ideasFor(kit, shape);
  const replaced = new Set(mine.map((i) => i.from).filter((x): x is string => Boolean(x)));
  const own = mine.filter((i) => !examples.includes(i.text));
  return [
    ...examples.filter((t) => !replaced.has(t)).map((text) => ({ text, on: hasIdea(kit, shape, text), own: false })),
    ...own.map((i) => (i.from ? { text: i.text, on: true, own: true, from: i.from } : { text: i.text, on: true, own: true })),
  ];
}

export const FEATURE_ID = /^[a-z0-9_]+\.f\.[a-z0-9-]+$/;

export function hasFeature(kit: Pick<ProjectKit, "features"> | undefined, id: string): boolean {
  return kit?.features?.includes(id) ?? false;
}

/** Tick or untick one feature. Never stores an empty list. */
export function toggleFeature(
  kit: Pick<ProjectKit, "features">,
  id: string,
  on: boolean,
): Pick<ProjectKit, "features"> {
  const next = (kit.features ?? []).filter((f) => f !== id);
  if (on) next.push(id);
  return next.length ? { features: next } : { features: undefined };
}

export function featureProgress(
  items: readonly FeatureItem[],
  kit: Pick<ProjectKit, "features"> | undefined,
): { on: number; total: number } {
  return { on: items.filter((f) => hasFeature(kit, f.id)).length, total: items.length };
}

/** Feature ids among `on` that suggest the template, catalog order. */
export function featuresSuggesting(
  features: readonly FeatureItem[],
  kit: Pick<ProjectKit, "features"> | undefined,
  templateId: string,
): FeatureItem[] {
  return features.filter((f) => hasFeature(kit, f.id) && f.templates?.includes(templateId));
}

/** The catalog step ids a feature gates, from the checklists. */
export function featureStepIds(lists: ChecklistLists, featureId: string): string[] {
  return Object.values(lists)
    .flatMap((items) => items ?? [])
    .filter((i) => i.feature === featureId)
    .map((i) => i.id);
}

export function assertFeatures(
  lists: FeatureLists,
  checklists: ChecklistLists,
  knownTemplateIds: ReadonlySet<string>,
): void {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const [shape, items] of Object.entries(lists)) {
    for (const f of items ?? []) {
      if (seen.has(f.id)) problems.push(`duplicate feature id ${f.id}`);
      seen.add(f.id);
      if (!FEATURE_ID.test(f.id)) problems.push(`bad feature id ${f.id}`);
      if (!f.id.startsWith(`${shape}.f.`)) problems.push(`${f.id} is not under ${shape}`);
      if (!f.title.trim()) problems.push(`${f.id} has no title`);
      for (const t of f.templates ?? [])
        if (!knownTemplateIds.has(t)) problems.push(`${f.id} suggests unknown template ${t}`);
    }
  }
  for (const [shape, items] of Object.entries(checklists))
    for (const item of items ?? [])
      if (item.feature) {
        if (!seen.has(item.feature)) problems.push(`${item.id} is gated by unknown feature ${item.feature}`);
        else if (!item.feature.startsWith(`${shape}.f.`)) problems.push(`${item.id} is gated by a feature of another shape`);
      }
  if (problems.length) throw new Error(`Kit features are invalid. ${problems.join("; ")}`);
}

export function checklistProgress(
  items: readonly ChecklistItem[],
  kit: Pick<ProjectKit, "checklist"> | undefined,
): { done: number; total: number } {
  const done = kit?.checklist ?? {};
  return { done: items.filter((i) => done[i.id] === true).length, total: items.length };
}

/** Set or clear the evidence line of one step id (M83). Empty text clears. */
export function setStepEvidence(
  kit: Pick<ProjectKit, "evidence">,
  id: string,
  text: string | null,
): Pick<ProjectKit, "evidence"> {
  const next: Record<string, string> = { ...(kit.evidence ?? {}) };
  const clean = text?.trim().slice(0, KIT_LIMITS.evidence.textMax) ?? "";
  if (clean) next[id] = clean;
  else delete next[id];
  return Object.keys(next).length ? { evidence: next } : { evidence: undefined };
}

/** The evidence line of a group, the first member id that has one. */
export function groupEvidence(group: Pick<StepGroup, "ids">, kit: Pick<ProjectKit, "evidence"> | undefined): string | null {
  for (const id of group.ids) {
    const line = kit?.evidence?.[id];
    if (line) return line;
  }
  return null;
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
  knownTemplateIds: ReadonlySet<string> = new Set(),
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
      for (const t of item.templates ?? [])
        if (!knownTemplateIds.has(t)) problems.push(`${item.id} references unknown template ${t}`);
    }
  }
  if (problems.length) throw new Error(`Kit checklists are invalid. ${problems.join("; ")}`);
}

// ---------------------------------------------------------------------------
// Build step groups (M43). Steps that are the same work across shapes are
// declared in content/kits/checklists/shared.ts and shown once. Storage
// keeps the per-shape ids; a group is done when every member id is ticked.

export interface SharedStep {
  slug: string;
  /** Shapes whose "<shape>.<slug>" is the same work. At least two. */
  shapes: readonly ProductShape[];
  /** Wording that reads across the shapes. Falls back to the leading item's. */
  title?: string;
  detail?: string;
}

export interface StepGroup {
  /** Id of the leading item, "<homeShape>.<slug>". Stable React key. */
  key: string;
  slug: string;
  title: string;
  detail: string;
  step: KitStep;
  /** Union over the members, first seen order, each once. */
  resources: readonly string[];
  /** Contract template ids over the members, first seen order, each once (M61). */
  templates: readonly string[];
  /** The feature that gates the leading item (M64). Absent for an always-on step. */
  feature?: string;
  /** Every member id among the chosen shapes, table order. */
  ids: readonly string[];
  /** Chosen shapes carrying it, table order. shapes[0] is where it is listed. Own shapes (M176) come after ours. */
  shapes: readonly ShapeId[];
  /** True for a step the team added (M50). One id, one shape, no resources. */
  custom?: true;
  /** An added step's milestone (M163), when it was given one. */
  milestone?: CustomStepMilestone;
  /** Where an added step came from (M163). */
  source?: CustomStepSource;
}

export interface ProductSection {
  shape: ShapeId;
  /** Groups listed here, in this shape's own list order. */
  groups: StepGroup[];
  /** Groups this shape carries that are listed under an earlier shape. */
  sharedAbove: StepGroup[];
}

export type ChecklistLists = Partial<Record<ProductShape, readonly ChecklistItem[]>>;

/** One section per chosen shape, in table order, shared steps under the first shape that has them. */
export function productSectionsFor(
  lists: ChecklistLists,
  shared: readonly SharedStep[],
  shapes: ShapeInput,
): ProductSection[] {
  const chosen = toShapeList(shapes);
  const chosenSet = new Set(chosen);
  const byId = new Map<string, ChecklistItem>();
  for (const shape of chosen) for (const item of lists[shape] ?? []) byId.set(item.id, item);
  const emitted = new Map<string, StepGroup>();
  const sections: ProductSection[] = [];
  for (const shape of chosen) {
    const section: ProductSection = { shape, groups: [], sharedAbove: [] };
    for (const item of lists[shape] ?? []) {
      const slug = item.id.slice(shape.length + 1);
      const entry = shared.find((e) => e.slug === slug && e.shapes.includes(shape));
      const members = entry ? entry.shapes.filter((m) => chosenSet.has(m)) : [shape];
      const home = members[0];
      if (home !== shape) {
        const above = emitted.get(`${home}.${slug}`);
        if (above) section.sharedAbove.push(above);
        continue;
      }
      const ids = members.map((m) => `${m}.${slug}`).filter((id) => byId.has(id));
      const resources: string[] = [];
      for (const id of ids)
        for (const r of byId.get(id)?.resources ?? []) if (!resources.includes(r)) resources.push(r);
      const templates: string[] = [];
      for (const id of ids)
        for (const t of byId.get(id)?.templates ?? []) if (!templates.includes(t)) templates.push(t);
      const group: StepGroup = {
        key: item.id,
        slug,
        title: entry?.title ?? item.title,
        detail: entry?.detail ?? item.detail,
        step: item.step,
        resources,
        templates,
        ...(item.feature ? { feature: item.feature } : {}),
        ids,
        shapes: members,
      };
      emitted.set(item.id, group);
      section.groups.push(group);
    }
    sections.push(section);
  }
  return sections;
}

export function stepGroupsFor(
  lists: ChecklistLists,
  shared: readonly SharedStep[],
  shapes: ShapeInput,
): StepGroup[] {
  return productSectionsFor(lists, shared, shapes).flatMap((s) => s.groups);
}

export type GroupState = "done" | "partial" | "open" | "na";

type StepStateKit = Pick<ProjectKit, "checklist" | "notApplicable">;

/**
 * na when every member id is marked not applicable (M84), done when every
 * member id is ticked, partial when some are (an agent ticked one shape's id).
 */
export function groupState(group: StepGroup, kit: StepStateKit | undefined): GroupState {
  const na = kit?.notApplicable ?? {};
  if (group.ids.every((id) => Boolean(na[id]))) return "na";
  const done = kit?.checklist ?? {};
  const n = group.ids.filter((id) => done[id] === true).length;
  return n === group.ids.length ? "done" : n === 0 ? "open" : "partial";
}

/** The reason a group does not apply, the first member id that has one. */
export function groupReason(group: Pick<StepGroup, "ids">, kit: Pick<ProjectKit, "notApplicable"> | undefined): string | null {
  for (const id of group.ids) {
    const reason = kit?.notApplicable?.[id];
    if (reason) return reason;
  }
  return null;
}

/** Done of total, with the steps that do not apply left out of both (M84). */
export function groupProgress(
  groups: readonly StepGroup[],
  kit: StepStateKit | undefined,
): { done: number; total: number } {
  const counted = groups.filter((g) => groupState(g, kit) !== "na");
  return { done: counted.filter((g) => groupState(g, kit) === "done").length, total: counted.length };
}

/**
 * Mark every member id of a group not applicable with a reason, which also
 * unticks it, or clear the mark (M84). Never stores an empty record.
 */
export function setGroupNotApplicable(
  kit: StepStateKit,
  group: Pick<StepGroup, "ids">,
  reason: string | null,
): StepStateKit {
  const clean = reason?.trim().slice(0, KIT_LIMITS.notApplicable.textMax) ?? "";
  const next: Record<string, string> = { ...(kit.notApplicable ?? {}) };
  let checklist: Pick<ProjectKit, "checklist"> = { checklist: kit.checklist };
  for (const id of group.ids) {
    if (clean) {
      next[id] = clean;
      checklist = toggleChecklistItem(checklist, id, false);
    } else delete next[id];
  }
  return { ...checklist, notApplicable: Object.keys(next).length ? next : undefined };
}

/** Tick or clear every member id of a group. Never stores false. */
export function toggleStepGroup(
  kit: Pick<ProjectKit, "checklist">,
  group: StepGroup,
  done: boolean,
): Pick<ProjectKit, "checklist"> {
  let next: Pick<ProjectKit, "checklist"> = { checklist: kit.checklist };
  for (const id of group.ids) next = toggleChecklistItem(next, id, done);
  return next;
}

// ---------------------------------------------------------------------------
// Added and removed steps (M50). The catalog sections above are the
// starting point; a team removes steps that do not apply (a shared step
// goes for every shape it serves) and adds its own under a shape. Both live
// on the kit, so they travel with the project into exports and the MCP tools.

type KitSteps = Pick<ProjectKit, "customSteps" | "hiddenSteps">;

function isHidden(group: StepGroup, hidden: ReadonlySet<string>): boolean {
  return group.ids.length > 0 && group.ids.every((id) => hidden.has(id));
}

function customGroup(c: CustomStep, shapes: readonly ShapeId[] = customStepShapes(c)): StepGroup {
  return {
    key: c.id,
    slug: "custom",
    title: c.title,
    detail: c.detail,
    // Added steps carry no editor step. The section shows a "Your step" badge instead.
    step: "review",
    resources: [],
    templates: [],
    ids: [c.id],
    shapes,
    custom: true,
    ...(c.milestone ? { milestone: c.milestone } : {}),
    ...(c.source ? { source: c.source } : {}),
  };
}

/**
 * One section per own shape after the catalog sections (M176). Each picked
 * catalog step id becomes a group; an id a catalog section (or an earlier
 * own section) already lists goes under sharedAbove there, with the own
 * shape added to that group's shapes, so it is counted once. `lookup`
 * finds a catalog item by id across all our shapes.
 */
export function withOwnShapes(
  sections: readonly ProductSection[],
  own: readonly OwnShape[],
  lookup: (id: string) => ChecklistItem | undefined,
): ProductSection[] {
  if (!own.length) return [...sections];
  const extra = new Map<string, ShapeId[]>();
  const byId = new Map<string, StepGroup>();
  for (const section of sections) for (const g of section.groups) for (const id of g.ids) byId.set(id, g);
  const added: ProductSection[] = [];
  for (const o of own) {
    const section: ProductSection = { shape: o.id, groups: [], sharedAbove: [] };
    for (const id of o.steps) {
      const above = byId.get(id);
      if (above) {
        extra.set(above.key, [...(extra.get(above.key) ?? []), o.id]);
        if (!section.sharedAbove.includes(above)) section.sharedAbove.push(above);
        continue;
      }
      const item = lookup(id);
      if (!item) continue;
      const group: StepGroup = {
        key: item.id,
        slug: item.id.slice(item.id.indexOf(".") + 1),
        title: item.title,
        detail: item.detail,
        step: item.step,
        resources: [...item.resources],
        templates: [...(item.templates ?? [])],
        ids: [item.id],
        shapes: [o.id],
      };
      byId.set(id, group);
      section.groups.push(group);
    }
    added.push(section);
  }
  // A shared group carries every shape it serves, ours then own.
  const widen = (g: StepGroup): StepGroup => (extra.has(g.key) ? { ...g, shapes: [...g.shapes, ...extra.get(g.key)!.filter((x) => !g.shapes.includes(x))] } : g);
  const widened = new Map<StepGroup, StepGroup>();
  const map = (g: StepGroup) => {
    if (!widened.has(g)) widened.set(g, widen(g));
    return widened.get(g)!;
  };
  return [...sections, ...added].map((section) => ({ shape: section.shape, groups: section.groups.map(map), sharedAbove: section.sharedAbove.map(map) }));
}

/** The catalog sections without the steps whose feature the kit has not ticked (M64). */
export function withFeatureSteps(
  sections: readonly ProductSection[],
  kit: Pick<ProjectKit, "features"> | undefined,
): ProductSection[] {
  const keep = (g: StepGroup) => !g.feature || hasFeature(kit, g.feature);
  return sections.map((section) => ({
    shape: section.shape,
    groups: section.groups.filter(keep),
    sharedAbove: section.sharedAbove.filter(keep),
  }));
}

/**
 * The sections with the kit's removals taken out and its added steps
 * appended. A step on several shapes (M176) is listed under the first of
 * them that has a section and shown as shared under the others.
 */
export function withKitSteps(sections: readonly ProductSection[], kit: KitSteps | undefined): ProductSection[] {
  const hidden = new Set(kit?.hiddenSteps ?? []);
  const present = sections.map((s) => s.shape);
  const custom = (kit?.customSteps ?? []).map((c) => {
    const shapes = customStepShapes(c).filter((x) => present.includes(x));
    return { home: shapes[0], group: customGroup(c, shapes) };
  });
  return sections.map((section) => ({
    shape: section.shape,
    groups: [...section.groups.filter((g) => !isHidden(g, hidden)), ...custom.filter((c) => c.home === section.shape).map((c) => c.group)],
    sharedAbove: [
      ...section.sharedAbove.filter((g) => !isHidden(g, hidden)),
      ...custom.filter((c) => c.home !== section.shape && c.group.shapes.includes(section.shape)).map((c) => c.group),
    ],
  }));
}

/** The catalog groups a kit removed, by the shape whose section listed them. */
export function removedGroups(
  sections: readonly ProductSection[],
  kit: KitSteps | undefined,
): Map<ShapeId, StepGroup[]> {
  const hidden = new Set(kit?.hiddenSteps ?? []);
  const out = new Map<ShapeId, StepGroup[]>();
  for (const section of sections) {
    const gone = section.groups.filter((g) => isHidden(g, hidden));
    if (gone.length) out.set(section.shape, gone);
  }
  return out;
}

/**
 * Add a step under a shape, or several (M176). The id is "custom.<first
 * shape>.<n>", n one past the highest in use. `opts` gives it a milestone
 * and a source (M163).
 */
export function addCustomStep(
  kit: KitSteps,
  shapeOrShapes: ShapeId | readonly ShapeId[],
  title: string,
  detail = "",
  opts: { milestone?: CustomStepMilestone; source?: CustomStepSource } = {},
): Pick<ProjectKit, "customSteps"> {
  const L = KIT_LIMITS.customSteps;
  const existing = kit.customSteps ?? [];
  const list = typeof shapeOrShapes === "string" ? [shapeOrShapes] : [...new Set(shapeOrShapes)];
  const [shape, ...more] = list;
  if (existing.length >= L.max || !shape) return { customSteps: existing };
  const prefix = `custom.${shape}.`;
  const n =
    existing
      .filter((c) => c.id.startsWith(prefix))
      .map((c) => Number(c.id.slice(prefix.length)) || 0)
      .reduce((a, b) => Math.max(a, b), 0) + 1;
  return {
    customSteps: [
      ...existing,
      {
        id: `${prefix}${n}`,
        shape,
        ...(more.length ? { shapes: more } : {}),
        title: title.trim().slice(0, L.titleMax),
        detail: detail.trim().slice(0, L.detailMax),
        ...(opts.milestone ? { milestone: opts.milestone } : {}),
        ...(opts.source ? { source: opts.source } : {}),
      },
    ],
  };
}

/**
 * Remove a step from its section. An added step is deleted with its tick; a
 * catalog step is hidden, every member id of a shared one, so it can be
 * restored later with its ticks intact.
 */
export function removeStepGroup(
  kit: KitSteps & Pick<ProjectKit, "checklist" | "evidence">,
  group: StepGroup,
): Pick<ProjectKit, "customSteps" | "hiddenSteps" | "checklist" | "evidence"> {
  if (group.custom) {
    const rest = (kit.customSteps ?? []).filter((c) => c.id !== group.key);
    return {
      customSteps: rest.length ? rest : undefined,
      hiddenSteps: kit.hiddenSteps,
      ...toggleChecklistItem(kit, group.key, false),
      ...setStepEvidence(kit, group.key, null),
    };
  }
  const hidden = [...new Set([...(kit.hiddenSteps ?? []), ...group.ids])].slice(0, KIT_LIMITS.hiddenSteps.max);
  let evidence: Pick<ProjectKit, "evidence"> = { evidence: kit.evidence };
  for (const id of group.ids) evidence = setStepEvidence(evidence, id, null);
  return { customSteps: kit.customSteps, hiddenSteps: hidden, checklist: kit.checklist, ...evidence };
}

/** Bring removed catalog steps back. */
export function restoreSteps(kit: KitSteps, ids: readonly string[]): Pick<ProjectKit, "hiddenSteps"> {
  const back = new Set(ids);
  const rest = (kit.hiddenSteps ?? []).filter((id) => !back.has(id));
  return { hiddenSteps: rest.length ? rest : undefined };
}

export function assertSharedSteps(lists: ChecklistLists, shared: readonly SharedStep[]): void {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const entry of shared) {
    if (entry.shapes.length < 2) problems.push(`${entry.slug} names fewer than two shapes`);
    if (new Set(entry.shapes).size !== entry.shapes.length) problems.push(`${entry.slug} repeats a shape`);
    let step: KitStep | null = null;
    for (const shape of entry.shapes) {
      const id = `${shape}.${entry.slug}`;
      const item = (lists[shape] ?? []).find((i) => i.id === id);
      if (!item) {
        problems.push(`${id} does not exist`);
        continue;
      }
      if (seen.has(id)) problems.push(`${id} is in two shared entries`);
      seen.add(id);
      if (step === null) step = item.step;
      else if (step !== item.step) problems.push(`${id} is on step ${item.step}, not ${step}`);
    }
  }
  if (problems.length) throw new Error(`Shared build steps are invalid. ${problems.join("; ")}`);
}

// ---------------------------------------------------------------------------
// Where a shape can run today

export type DeploymentStatus = "official" | "community" | "manifest_only" | "none";

export interface FamilyEnvironment {
  family: Exclude<KitFamily, "shared">;
  testnet: { chainId: number; status: DeploymentStatus; note: string; source?: string };
  mainnet: { chainId: number; status: DeploymentStatus; note: string; source?: string };
  /** The recommended path from first commit to production, in order. */
  devPath: readonly string[];
  /** ISO date the row was last checked against the world. */
  checkedOn: string;
}

/** Protocol families a shape relies on. The chain itself is always implied, Boros never. */
export const SHAPE_FAMILIES: Record<ProductShape, readonly Exclude<KitFamily, "shared" | "robinhood" | "arbitrum">[]> = {
  curated_vault: ["morpho"],
  embedded_earn: ["morpho"],
  collateral_loans: ["morpho"],
  fixed_rate_yield: ["pendle"],
  embedded_fixed_rate: ["pendle"],
  pt_backed_borrowing: ["pendle", "morpho"],
  leveraged_fixed_yield: ["pendle", "morpho"],
  yield_token_exposure: ["pendle"],
  liquidity_allocator: ["morpho"],
  permissioned_vault: ["morpho"],
  basic_amm_pool: ["uniswap"],
  concentrated_liquidity_pool: ["uniswap"],
  hook_pool: ["uniswap"],
  // Template-driven shapes (M65 to M68) rely on no single family. Chain fit
  // comes from the contract templates on their steps, per template.
  perp_exchange: [],
  option_vault: [],
  delta_neutral_vault: [],
  liquid_staking_token: [],
  restaking_service: [],
  liquid_restaking_token: [],
  tokenized_security: [],
  private_credit_pool: [],
  asset_backed_token: [],
  cover_pool: [],
  governance_stack: [],
};

/** Environment rows for the given shapes, the chain's own row first, each family once, from whatever rows exist. */
export function environmentPlanFor(
  shapes: ShapeInput,
  rows: EnvironmentRows,
  base: "robinhood" | "arbitrum" = "robinhood",
): FamilyEnvironment[] {
  const list = toShapeList(shapes);
  if (!list.length) return [];
  const out: FamilyEnvironment[] = [];
  const rh = rows[base];
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
// Where a shape runs on the project's testnet (M41, a note since M52). A
// shape runs when every protocol family it relies on has a deployment on the
// chain's testnet, official or community. Until M52 a shape that did not run
// could not be picked. Now it can, the studio says which protocol is missing,
// and the team or its agent writes the build steps that fit. Rows are passed
// in so this file keeps no content import; callers pass the rows for the
// project's chain.

export type EnvironmentRows = Partial<Record<FamilyEnvironment["family"], FamilyEnvironment>>;

export const TESTNET_LIVE_STATUSES: readonly DeploymentStatus[] = ["official", "community"];

/** The families a shape relies on that have no testnet deployment in these rows. A missing row counts as not live. */
export function missingFamilies(shape: ProductShape, rows: EnvironmentRows): FamilyEnvironment["family"][] {
  return SHAPE_FAMILIES[shape].filter((f) => {
    const row = rows[f];
    return row === undefined || !TESTNET_LIVE_STATUSES.includes(row.testnet.status);
  });
}

/** True when every given family is officially listed on the mainnet these rows describe. A manifest alone does not count. */
export function familiesOnMainnet(families: readonly FamilyEnvironment["family"][], rows: EnvironmentRows): boolean {
  return families.length > 0 && families.every((f) => rows[f]?.mainnet.status === "official");
}

/** True when every family the shape relies on runs on the testnet these rows describe. */
export function shapeRunsOnTestnet(shape: ProductShape, rows: EnvironmentRows): boolean {
  return missingFamilies(shape, rows).length === 0;
}

/** Every shape with a family missing on the testnet, in table order. */
export function shapesMissingTestnet(rows: EnvironmentRows): ProductShape[] {
  return PRODUCT_SHAPE_VALUES.filter((s) => !shapeRunsOnTestnet(s, rows));
}

// ---------------------------------------------------------------------------
// Resource catalog

export type KitFamily = "shared" | "robinhood" | "arbitrum" | "morpho" | "pendle" | "uniswap" | "boros";

export const KIT_FAMILY_ORDER: readonly KitFamily[] = [
  "shared",
  "robinhood",
  "arbitrum",
  "morpho",
  "pendle",
  "uniswap",
  "boros",
];

/**
 * unofficial, a community artifact to verify before trusting. mainnet_only,
 * no testnet deployment exists. not_on_robinhood, background reading only.
 * testnet_only, do not carry it to mainnet. self_deploy, contracts a team
 * deploys itself on testnet 46630 and records in its own manifest, because
 * the protocol has no deployment there.
 */
export type KitFlag = "unofficial" | "mainnet_only" | "not_on_robinhood" | "testnet_only" | "self_deploy";

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
  /** Kits this belongs to, for a kit's own files. Absent means every kit. */
  kits?: readonly KitId[];
  steps: readonly KitStep[];
  priority: KitPriority;
  /** Core only. Lower reads first. */
  readOrder?: number;
  /** Absent means both starting points. */
  startingPoints?: readonly StartingPoint[];
  /**
   * Chains this entry is written for (M52). Absent means every chain, except
   * that a chain's own family (robinhood, arbitrum) only ever applies there.
   */
  chains?: readonly ProjectChain[];
  flags?: readonly KitFlag[];
}

export interface PackFilter {
  step?: KitStep;
  priority?: KitPriority;
  family?: KitFamily;
  /** One of the project's shapes (M85). Entries for every shape stay. */
  shape?: ProductShape;
}

/** Chain families that only apply on their own chain. */
const CHAIN_FAMILY: Partial<Record<KitFamily, ProjectChain>> = {
  robinhood: "robinhood_testnet",
  arbitrum: "arbitrum_sepolia",
};

/** True when a catalog entry belongs in a pack for this chain. */
export function resourceOnChain(r: Pick<KitResource, "family" | "chains">, chain: ProjectChain): boolean {
  const home = CHAIN_FAMILY[r.family];
  if (home && home !== chain) return false;
  return !r.chains || r.chains.includes(chain);
}

/**
 * The flags an entry carries on this chain. The catalog's flags were written
 * against Robinhood Chain; on Arbitrum "not on Robinhood" says nothing and
 * the self deploy note does not hold, so both are left out there.
 */
export function flagsOnChain(r: Pick<KitResource, "flags">, chain: ProjectChain): KitFlag[] {
  const flags = r.flags ?? [];
  if (chain === "robinhood_testnet") return [...flags];
  return flags.filter((f) => f !== "not_on_robinhood" && f !== "self_deploy");
}

function appliesTo(
  r: KitResource,
  shapes: readonly ProductShape[],
  kit: Pick<ProjectKit, "startingPoint" | "kits">,
  subsectors: readonly Subsector[],
  chain: ProjectChain,
): boolean {
  if (!shapes.length) return false;
  if (!resourceOnChain(r, chain)) return false;
  if (r.kits && !r.kits.some((k) => kit.kits.includes(k))) return false;
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
  doc: Pick<ProjectDoc, "subsectors" | "sector" | "sectors" | "chain">,
  filter: PackFilter = {},
): KitResource[] {
  const shapes = kitShapes(kit);
  if (!kit || !shapes.length) return [];
  const subs = effectiveSubsectors(kit, doc);
  const chain = projectChainOf(doc);
  return catalog
    .filter((r) => appliesTo(r, shapes, kit, subs, chain))
    .filter((r) => !filter.step || r.steps.includes(filter.step))
    .filter((r) => !filter.priority || r.priority === filter.priority)
    .filter((r) => !filter.family || r.family === filter.family)
    .filter((r) => !filter.shape || r.shapes === "all" || r.shapes.includes(filter.shape))
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
    if (r.kits) {
      if (r.kits.length === 0) problems.push(`${r.id} empty kits`);
      for (const k of r.kits) if (!KIT_ID_VALUES.includes(k)) problems.push(`${r.id} unknown kit ${k}`);
    }
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
