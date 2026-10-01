import type { ChipOption } from "@/components/ui/ChipGroup";
import { CREDIT_SHAPE_OPTIONS } from "@/content/kits/credit";
import { LIQUIDITY_SHAPE_OPTIONS } from "@/content/kits/liquidity";
import { ALL_SUBSECTOR_OPTIONS } from "@/content/ideation";
import type { Subsector } from "@/lib/sectors";
import {
  type DeploymentStatus,
  type ReviewVerdict,
  type KitFamily,
  type KitFlag,
  type KitPriority,
  type KitResourceKind,
  type KitStep,
  type ProductShape,
  type ProjectKit,
  PRODUCT_SHAPE_VALUES,
  SHAPE_SUBSECTORS,
  type StartingPoint,
  kitShapes,
  shapesFor,
} from "@/lib/kits";

/**
 * Sector-neutral copy for the research kit and the helpers over every
 * shape. The shape options themselves live per sector in
 * content/kits/credit.ts and content/kits/liquidity.ts. Everything here is
 * CanHav's own wording; protocol and company names appear only as evidence
 * in worked examples (content/ideation-resources.ts). No em dashes, no
 * colons in UI strings.
 */

export interface ShapeOption extends ChipOption<ProductShape> {
  /** One line under the chips once this shape is chosen. */
  blurb: string;
  /** Two or three things a team could build with it, one line each (M41). */
  examples: readonly string[];
}

/** Every shape option, in SHAPE_SUBSECTORS (picker) order. */
export const SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = PRODUCT_SHAPE_VALUES.map((value) => {
  const option = [...CREDIT_SHAPE_OPTIONS, ...LIQUIDITY_SHAPE_OPTIONS].find((o) => o.value === value);
  if (!option) throw new Error(`Shape ${value} has no option copy.`);
  return option;
});


export const STARTING_POINT_OPTIONS: ReadonlyArray<ChipOption<StartingPoint>> = [
  { value: "scratch", label: "From scratch" },
  { value: "existing_product", label: "On top of an existing product" },
];

