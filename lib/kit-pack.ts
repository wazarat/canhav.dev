import { KIT_CATALOG } from "@/content/kits/catalog";
import { featuresFor } from "@/content/kits/features";
import { TEMPLATE_CATALOG } from "@/content/templates";
import { TEMPLATE_COPY } from "@/content/templates/copy";
import { type TemplateVia, reachableTemplatesFor } from "@/lib/template-reach";
import {
  type ChainDeployment,
  type ContractTemplate,
  type TemplateAvailability,
  templateAvailability,
  templateChainCounts,
  templateOnChain,
  templatesForShapes,
} from "@/lib/templates";
import { buildProgress, checklistFor, sectionsFor } from "@/content/kits/checklists";
import { REVIEW_PASSES } from "@/content/kits/review-passes";
import { FAMILY_LABELS, shapeExamples, shapeLabel, shapeLabels } from "@/content/kits/copy";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import { type ProjectChain, chainInfo, projectChainOf } from "@/lib/chains";
import { LAUNCH_TARGET_COPY, launchTargetHandoffLine, launchTargetLabel } from "@/content/launch-targets";
import { type LaunchTarget, type LaunchTargetFit, launchTargetFit } from "@/lib/launch-targets";
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
  type TemplateState,
  type GroupState,
  SHAPE_SUBSECTORS,
  groupEvidence,
  groupReason,
  groupState,
  effectiveSelection,
  effectiveSubsectors,
  environmentPlanFor,
  flagsOnChain,
  kitShapes,
  missingFamilies,
  packCounts,
  packFor,
  reviewPassesFor,
  reviewProgress,
  featureProgress,
  featuresSuggesting,
  hasFeature,
  ideaRows,
  templateCounts,
  templateState,
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
  /** The testnet the project builds on and the mainnet it stands in for (M52). */
  chain: { key: ProjectChain; name: string; testnetChainId: number; mainnetChainId: number };
  /** Chosen shapes whose protocol has no deployment on that testnet, with the missing families. */
  shapesMissingTestnet: Array<{ shape: ProductShape; missing: string[] }>;
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
    items: Array<ChecklistItem & { done: boolean; notApplicable?: string; evidence?: string; shape: ProductShape; sharedWith: string[]; custom?: boolean }>;
    groups: Array<{
      key: string;
      title: string;
      detail: string;
      step: KitStep;
      shape: ProductShape;
      shapes: ProductShape[];
      ids: string[];
      resources: string[];
      /** Contract template ids that fit the step (M61). */
      templates: string[];
      /** The feature that gates the step (M64), when one does. */
      feature?: string;
      done: boolean;
      /** done, partial, open or na (M84). */
      state: GroupState;
      /** Why the step does not apply, on a na group (M84). */
      reason?: string;
      /** The evidence line recorded with the tick (M83). */
      evidence?: string;
      /** True for a step the team added (M50). */
      custom?: boolean;
    }>;
  };
  /** Pre-launch review passes for the shape with recorded verdicts. */
  review: ReviewView;
  /** Contract templates for the shapes with the team's decisions (M63). */
  templates: TemplatesView;
  /** What the product includes, as the features the team ticked (M64). */
  features: FeaturesView;
  /** What the team could build with each shape, the catalog lines it ticked and its own (M68 follow-up). */
  ideas: { count: number; items: Array<{ shape: ProductShape; text: string; on: boolean; own: boolean; from?: string }> };
  /**
   * Shapes with no contract template live on this chain's mainnet (M68
   * follow-up), with how many run on the other mainnet and the way forward.
   */
  templateGaps: Array<{
    shape: ProductShape;
    label: string;
    mainnet: string;
    otherChain: ProjectChain;
    otherMainnet: string;
    liveOnOther: number;
    plan: string;
  }>;
  /** The venue the linked token design ideates for (M69). Null without a design or a choice. */
  launchTarget: LaunchTargetView | null;
  howToUse: string;
}

