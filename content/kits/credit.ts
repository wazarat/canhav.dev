import type { ChipOption } from "@/components/ui/ChipGroup";
import type { Subsector } from "@/lib/ideation";
import {
  type ReviewVerdict,
  type KitFamily,
  type KitFlag,
  type KitPriority,
  type KitResourceKind,
  type KitStep,
  type ProductShape,
  type ProjectKit,
  SHAPE_SUBSECTORS,
  type StartingPoint,
  kitShapes,
  shapesFor,
} from "@/lib/kits";
import { SUBSECTOR_OPTIONS } from "@/content/ideation";

/**
 * Copy for the credit research kit. Everything here is CanHav's own wording;
 * protocol and company names appear only as evidence in worked examples
 * (content/ideation-resources.ts). No em dashes, no colons in UI strings.
 */

export interface ShapeOption extends ChipOption<ProductShape> {
  /** One line under the chips once this shape is chosen. */
  blurb: string;
}

/**
 * All eight shapes. Which ones a builder sees is decided by shapesFor(), not
 * by this list, so opening a subsector never touches this file's structure.
 */
export const CREDIT_SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = [
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
  {
    value: "fixed_rate_yield",
    label: "Fixed-rate yield on your asset",
    blurb:
      "You hold or issue something that earns yield. Wrap it, split it into a " +
      "fixed half and a variable half, and open a market where each half trades " +
      "until a maturity date.",
  },
  {
    value: "embedded_fixed_rate",
    label: "Fixed-rate savings inside your app",
    blurb:
      "Your app offers a rate that is known on the day of deposit and paid at " +
      "maturity, by buying the fixed half of an existing yield market on behalf of " +
      "your users.",
  },
  {
    value: "pt_backed_borrowing",
    label: "Borrow against fixed-rate positions",
    blurb:
      "Holders of a fixed-yield position post it as collateral and borrow the " +
      "underlying. You open the lending market and pick a price feed that " +
      "converges to par at maturity.",
  },
  {
    value: "leveraged_fixed_yield",
    label: "Leveraged fixed-yield loop",
    blurb:
      "Buy the fixed half, post it as collateral, borrow, buy more. The product " +
      "lives or dies on the spread between the fixed rate and the borrow rate " +
      "after fees.",
  },
  {
    value: "yield_token_exposure",
    label: "Yield-token products",
    blurb:
      "Products built on the variable half, which pays the yield of many units of " +
      "the asset for the price of one and decays to zero at maturity.",
  },
];

export const STARTING_POINT_OPTIONS: ReadonlyArray<ChipOption<StartingPoint>> = [
  { value: "scratch", label: "From scratch" },
  { value: "existing_product", label: "On top of an existing product" },
];

export const CREDIT_KIT_COPY = {
  shapeLabel: "What are you building",
  shapeHint: "Pick every layer your users touch. The research kit merges the packs for what you choose.",
  startingPointLabel: "Starting point",
  existingProductLabel: "What exists today",
  existingProductHint: "A link or one line. Optional.",
  existingProductPlaceholder: "https://... or a sentence about the current product",
} as const;

export const FAMILY_LABELS: Record<KitFamily, string> = {
  shared: "Shared",
  robinhood: "Robinhood Chain",
  morpho: "Morpho",
  pendle: "Pendle",
  boros: "Boros",
};

export const KIND_LABELS: Record<KitResourceKind, string> = {
  skill: "Agent skill",
  docs: "Docs",
  repo: "Repository",
  spec: "Spec",
  paper: "Paper",
  checklist: "Checklist",
  template: "Template",
  addresses: "Addresses",
  dataset: "Dataset",
  tool: "Tool",
};

export const PRIORITY_LABELS: Record<KitPriority, string> = {
  core: "Core",
  recommended: "Recommended",
  deep_dive: "Deep dive",
};

export const STEP_LABELS_KIT: Record<KitStep, string> = {
  basics: "Basics",
  architecture: "Architecture",
  security: "Security",
  reality: "Reality",
  review: "Review",
};

/** Flag copy and the StatusChip tone each one carries. */
export const FLAG_COPY: Record<KitFlag, { label: string; tone: "warning" | "info" | "neutral" }> = {
  unofficial: { label: "Unofficial", tone: "warning" },
  mainnet_only: { label: "Mainnet only", tone: "info" },
  not_on_robinhood: { label: "Not on Robinhood Chain", tone: "neutral" },
  testnet_only: { label: "Testnet only", tone: "info" },
};

export const RAIL_COPY = {
  title: "Resource pack",
  thisStep: "This step",
  allSteps: "All steps",
  noShape: "Pick what you are building in Basics to get a resource pack.",
  noneForStep: "Nothing in the pack is tied to this step. Switch to All steps to see everything.",
  selectAll: "Select all",
  coreOnly: "Core only",
  readFirst: (n: number) => `Read ${ordinal(n)}`,
  selectedOf: (selected: number, total: number) => `${selected} of ${total} selected`,
  footnote:
    "Core items are ticked for you. Untick what you already know, tick anything " +
    "extra. Your ticks travel with the project into AGENTS.md and the MCP tools.",
} as const;

