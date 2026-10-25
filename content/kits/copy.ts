import type { ChipOption } from "@/components/ui/ChipGroup";
import { CREDIT_SHAPE_OPTIONS } from "@/content/kits/credit";
import { DERIVATIVES_SHAPE_OPTIONS } from "@/content/kits/derivatives";
import { LIQUIDITY_SHAPE_OPTIONS } from "@/content/kits/liquidity";
import { OTHER_SHAPE_OPTIONS } from "@/content/kits/other";
import { RWA_SHAPE_OPTIONS } from "@/content/kits/rwa";
import { STAKING_SHAPE_OPTIONS } from "@/content/kits/staking";
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
  type ShapeId,
  type StartingPoint,
  kitShapes,
  ownShapeOf,
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
  /** The label as a noun phrase after "I am building", for a subsector that picks this shape on its own. */
  building?: string;
}

/** Every shape option, in SHAPE_SUBSECTORS (picker) order. */
export const SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = PRODUCT_SHAPE_VALUES.map((value) => {
  const option = [
    ...CREDIT_SHAPE_OPTIONS,
    ...LIQUIDITY_SHAPE_OPTIONS,
    ...DERIVATIVES_SHAPE_OPTIONS,
    ...STAKING_SHAPE_OPTIONS,
    ...RWA_SHAPE_OPTIONS,
    ...OTHER_SHAPE_OPTIONS,
  ].find((o) => o.value === value);
  if (!option) throw new Error(`Shape ${value} has no option copy.`);
  return option;
});


export const STARTING_POINT_OPTIONS: ReadonlyArray<ChipOption<StartingPoint>> = [
  { value: "scratch", label: "From scratch" },
  { value: "existing_product", label: "On top of an existing product" },
];

export const KIT_COPY = {
  shapeLabel: "What are you building",
  shapeHint: "Pick every layer your users touch, up to three. The research kit merges the packs for what you choose.",
  /** Under the shape chips (M131). */
  shapeCap: (max: number) => `Up to ${max} shapes per project, ours and your own together. Studio holds 3 and Studio+ holds 10.`,
  /** One line per subsector that names its shape on its own. */
  buildingLine: (phrase: string, sentence: string) => `I am building ${phrase}. ${sentence}`,
  buildingHint: "These follow from the subsectors you picked. Untick a subsector to drop its product.",
  examplesTitle: "What you could build",
  ideasHint: "Tick what fits, edit any line or add your own. Removing an edited line brings the original back. Your agent reads and edits these through the MCP server.",
  ideaPlaceholder: "One line on what you would build",
  ideaAdd: "Add",
  ideaRemove: (text: string) => `Remove ${text}`,
  ideaOwn: "Yours",
  ideaEdited: "Edited",
  ideaEdit: (text: string) => `Edit ${text}`,
  ideaEditTitle: "Edit this line",
  ideaSave: "Save",
  ideaCancel: "Cancel",
  ideasExport: (n: number) => (n === 1 ? "One line the team ticked or wrote." : `${n} lines the team ticked or wrote.`),
  /** The shapes dialog (M68 follow-up). */
  overlapTrigger: "How the shapes relate",
  overlapLead: (n: number) =>
    n === 1
      ? "One product. Its research pack, build steps and contract templates are its own."
      : `${n} products. Each gets its own research pack, build steps and contract templates, and what they share is listed once so nothing is done twice.`,
  overlapColumns: { resources: "Resources", steps: "Build steps", templates: "Templates" },
  overlapOnly: (label: string) => `${label} only`,
  overlapShared: "Shared",
  overlapSharedSteps: "Build steps shared across the products",
  overlapSharedTemplates: "Contract templates shared across the products",
  overlapNone: "Nothing is shared between these products yet.",
  overlapHow: "How the stack fits together",
  /** The collapsed row that holds the shape blurbs and the overlap dialog (M76). */
  aboutShapes: "About these shapes",
  startingPointLabel: "Starting point",
  existingProductLabel: "What exists today",
  existingProductHint: "A link or one line. Optional.",
  existingProductPlaceholder: "https://... or a sentence about the current product",
} as const;

export const FAMILY_LABELS: Record<KitFamily, string> = {
  shared: "Shared",
  robinhood: "Robinhood Chain",
  arbitrum: "Arbitrum",
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
  /** The info icon on a resource row (M76). */
  why: "Why this resource",
  /** The info icon beside the rail title (M76). */
  about: "About the resource pack",
  footnote:
    "Core items are ticked for you. Untick what you already know, tick anything " +
    "extra. Your ticks travel with the project into AGENTS.md and the MCP tools.",
} as const;

