import { KIT_CATALOG } from "@/content/kits/catalog";
import { featuresFor } from "@/content/kits/features";
import { TEMPLATE_CATALOG } from "@/content/templates";
import { TEMPLATE_COPY } from "@/content/templates/copy";
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
    items: Array<ChecklistItem & { done: boolean; shape: ProductShape; sharedWith: string[]; custom?: boolean }>;
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
  ideas: { count: number; items: Array<{ shape: ProductShape; text: string; on: boolean; own: boolean }> };
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
  "Fetch rawUrl where present (agent skills, references and templates) and load them into context in readFirst order before touching code. Respect the flags. mainnet_only means no testnet deployment exists, not_on_robinhood means the resource is background reading and cannot be integrated on this chain, unofficial means a community artifact to verify before trusting, self_deploy means the protocol has no deployment on testnet 46630 and the team deploys these contracts itself and records them in its own manifest. chain names the testnet this project builds on, and shapesMissingTestnet lists the shapes whose protocol has no deployment there, for which the team or its agent writes the build steps that fit with set_build_steps. templates lists the contract templates for the shapes with the team's decision on each. accepted means the team will build on or integrate it, rejected means do not propose it again, open means undecided, and availability says what can be done with it on this chain (ready, self_deploy, unknown, unavailable). Never fork a template whose licenseClass is restricted. features lists what the product includes as the team ticked it; a ticked feature's steps are in the checklist and the templates it suggests carry it in suggestedBy, so prefer those on their steps. ideas lists what the team could build with each shape, the catalog lines it ticked (on) and the lines it wrote (own); read them before proposing product scope and add to them through update_project kit.ideas, never drop a line the team ticked. templateGaps lists the shapes with no contract template live on this chain's mainnet, with the count live on the other mainnet and a plan line; follow the plan, accept the other mainnet's templates and iterate for this chain against a fork or a mock, or say the project should move chain, and never present an undeployed template as a build plan. launchTarget, when the linked token design has chosen a venue, names it with its fit on this chain and the templates whose Pons fit line says how they can sit behind a Pons launch; a venue marked off_chain runs on a mainnet this project's chain does not stand in for, so plan the testnet launch on the CanHav curve and say so.";

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
  const templateItems: TemplatePackView[] = templatesForShapes(TEMPLATE_CATALOG, shapes, chain).map((t) => ({
    ...t,
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