export const CHECKLIST_COPY = {
  tab: "Build steps",
  resourcesTab: "Resources",
  intro: "The order a small team should take these. Tick a step when it is written down, not when it is started.",
  none: "Build steps for this shape are on the way.",
  progress: (done: number, total: number) => `${done} of ${total} done`,
  rowChip: (done: number, total: number) => `Build ${done} of ${total}`,
} as const;

export const REVIEW_VERDICT_OPTIONS: ReadonlyArray<ChipOption<ReviewVerdict>> = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "na", label: "Not applicable" },
];

export const REVIEW_VERDICT_LABELS: Record<ReviewVerdict, string> = {
  pass: "Pass",
  fail: "Fail",
  na: "Not applicable",
};

export const REVIEW_COPY = {
  title: "Review passes",
  intro:
    "Run these before anything holds value. A verdict is a claim with evidence behind it, so record where the evidence lives in your repository. Click a verdict again to clear it.",
  summary: (p: { pass: number; fail: number; na: number; open: number; total: number }) =>
    p.open === p.total
      ? `${p.total} passes, none recorded`
      : `${p.pass} pass, ${p.fail} fail, ${p.na} not applicable, ${p.open} open`,
  reviewRow: (p: { pass: number; fail: number; na: number; open: number; total: number }) =>
    `${p.pass} of ${p.total} passed${p.fail ? `, ${p.fail} failed` : ""}${p.open ? `, ${p.open} open` : ""}`,
} as const;

export const HANDOFF_COPY = {
  title: "Get this into your IDE",
  intro:
    "Download the pack as files for your repo, or let your coding agent pull it straight from this project's MCP server. Both follow your ticks and update as you change them.",
  resourcesFile: "Download RESOURCES.md",
  agentsFile: "Download AGENTS.md",
  gateNote: "Free, sign-in required",
  footnote:
    "AGENTS.md carries the whole project record plus the pack. RESOURCES.md is the pack alone. Both are built from the current draft, not a published snapshot.",
} as const;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function shapeLabel(shape: ProductShape | "" | undefined): string | null {
  if (!shape) return null;
  return CREDIT_SHAPE_OPTIONS.find((o) => o.value === shape)?.label ?? null;
}

/** Labels for every shape a kit is building, in table order. Empty when none. */
export function shapeLabels(kit: Pick<ProjectKit, "shape" | "shapes"> | undefined): string[] {
  return kitShapes(kit)
    .map((s) => shapeLabel(s))
    .filter((l): l is string => Boolean(l));
}

export function shapeBlurb(shape: ProductShape | ""): string | null {
  if (!shape) return null;
  return CREDIT_SHAPE_OPTIONS.find((o) => o.value === shape)?.blurb ?? null;
}

/** "From scratch" or "On top of an existing product (note)". Null when unset. */
export function startingPointLabel(
  kit: Pick<ProjectKit, "startingPoint" | "existingProduct">,
): string | null {
  if (!kit.startingPoint) return null;
  const base = STARTING_POINT_OPTIONS.find((o) => o.value === kit.startingPoint)?.label ?? null;
  if (!base) return null;
  const note = kit.existingProduct?.trim();
  return kit.startingPoint === "existing_product" && note ? `${base} (${note})` : base;
}

/**
 * Shapes a builder can pick today. A shape is offered when the chosen
 * subsectors reach it and every subsector it belongs to is open. All three
 * credit subsectors are open, so this is shapesFor() unless a subsector is
 * ever closed again.
 */
export function offeredShapes(subsectors: readonly Subsector[]): ProductShape[] {
  const open = new Set(SUBSECTOR_OPTIONS.filter((o) => o.available !== false).map((o) => o.value));
  return shapesFor(subsectors).filter((s) => SHAPE_SUBSECTORS[s].every((sub) => open.has(sub)));
}

export interface ShapeGroup {
  subsector: Subsector;
  heading: string;
  options: ShapeOption[];
}

/**
 * Offered shapes grouped by subsector, groups in SUBSECTOR_OPTIONS order. A
 * shape that spans subsectors sits under the first entry of its own
 * SHAPE_SUBSECTORS list that the builder has chosen, so Borrow against
 * fixed-rate positions stays with Fixed income when Lending is also ticked.
 * One group when one subsector is chosen, so no headings are needed.
 */
export function shapeGroupsFor(subsectors: readonly Subsector[]): ShapeGroup[] {
  const offered = new Set(offeredShapes(subsectors));
  const chosen = SUBSECTOR_OPTIONS.filter((o) => subsectors.includes(o.value));
  const chosenSet = new Set(chosen.map((o) => o.value));
  const home = (shape: ProductShape) => SHAPE_SUBSECTORS[shape].find((s) => chosenSet.has(s));
  const groups: ShapeGroup[] = [];
  for (const sub of chosen) {
    const options = CREDIT_SHAPE_OPTIONS.filter(
      (o) => offered.has(o.value) && home(o.value) === sub.value,
    );
    if (options.length) groups.push({ subsector: sub.value, heading: sub.label, options });
  }
  return groups;
}