/** The shape boards (M176): three lanes per shape, and the words for the cards on them. */
export const BOARD_COPY = {
  title: "Board",
  hint: "What this shape includes, sorted into three lanes. Core is part of the product and a core feature adds its build steps. Exploring is being ideated. Later is a feature to add and test later. Your agent reads and moves cards over MCP.",
  lanes: {
    core: { label: "Core", hint: "Part of the product" },
    exploring: { label: "Exploring", hint: "Being ideated" },
    later: { label: "Later", hint: "Add and test later" },
  },
  kinds: { feature: "Feature", resource: "Resource", template: "Template", own: "Your item" },
  add: "Add",
  writeOwn: "Write your own",
  ownPlaceholder: "One line, what it is",
  moveTo: (lane: string) => `Move to ${lane}`,
  remove: "Remove",
  empty: "Nothing here yet.",
  libraryTitles: { feature: "Features", resource: "Resources", template: "Contract templates" },
  featuresFrom: (shape: string) => `Features from ${shape}`,
  search: "Filter",
  nothingLeft: "Everything is on the board.",
  export: "Shape boards",
  exportLine: (lane: string, items: string) => `${lane}. ${items}`,
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
  /** The info icon beside a product section title (M76). */
  about: "About these steps",
  addTitle: "Add a step",
  addHint: "Anything this product needs that the list above does not cover. It is ticked and counted like the rest.",
  addPlaceholder: "What needs doing",
  addDetailPlaceholder: "What done looks like (optional)",
  addButton: "Add step",
  addLimit: (max: number) => `A project can add up to ${max} steps.`,
  remove: (title: string) => `Remove ${title}`,
  removedTitle: "Removed steps",
  removedHint: "Removed steps leave the count. Restore one to bring it back with its tick.",
  /** The evidence line under a step (M83). */
  evidence: "Evidence",
  evidenceHint: "The file, test, address or evidence id that proves the step. Agents record it with set_build_steps.",
  clearEvidence: (title: string) => `Clear the evidence on ${title}`,
  /** A step that does not apply (M84). */
  naTag: "Not applicable",
  naBecause: (reason: string) => `Not applicable, because ${reason}`,
  naHint: "A step that does not fit this product stays listed with the reason and leaves the count. Agents mark one with set_build_steps.",
  markApplicable: "Applies after all",
  markApplicableTitle: (title: string) => `Mark ${title} applicable again`,
  removedShared: (labels: readonly string[]) => `Removed for ${joinAnd(labels)} too.`,
  restore: "Restore",
  /** Features (M64). */
  featuresTitle: "What this product includes",
  featuresHint: "Tick what applies. A ticked feature adds its own steps below and moves the templates it suits to the top. Nothing is removed.",
  featuresProgress: (on: number, total: number) => `${on} of ${total} ticked`,
  featureAdds: (steps: number, templates: number) =>
    [
      steps ? `Adds ${steps} ${steps === 1 ? "step" : "steps"}` : "",
      templates ? `suggests ${templates} ${templates === 1 ? "template" : "templates"}` : "",
    ]
      .filter(Boolean)
      .join(", ")
      .replace(/^suggests/, "Suggests"),
  featureBadge: (title: string) => `From ${title}`,
  featureSuggests: (titles: readonly string[]) => `Suggested by ${joinAnd(titles)}`,
  featuresExport: (on: number, total: number) => `${on} of ${total} features ticked by the team. A ticked feature's steps are in the build steps above.`,
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
    "Your chain and each protocol your shapes rely on, on its testnet and its mainnet, checked by hand on the date shown. The same block reaches your agent through get_resource_pack.",
  testnet: (chainId: number) => `Testnet ${chainId}`,
  mainnet: (chainId: number) => `Mainnet ${chainId}`,
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

export function shapeLabel(shape: ShapeId | "" | undefined): string | null {
  if (!shape) return null;
  return SHAPE_OPTIONS.find((o) => o.value === shape)?.label ?? null;
}

/** The name of any shape (M176): our label, or the title of one the team made. */
export function shapeName(kit: Pick<ProjectKit, "ownShapes"> | undefined, shape: ShapeId): string {
  return ownShapeOf(kit, shape)?.title ?? shapeLabel(shape) ?? shape;
}

/** Names for every shape a kit is building, ours in table order then its own (M176). Empty when none. */
export function shapeLabels(kit: Pick<ProjectKit, "shape" | "shapes" | "ownShapes"> | undefined): string[] {
  return [
    ...kitShapes(kit)
      .map((s) => shapeLabel(s))
      .filter((l): l is string => Boolean(l)),
    ...(kit?.ownShapes ?? []).map((o) => o.title),
  ];
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
 * The testnet note (M41, a note since M52). A shape whose protocol has no
 * deployment on the project's testnet can still be picked. The studio says
 * which protocol is missing and the team or its agent writes the build
 * steps that fit.
 */
export const GATE_COPY = {
  /** `mainnet` is the mainnet's name when every missing family runs there, otherwise null. */
  chipSuffix: (families: readonly string[], chain: string, mainnet: string | null) => {
    const one = families.length === 1;
    return mainnet
      ? `${joinAnd(families)} ${one ? "runs" : "run"} on ${mainnet} but ${one ? "has" : "have"} no ${chain} deployment yet`
      : `${joinAnd(families)} ${one ? "has" : "have"} no ${chain} deployment yet`;
  },
  note: (chain: string) =>
    `Marked options rely on a protocol with no deployment on ${chain}, the testnet this project builds on. You can still build them against mocks or a fork of mainnet, with build steps you or your agent write to fit.`,
  section: (families: readonly string[], chain: string) =>
    `${joinAnd(families)} ${families.length === 1 ? "has" : "have"} no deployment on ${chain} yet. Remove the steps that do not fit and add your own below, or ask your agent to write them. Work against mocks, your own deployment or a fork of mainnet until one lands.`,
  catalogRule:
    "A shape is marked when a protocol family it relies on has no official or community deployment on the project's testnet. It can still be picked, and the team or its agent writes the build steps that fit.",
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
/** "a restaking service", "stock and fund tokens". Falls back to the label with an article. */
export function shapeBuildingPhrase(shape: ProductShape): string {
  const o = SHAPE_OPTIONS.find((x) => x.value === shape);
  if (!o) return shape;
  if (o.building) return o.building;
  const lower = o.label.toLowerCase();
  return `${/^[aeiou]/.test(lower) ? "an" : "a"} ${lower}`;
}

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