export interface LaunchTargetView {
  target: LaunchTarget;
  label: string;
  /** `any` for the curve, `fits` or `off_chain` for a venue tied to a mainnet, read for the project's chain. */
  fit: LaunchTargetFit;
  /** The one line the handoff shows. */
  note: string;
  /** The project's templates that carry a Pons fit line, accepted first, then open, then rejected. */
  ponsFitTemplates: Array<{ id: string; name: string; decision: TemplateState; ponsFit: string }>;
}

export interface TemplatePackView
  extends Omit<ContractTemplate, "chains"> {
  /** How the project reaches it (M80). subsector from the catalog placement, step or feature from a citation. */
  via: TemplateVia;
  /** accepted, rejected or open. */
  decision: TemplateState;
  /** What the team can do with it on the project's chain. */
  availability: TemplateAvailability;
  /** The mainnet status read for the project's chain. */
  onChain: { status: ChainDeployment; note?: string };
  /** Build step group keys that list it, section order. Empty for a template no step names. */
  steps: string[];
  /** Ticked feature ids that suggest it (M64). Such a template sorts first on its steps. */
  suggestedBy: string[];
  /** The mainnet status on both chains, kept for readers that compare. */
  chains: ContractTemplate["chains"];
}

export interface TemplatesView {
  counts: ReturnType<typeof templateCounts>;
  /** Every active template placed under the shapes' subsectors, pack order, decided ones first within a step. */
  items: TemplatePackView[];
}

export interface FeaturePackView {
  id: string;
  shape: ProductShape;
  title: string;
  detail: string;
  on: boolean;
  /** Catalog step ids the feature gates. */
  steps: string[];
  /** Template ids it suggests. */
  templates: string[];
}

export interface FeaturesView {
  on: number;
  total: number;
  items: FeaturePackView[];
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
  "This read is large. Ask for sections (resources, checklist, review, templates, features, ideas, environment, launchTarget, templateGaps), for summary true to get counts only, or for one shape, and read get_templates for templates by step, shape, decision or ids. Fetch rawUrl where present (agent skills, references and templates) and load them into context in readFirst order before touching code. Respect the flags. mainnet_only means no testnet deployment exists, not_on_robinhood means the resource is background reading and cannot be integrated on this chain, unofficial means a community artifact to verify before trusting, self_deploy means the protocol has no deployment on testnet 46630 and the team deploys these contracts itself and records them in its own manifest. chain names the testnet this project builds on, and shapesMissingTestnet lists the shapes whose protocol has no deployment there, for which the team or its agent writes the build steps that fit with set_build_steps. templates lists the contract templates for the shapes with the team's decision on each. accepted means the team will build on or integrate it, rejected means do not propose it again, open means undecided, and availability says what can be done with it on this chain (ready, self_deploy, unknown, unavailable). Never fork a template whose licenseClass is restricted. features lists what the product includes as the team ticked it; a ticked feature's steps are in the checklist and the templates it suggests carry it in suggestedBy, so prefer those on their steps. ideas lists what the team could build with each shape, the catalog lines it ticked (on) and the lines it wrote (own); read them before proposing product scope and add to them through update_project kit.ideas, never drop a line the team ticked. templateGaps lists the shapes with no contract template live on this chain's mainnet, with the count live on the other mainnet and a plan line; follow the plan, accept the other mainnet's templates and iterate for this chain against a fork or a mock, or say the project should move chain, and never present an undeployed template as a build plan. launchTarget, when the linked token design has chosen a venue, names it with its fit on this chain and the templates whose Pons fit line says how they can sit behind a Pons launch; a venue marked off_chain runs on a mainnet this project's chain does not stand in for, so plan the testnet launch on the CanHav curve and say so.";

const DECISION_RANK: Record<TemplateState, number> = { accepted: 0, open: 1, rejected: 2 };

/** The pack's launch venue block (M69). Pons fit lines come from the catalog, accepted templates first. */
function launchTargetView(target: LaunchTarget, chain: ProjectChain, items: readonly TemplatePackView[]): LaunchTargetView {
  const fit = launchTargetFit(target, chain);
  return {
    target,
    label: launchTargetLabel(target),
    fit,
    note: launchTargetHandoffLine(target, fit),
    ponsFitTemplates: items
      .filter((t): t is TemplatePackView & { ponsFit: string } => Boolean(t.ponsFit))
      .sort((a, b) => DECISION_RANK[a.decision] - DECISION_RANK[b.decision])
      .map((t) => ({ id: t.id, name: t.name, decision: t.decision, ponsFit: t.ponsFit })),
  };
}

// ---------------------------------------------------------------------------
// Focused reads (M85). A pack is large; an agent asks for the sections it
// needs, a summary with counts, or one shape, and gets the templates once.

export const PACK_SECTIONS = [
  "resources",
  "checklist",
  "review",
  "templates",
  "features",
  "ideas",
  "environment",
  "launchTarget",
  "templateGaps",
] as const;
export type PackSection = (typeof PACK_SECTIONS)[number];

/** The pack with only the named sections, the identity header always kept, narrowed to one shape when asked. */
export function packSections(
  pack: ResourcePackView,
  sections: readonly PackSection[] | undefined,
  shape?: ProductShape,
): Partial<ResourcePackView> & Pick<ResourcePackView, "kit" | "kits" | "sectors" | "shape" | "shapes" | "chain" | "howToUse"> {
  const keep = new Set<PackSection>(sections?.length ? sections : PACK_SECTIONS);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(pack)) {
    if (PACK_SECTIONS.includes(k as PackSection) && !keep.has(k as PackSection)) continue;
    out[k] = v;
  }
  if (shape && keep.has("checklist")) {
    const items = pack.checklist.items.filter((i) => i.shape === shape || i.sharedWith.some((id) => id.startsWith(`${shape}.`)));
    const groups = pack.checklist.groups.filter((g) => g.shape === shape || g.shapes.includes(shape));
    out.checklist = { ...pack.checklist, items, groups };
  }
  if (shape && keep.has("features")) out.features = { ...pack.features, items: pack.features.items.filter((f) => f.shape === shape) };
  if (shape && keep.has("ideas")) out.ideas = { ...pack.ideas, items: pack.ideas.items.filter((i) => i.shape === shape) };
  if (shape && keep.has("templateGaps")) out.templateGaps = pack.templateGaps.filter((g) => g.shape === shape);
  return out as ReturnType<typeof packSections>;
}

