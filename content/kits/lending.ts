import type { ChipOption } from "@/components/ui/ChipGroup";
import type { ProductShape, ProjectKit, StartingPoint } from "@/lib/kits";

/**
 * Copy for the Lending research kit. Everything here is CanHav's own wording;
 * protocol and company names appear only as evidence in worked examples
 * (content/ideation-resources.ts). No em dashes, no colons in UI strings.
 */

export interface ShapeOption extends ChipOption<ProductShape> {
  /** One line under the chips once this shape is chosen. */
  blurb: string;
}

export const LENDING_SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = [
  {
    value: "curated_vault",
    label: "Curated vault",
    blurb:
      "You run a yield strategy on-chain. Depositors hand you their assets, you " +
      "decide where they are lent and under what limits, and you can charge for it.",
  },
  {
    value: "embedded_earn",
    label: "Earn inside your app",
    blurb:
      "Your app already has users and balances. Their idle stablecoins or crypto " +
      "flow into existing on-chain vaults and come back as a savings feature you " +
      "never had to underwrite.",
  },
  {
    value: "collateral_loans",
    label: "Collateral-backed loans",
    blurb:
      "Your users post an asset and borrow against it. You open your own lending " +
      "markets and choose the collateral, the loan asset, the price feed and the " +
      "liquidation line.",
  },
];

export const STARTING_POINT_OPTIONS: ReadonlyArray<ChipOption<StartingPoint>> = [
  { value: "scratch", label: "From scratch" },
  { value: "existing_product", label: "On top of an existing product" },
];

export const LENDING_KIT_COPY = {
  shapeLabel: "What are you building",
  shapeHint: "Pick the layer your users touch first. The research kit follows this choice.",
  startingPointLabel: "Starting point",
  existingProductLabel: "What exists today",
  existingProductHint: "A link or one line. Optional.",
  existingProductPlaceholder: "https://... or a sentence about the current product",
} as const;

export function shapeLabel(shape: ProductShape | "" | undefined): string | null {
  if (!shape) return null;
  return LENDING_SHAPE_OPTIONS.find((o) => o.value === shape)?.label ?? null;
}

export function shapeBlurb(shape: ProductShape | ""): string | null {
  if (!shape) return null;
  return LENDING_SHAPE_OPTIONS.find((o) => o.value === shape)?.blurb ?? null;
}

/** "From scratch" or "On top of an existing product (note)". Null when unset. */
export function startingPointLabel(kit: Pick<ProjectKit, "startingPoint" | "existingProduct">): string | null {
  if (!kit.startingPoint) return null;
  const base = STARTING_POINT_OPTIONS.find((o) => o.value === kit.startingPoint)?.label ?? null;
  if (!base) return null;
  const note = kit.existingProduct?.trim();
  return kit.startingPoint === "existing_product" && note ? `${base} (${note})` : base;
}
