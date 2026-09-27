/**
 * Research kits: the per-subsector guided workflow attached to a project.
 * Types, limits and pure normalisation live here; all human-facing copy lives
 * in content/kits/*. Imported by client components, MCP tools and the
 * markdown builders, so this file has no Node imports and no `server-only`.
 *
 * Today there is one kit, "lending", for projects whose subsectors include
 * Lending. The kit is created the first time a builder picks a product shape
 * and is never a publish requirement; normalizeProjectDoc never injects it.
 */

/** The three lending product shapes, in CanHav's own words (see content/kits/lending.ts). */
export type ProductShape = "curated_vault" | "embedded_earn" | "collateral_loans";

export const PRODUCT_SHAPE_VALUES: readonly ProductShape[] = [
  "curated_vault",
  "embedded_earn",
  "collateral_loans",
];

/** Whether the product starts blank or is added to something that already exists. */
export type StartingPoint = "scratch" | "existing_product";

export const STARTING_POINT_VALUES: readonly StartingPoint[] = ["scratch", "existing_product"];

export type KitId = "lending";

export interface ProjectKit {
  id: KitId;
  shape: ProductShape | "";
  startingPoint: StartingPoint | "";
  /** A link or one line about the existing product. Only meaningful for existing_product. */
  existingProduct?: string;
  /** Resource ids the builder opted into beyond the core set (M22). */
  selected: string[];
  /** Core resource ids the builder opted out of (M22). */
  dismissed: string[];
}

export const KIT_LIMITS = {
  existingProduct: { max: 200 },
  /** Cap on each id list, well above any catalog size. */
  ids: { max: 200 },
} as const;

export function emptyProjectKit(): ProjectKit {
  return { id: "lending", shape: "", startingPoint: "", selected: [], dismissed: [] };
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
    id: "lending",
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
  if (kit.id !== "lending") return "Unknown research kit.";
  if (kit.shape && !PRODUCT_SHAPE_VALUES.includes(kit.shape)) return "Unknown product shape.";
  if (kit.startingPoint && !STARTING_POINT_VALUES.includes(kit.startingPoint))
    return "Unknown starting point.";
  if ((kit.existingProduct?.length ?? 0) > KIT_LIMITS.existingProduct.max)
    return `Existing product note is over ${KIT_LIMITS.existingProduct.max} characters.`;
  if (kit.selected.length > KIT_LIMITS.ids.max || kit.dismissed.length > KIT_LIMITS.ids.max)
    return "Too many resource selections.";
  return null;
}