/** Counts per section and the identity header, under a kilobyte for most projects. */
export function packSummary(pack: ResourcePackView) {
  return {
    kit: pack.kit,
    kits: pack.kits,
    sectors: pack.sectors,
    shape: pack.shape,
    shapes: pack.shapes,
    shapeLabels: pack.shapeLabels,
    subsectors: pack.subsectors,
    startingPoint: pack.startingPoint,
    chain: pack.chain,
    shapesMissingTestnet: pack.shapesMissingTestnet,
    readFirst: pack.readFirst,
    sections: {
      resources: { ...pack.counts, listed: pack.resources.length },
      checklist: {
        done: pack.checklist.done,
        total: pack.checklist.total,
        groups: pack.checklist.groups.length,
        notApplicable: pack.checklist.groups.filter((g) => g.state === "na").length,
      },
      review: pack.review.progress,
      templates: pack.templates.counts,
      features: { on: pack.features.on, total: pack.features.total },
      ideas: { count: pack.ideas.count, listed: pack.ideas.items.length },
      environment: { families: pack.environment.families.length, checkedOn: pack.environment.checkedOn },
      launchTarget: pack.launchTarget ? { target: pack.launchTarget.target, fit: pack.launchTarget.fit } : null,
      templateGaps: pack.templateGaps.length,
    },
    sectionNames: [...PACK_SECTIONS],
    howToUse: pack.howToUse,
  };
}

/** One row per template, the fields that decide a read (M85). detail full returns the whole TemplatePackView. */
export function templateSummaryRow(t: TemplatePackView) {
  return {
    id: t.id,
    name: t.name,
    provider: t.provider,
    via: t.via,
    kind: t.kind,
    licenseClass: t.licenseClass,
    audited: t.audited,
    availability: t.availability,
    onChain: t.onChain.status,
    complexity: t.complexity,
    decision: t.decision,
    ponsFit: Boolean(t.ponsFit),
    docsUrl: t.docsUrl ?? t.repoUrl,
    steps: t.steps,
    suggestedBy: t.suggestedBy,
  };
}