export const KIT_COPY = {
  shapeLabel: "What are you building",
  shapeHint: "Pick every layer your users touch. The research kit merges the packs for what you choose.",
  examplesTitle: "What you could build",
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
  uniswap: "Uniswap",
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
  self_deploy: { label: "Self-deploy on testnet", tone: "info" },
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
  intro: "The order a small team should take these. Tick a step when it is written down, not when it is started.",
  none: "Build steps for this shape are on the way.",
  progress: (done: number, total: number) => `${done} of ${total} done`,
  rowChip: (done: number, total: number) => `Build ${done} of ${total}`,
  /** The product sections in the step nav (M43). */
  productKicker: "Build",
  productIntro:
    "These steps belong to the product you are building, not to the project record. They never block publishing, and an agent connected to this project can tick them for you.",
  openProblem: "Build steps open",
  sharedNote: (labels: readonly string[]) => `This step is also part of ${joinAnd(labels)}.`,
  sharedAbove: (n: number, labels: readonly string[]) =>
    `${n === 1 ? "1 more step is" : `${n} more steps are`} shared with ${joinAnd(labels)} and listed ${labels.length === 1 ? "in that section" : "in those sections"}.`,
  partial: (n: number, m: number) => `Ticked for ${n} of ${m} shapes`,
  sharedTag: (labels: readonly string[]) => `also part of ${joinAnd(labels)}`,
  sharedAboveLine: (labels: readonly string[]) => `Shared with ${joinAnd(labels)}, listed above.`,
  countNote: "Steps shared between shapes count once.",
  /** Added and removed steps (M50). */
  customBadge: "Your step",
  customTag: "added by the team",
  addTitle: "Add a step",
  addHint: "Anything this product needs that the list above does not cover. It is ticked and counted like the rest.",
  addPlaceholder: "What needs doing",
  addDetailPlaceholder: "What done looks like (optional)",
  addButton: "Add step",
  addLimit: (max: number) => `A project can add up to ${max} steps.`,
  remove: (title: string) => `Remove ${title}`,
  removedTitle: "Removed steps",
  removedHint: "Removed steps leave the count. Restore one to bring it back with its tick.",
  removedShared: (labels: readonly string[]) => `Removed for ${joinAnd(labels)} too.`,
  restore: "Restore",
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

/** The Reality step block and the export section on where each family runs. */
export const ENVIRONMENT_COPY = {
  title: "Where this runs today",
  intro:
    "Robinhood Chain and each protocol your shapes rely on, on testnet 46630 and mainnet 4663, checked by hand on the date shown. The same block reaches your agent through get_resource_pack.",
  testnet: "Testnet 46630",
  mainnet: "Mainnet 4663",
  status: {
    official: "Official deployment",
    community: "Community deployment",
    manifest_only: "Manifest only",
    none: "No deployment",
  } satisfies Record<DeploymentStatus, string>,
  /** Tone follows the testnet status, because that is where a team starts. */
  tone: {
    official: "success",
    community: "info",
    manifest_only: "info",
    none: "warning",
  } satisfies Record<DeploymentStatus, "success" | "info" | "warning">,
  source: "Source",
  pathTitle: "Recommended path",
  /** A family whose path differs from the shared one gets its own list. */
  pathTitleFor: (family: string) => `Recommended path for ${family}`,
  checked: (date: string) => `Last checked ${date}.`,
} as const;

export const HANDOFF_COPY = {
  title: "Get this into your IDE",
  intro:
    "Download the pack as files for your repo, or let your coding agent pull it straight from this project's MCP server. Both follow your ticks and update as you change them.",
  resourcesFile: "Download RESOURCES.md",
  agentsFile: "Download AGENTS.md",
  launch: "Launch a token",
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
  return SHAPE_OPTIONS.find((o) => o.value === shape)?.label ?? null;
}

/** Labels for every shape a kit is building, in table order. Empty when none. */
export function shapeLabels(kit: Pick<ProjectKit, "shape" | "shapes"> | undefined): string[] {
  return kitShapes(kit)
    .map((s) => shapeLabel(s))
    .filter((l): l is string => Boolean(l));
}

export function shapeBlurb(shape: ProductShape | ""): string | null {
  if (!shape) return null;
  return SHAPE_OPTIONS.find((o) => o.value === shape)?.blurb ?? null;
}

export function shapeExamples(shape: ProductShape | ""): readonly string[] {
  if (!shape) return [];
  return SHAPE_OPTIONS.find((o) => o.value === shape)?.examples ?? [];
}

/**
 * The testnet gate (M41). Shapes whose protocol has no deployment on
 * Robinhood Chain testnet are shown greyed and cannot be picked; a stored
 * one is kept, warned about and blocks publishing.
 */
export const GATE_COPY = {
  chipSuffix: "Not on Robinhood testnet yet",
  note: "Greyed options rely on a protocol with no deployment on Robinhood Chain testnet. They open when one lands.",
  publishBlock: (labels: readonly string[]) =>
    labels.length === 1
      ? `${labels[0]} is not on Robinhood testnet yet. Remove it in Basics to publish.`
      : `${joinAnd(labels)} are not on Robinhood testnet yet. Remove them in Basics to publish.`,
  warning: (labels: readonly string[]) =>
    labels.length === 1
      ? `${labels[0]} is not on Robinhood testnet yet, so this project cannot publish. Click to remove it.`
      : `${joinAnd(labels)} are not on Robinhood testnet yet, so this project cannot publish. Click to remove them.`,
  stepProblem: "A shape is not on Robinhood testnet",
  catalogRule:
    "A shape is blocked when a protocol family it relies on has no official or community deployment on testnet 46630.",
} as const;

/** "A", "A and B", "A, B and C". */
export function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
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
 * subsectors reach it and every subsector it belongs to is open, so a shape
 * under a Coming soon subsector stays hidden until that subsector opens.
 */
export function offeredShapes(subsectors: readonly Subsector[]): ProductShape[] {
  const open = new Set(ALL_SUBSECTOR_OPTIONS.filter((o) => o.available !== false).map((o) => o.value));
  return shapesFor(subsectors).filter((s) => SHAPE_SUBSECTORS[s].every((sub) => open.has(sub)));
}

export interface ShapeGroup {
  subsector: Subsector;
  heading: string;
  options: ShapeOption[];
}

/**
 * Offered shapes grouped by subsector, groups in ALL_SUBSECTOR_OPTIONS
 * order. A shape that spans subsectors sits under the first entry of its
 * own SHAPE_SUBSECTORS list that the builder has chosen, so Borrow against
 * fixed-rate positions stays with Fixed income when Lending is also ticked
 * and Curated vault stays with Lending when Vaults is also ticked. One
 * group when one subsector is chosen, so no headings are needed.
 */
export function shapeGroupsFor(subsectors: readonly Subsector[]): ShapeGroup[] {
  const offered = new Set(offeredShapes(subsectors));
  const chosen = ALL_SUBSECTOR_OPTIONS.filter((o) => subsectors.includes(o.value));
  const chosenSet = new Set(chosen.map((o) => o.value));
  const home = (shape: ProductShape) => SHAPE_SUBSECTORS[shape].find((s) => chosenSet.has(s));
  const groups: ShapeGroup[] = [];
  for (const sub of chosen) {
    const options = SHAPE_OPTIONS.filter(
      (o) => offered.has(o.value) && home(o.value) === sub.value,
    );
    if (options.length) groups.push({ subsector: sub.value, heading: sub.label, options });
  }
  return groups;
}