export interface TemplatesReadFilter {
  step?: string;
  shape?: ProductShape;
  decision?: TemplateState;
  ids?: readonly string[];
  detail?: "summary" | "full";
}

/**
 * The templates read of a project server (M85). Each template once under
 * templates, the steps that list them by id, the rest under unplaced.
 */
export function templatesRead(pack: ResourcePackView, filter: TemplatesReadFilter = {}) {
  const ids = filter.ids?.length ? new Set(filter.ids) : null;
  const stepsOfShape = new Set(
    pack.checklist.groups.filter((g) => !filter.shape || g.shape === filter.shape || g.shapes.includes(filter.shape)).map((g) => g.key),
  );
  const subsOfShape = filter.shape ? new Set<string>(SHAPE_SUBSECTORS[filter.shape]) : null;
  const items = pack.templates.items.filter((t) => {
    if (ids && !ids.has(t.id)) return false;
    if (filter.decision && t.decision !== filter.decision) return false;
    if (filter.step && !t.steps.includes(filter.step)) return false;
    if (subsOfShape && !t.steps.some((k) => stepsOfShape.has(k)) && !t.subsectors.some((s) => subsOfShape.has(s))) return false;
    return true;
  });
  const listed = new Set(items.map((t) => t.id));
  const steps = pack.checklist.groups
    .filter((g) => g.templates.some((id) => listed.has(id)))
    .filter((g) => !filter.step || g.key === filter.step)
    .map((g) => ({ id: g.key, title: g.title, shape: g.shape, shapes: g.shapes, done: g.done, templateIds: g.templates.filter((id) => listed.has(id)) }));
  const placed = new Set(steps.flatMap((st) => st.templateIds));
  return {
    chain: pack.chain,
    counts: pack.templates.counts,
    listed: items.length,
    filters: { ...filter, detail: filter.detail ?? "summary" },
    steps,
    unplaced: items.filter((t) => !placed.has(t.id)).map((t) => t.id),
    templates: filter.detail === "full" ? items : items.map(templateSummaryRow),
  };
}

export const NO_SHAPE_HINT =
  "This project has no product shape yet. Pick what you are building in the studio Basics step and the resource pack will follow.";

export function buildResourcePack(
  doc: ProjectDoc,
  opts: PackFilter & { includeUnselected?: boolean; launchTarget?: LaunchTarget | null } = {},
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
    flags: flagsOnChain(r, projectChainOf(doc)),
    ...(ranks.has(r.id) ? { readOrder: ranks.get(r.id) } : {}),
    selected: selection.has(r.id),
  });
  const resources = filtered.filter((r) => opts.includeUnselected || selection.has(r.id)).map(view);
  const chain = projectChainOf(doc);
  const info = chainInfo(chain);
  const families = environmentPlanFor(shapes, KIT_ENVIRONMENTS[chain], info.family);
  // Removed steps are left out and added steps appended (M50).
  const hiddenSteps = new Set(kit.hiddenSteps ?? []);
  const checklistItems: Array<ChecklistItem & { custom?: boolean }> = [
    ...checklistFor(shapes).filter((i) => !hiddenSteps.has(i.id) && (!i.feature || hasFeature(kit, i.feature))),
    ...(kit.customSteps ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      detail: c.detail,
      step: "review" as KitStep,
      resources: [] as string[],
      custom: true,
    })),
  ];
  const customShape = new Map((kit.customSteps ?? []).map((c) => [c.id, c.shape] as const));
  const sections = sectionsFor(shapes, kit);
  const groupOf = new Map<string, { ids: readonly string[]; shape: ProductShape }>();
  for (const section of sections)
    for (const g of section.groups) for (const id of g.ids) groupOf.set(id, { ids: g.ids, shape: section.shape });
  const checkedOn = families.length
    ? families.map((f) => f.checkedOn).sort().at(-1) ?? null
    : null;
  const stepsOf = new Map<string, string[]>();
  for (const section of sections)
    for (const g of section.groups)
      for (const t of g.templates) stepsOf.set(t, [...(stepsOf.get(t) ?? []), g.key]);
  const features = featuresFor(shapes);
  // Every template the project can decide (M80), subsector placements and the ids its steps and features cite.
  const reach = reachableTemplatesFor(shapes, chain);
  const templateItems: TemplatePackView[] = reach.items.map((t) => ({
    ...t,
    via: reach.via.get(t.id) ?? "subsector",
    decision: templateState(kit, t.id),
    availability: templateAvailability(t, chain),
    onChain: templateOnChain(t, chain),
    steps: stepsOf.get(t.id) ?? [],
    suggestedBy: featuresSuggesting(features, kit, t.id).map((f) => f.id),
  }));
  const allItems = checklistFor(shapes);
  const featureItems: FeaturePackView[] = features.map((f) => ({
    id: f.id,
    shape: f.id.slice(0, f.id.indexOf(".")) as ProductShape,
    title: f.title,
    detail: f.detail,
    on: hasFeature(kit, f.id),
    steps: allItems.filter((i) => i.feature === f.id).map((i) => i.id),
    templates: [...(f.templates ?? [])],
  }));
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
    chain: { key: chain, name: info.name, testnetChainId: info.chainId, mainnetChainId: info.mainnetChainId },
    shapesMissingTestnet: shapes
      .filter((s) => missingFamilies(s, KIT_ENVIRONMENTS[chain]).length > 0)
      .map((s) => ({ shape: s, missing: missingFamilies(s, KIT_ENVIRONMENTS[chain]) })),
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
        ...(kit.notApplicable?.[i.id] ? { notApplicable: kit.notApplicable[i.id] } : {}),
        ...(kit.evidence?.[i.id] ? { evidence: kit.evidence[i.id] } : {}),
        shape: customShape.get(i.id) ?? (i.id.slice(0, i.id.indexOf(".")) as ProductShape),
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
          templates: [...g.templates],
          ...(g.feature ? { feature: g.feature } : {}),
          done: groupState(g, kit) === "done",
          state: groupState(g, kit),
          ...(groupReason(g, kit) ? { reason: groupReason(g, kit)! } : {}),
          ...(groupEvidence(g, kit) ? { evidence: groupEvidence(g, kit)! } : {}),
          ...(g.custom ? { custom: true } : {}),
        })),
      ),
    },
    review: buildReviewView(doc)!,
    templates: { counts: templateCounts(templateItems.map((t) => t.id), kit), items: templateItems },
    features: { ...featureProgress(features, kit), items: featureItems },
    ideas: {
      count: kit.ideas?.length ?? 0,
      items: shapes.flatMap((s) => ideaRows(kit, s, shapeExamples(s)).map((r) => ({ shape: s, ...r }))),
    },
    templateGaps: shapes.flatMap((s) => {
      const here = templateChainCounts(templatesForShapes(TEMPLATE_CATALOG, [s], chain), chain);
      if (!here.total || here.live) return [];
      const otherChain: ProjectChain = chain === "robinhood_testnet" ? "arbitrum_sepolia" : "robinhood_testnet";
      const other = chainInfo(otherChain);
      const liveOnOther = templateChainCounts(templatesForShapes(TEMPLATE_CATALOG, [s], otherChain), otherChain).live;
      return [
        {
          shape: s,
          label: shapeLabel(s) ?? s,
          mainnet: info.mainnetName,
          otherChain,
          otherMainnet: other.mainnetName,
          liveOnOther,
          plan: TEMPLATE_COPY.noneOnChainPlan(liveOnOther, other.mainnetName, info.mainnetName, other.name),
        },
      ];
    }),
    launchTarget: opts.launchTarget ? launchTargetView(opts.launchTarget, chain, templateItems) : null,
    howToUse: HOW_TO_USE,
  };
}
