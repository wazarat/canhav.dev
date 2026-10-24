import { z } from "zod";

import { canvasPatchSchema } from "@/lib/canvas";
import { icpListSchema } from "@/lib/icp";
import { competitorsPatchSchema } from "@/lib/competitors/record";
import { DEFAULT_BRAND, brandPatchSchema } from "@/lib/brand/record";
import { investorPackPatchSchema, mergeInvestorPack } from "@/lib/investor-pack";
import { UPDATE_CADENCES } from "@/lib/updates";
import { kindsForPatch, withDrafted, withoutRequest } from "@/lib/draft/requests";
import { grantProgram } from "@/content/grants";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";

import { SECTOR_OPTIONS, WAIVABLE_FIELD_LABELS } from "@/content/ideation";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { templateById } from "@/content/templates";
import { featuresFor } from "@/content/kits/features";
import { LAUNCH_TARGETS, PAIR_VENUES } from "@/lib/launch-targets";
import { TEMPLATE_ID } from "@/lib/templates";
import { reachableTemplateIds } from "@/lib/template-reach";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { checklistFor, groupsFor } from "@/content/kits/checklists";
import { offeredShapes } from "@/content/kits/copy";
import { REVIEW_PASSES } from "@/content/kits/review-passes";
import { PROJECT_CHAINS } from "@/lib/chains";
import { sectorsChange, shapesChange, subsectorsChange } from "@/lib/classify";
import { TOKEN_STEPS } from "@/content/token-steps";
import {
  AUDIENCE_VALUES,
  CRYPTO_EXPERIENCE_VALUES,
  PROJECT_LIMITS,
  REVENUE_RANGE_VALUES,
  TEAM_SIZE_PATTERN,
  TOKEN_DESIGN_LIMITS,
  WAIVABLE_FIELDS,
  type ProjectDoc,
  type TokenDesignDoc,
  type MainnetRecord,
  mainnetRecordEmpty,
  stampContracts,
  testnetContractRows,
  validateMainnetRecord,
} from "@/lib/ideation";
import { JOURNEY_LIMITS } from "@/lib/journey";
import {
  KIT_LIMITS,
  PRODUCT_SHAPE_VALUES,
  STARTING_POINT_VALUES,
  type ProductShape,
  type ProjectKit,
  type StartingPoint,
  type StepGroup,
  addCustomStep,
  editIdea,
  effectiveSelection,
  emptyProjectKit,
  kitShapes,
  kitsForSectors,
  packFor,
  removeStepGroup,
  restoreSteps,
  reviewPassesFor,
  setGroupNotApplicable,
  setReviewVerdict,
  setStepEvidence,
  setTemplateDecision,
  toggleFeature,
  FEATURE_ID,
  toggleChecklistItem,
  toggleIdea,
  toggleResource,
  setReviewEvidence,
} from "@/lib/kits";
import {
  SECTOR_SUBSECTORS,
  SECTOR_VALUES,
  SUBSECTOR_VALUES,
  type Sector,
  type Subsector,
  docSectors,
  sectorOfSubsector,
} from "@/lib/sectors";
import { manualTokenStepIds, setTokenStepEvidence, toggleTokenStep, tokenStepIds } from "@/lib/token-steps";
import type { SessionEvent } from "@/lib/agent-sessions";
import { LOGO_LIMITS, isStoredImageUrl } from "@/lib/image-url";

/**
 * Agent writes (M39). An agent connected to a project's MCP server may change
 * the project draft, tick build steps, and change the linked token design
 * draft. The owner decides how, per project:
 *
 *   off      the agent reads only
 *   propose  every change waits in the studio until the owner accepts it
 *   direct   changes land in the draft at once and are listed in the studio
 *
 * Since M51 a change may also set what the project is classed as (sectors,
 * subsectors, product shapes, starting point), tick resources in the pack and
 * record review verdicts. Agents never publish and never tick the
 * distribution acknowledgement. Those stay with a person.
 *
 * This module is pure so the studio (client) and the MCP tools (server) apply
 * a change with the same code.
 */

export const AGENT_WRITE_MODES = ["off", "propose", "direct"] as const;
export type AgentWriteMode = (typeof AGENT_WRITE_MODES)[number];
export const DEFAULT_AGENT_WRITE_MODE: AgentWriteMode = "propose";

export function isAgentWriteMode(v: unknown): v is AgentWriteMode {
  return AGENT_WRITE_MODES.includes(v as AgentWriteMode);
}

export const AGENT_CHANGE_LIMITS = {
  note: { max: 400 },
  /** Proposals waiting on one project. More are refused until some resolve. */
  pending: { max: 40 },
  buildSteps: { max: 200 },
} as const;

export type AgentChangeTarget = "project" | "token_design";
/**
 * fields and build_steps change a draft; create records that an agent
 * started the linked token design (M82); link records a launch linked to
 * or unlinked from the project (M89).
 */
export type AgentChangeKind = "fields" | "build_steps" | "create" | "link";
/** withdrawn means the agent took a waiting proposal back (M88). */
export type AgentChangeStatus = "proposed" | "applied" | "accepted" | "rejected" | "withdrawn";

export interface BuildStepsPatch {
  done: string[];
  undone: string[];
  /** Steps to add under a shape (M50). Project build steps only. */
  add?: Array<{ shape: string; title: string; detail?: string }>;
  /** Step ids to remove from the sections. A catalog id hides its whole shared group. */
  remove?: string[];
  /** Removed catalog step ids to bring back. */
  restore?: string[];
  /** Evidence per step id (M83). Empty text clears the line. */
  evidence?: Array<{ id: string; text: string }>;
  /** Steps that do not apply, with the reason (M84). Project build steps only. */
  notApplicable?: Array<{ id: string; reason: string }>;
  /** Step ids to mark applicable again. */
  applicable?: string[];
}

/** One recorded agent change, as the studio and the MCP tools see it. */
export interface AgentChange {
  id: string;
  target: AgentChangeTarget;
  kind: AgentChangeKind;
  patch: unknown;
  note: string | null;
  status: AgentChangeStatus;
  createdAt: string;
  resolvedAt: string | null;
  /**
   * What the owner let through on accept (M44), the proposal narrowed to
   * the lines they kept with any edits. Equals `patch` on a full accept and
   * is null on rejected rows, direct writes and rows decided before M44.
   */
  appliedPatch: unknown | null;
}

// ---------------------------------------------------------------------------
// What an agent may send

const L = PROJECT_LIMITS;
const T = TOKEN_DESIGN_LIMITS;

const statusDecl = z
  .strictObject({
    status: z.enum(["in_place", "legal_ops", "planned_before_mainnet", "not_yet"]),
    note: z.string().max(200).optional(),
  })
  // The validator accepts a note only beside "already in place", so refusing
  // it here keeps an agent write from blocking publish later (M130).
  .refine((d) => !d.note || d.status === "in_place", 'A note goes with "in_place" only');

const persona = z.strictObject({
  teamSize: z
    .string()
    .max(L.personaTeamSize.max)
    .refine((v) => !v.trim() || TEAM_SIZE_PATTERN.test(v.trim()), "A number or a range like 10-50")
    .default(""),
  geography: z.string().max(L.personaText.max).default(""),
  industry: z.string().max(L.personaText.max).default(""),
  primaryContact: z.string().max(L.personaText.max).default(""),
  revenueRange: z.enum(["", ...REVENUE_RANGE_VALUES]).default(""),
});

const consumerPersona = z.strictObject({
  ageRange: z
    .string()
    .max(L.personaAgeRange.max)
    .refine((v) => !v.trim() || TEAM_SIZE_PATTERN.test(v.trim()), "A number or a range like 25-40")
    .default(""),
  geography: z.string().max(L.personaText.max).default(""),
  cryptoExperience: z.enum(["", ...CRYPTO_EXPERIENCE_VALUES]).default(""),
  howTheyFindYou: z.string().max(L.personaText.max).default(""),
  holdings: z.string().max(L.personaText.max).default(""),
});

export const projectPatchSchema = z
  .strictObject({
    name: z.string().max(L.name.max),
    whatItDoes: z.string().max(L.whatItDoes.max),
    audience: z.enum(AUDIENCE_VALUES),
    personas: z.array(persona).max(L.personas.max),
    // Recommended fields marked not applicable with a reason (M130). A key
    // sent as null clears that waiver; a stated value always wins over one.
    waived: z.partialRecord(z.enum(WAIVABLE_FIELDS), z.string().min(L.waiver.min).max(L.waiver.max).nullable()),
    consumerPersonas: z.array(consumerPersona).max(L.personas.max),
    payer: z.enum(["", "user", "third_party"]),
    whoPays: z.string().max(L.whoPays.max),
    whyThisChain: z.string().max(L.whyThisChain.max),
    stage: z.enum(["idea", "design_doc", "prototype", "testnet_deployed", "live_elsewhere"]),
    architecture: z
      .strictObject({
        contracts: z.string().max(L.architectureField.max),
        externalDeps: z
          .array(
            z.strictObject({
              name: z.string().min(L.externalDepName.min).max(L.externalDepName.max),
              url: z
                .string()
                .max(L.externalDepUrl.max)
                .regex(/^https?:\/\/\S+$/)
                .optional(),
            }),
          )
          .max(L.externalDeps.max),
        externalDepsNone: z.boolean(),
        oracleUse: z.enum(["none", "uses"]),
        oracles: z.string().max(L.architectureField.max),
        adminFunctions: z.string().max(L.architectureField.max),
        upgradeability: z.enum(["immutable", "upgradeable_proxy", "partially", "undecided"]),
      })
      .partial(),
    worstCase: z.enum(["lose_funds", "lock_funds", "misprice", "nothing_serious"]),
    security: z
      .strictObject({
        audit: statusDecl,
        bugBounty: statusDecl,
        monitoring: statusDecl,
        incidentResponse: statusDecl,
        keyCustody: statusDecl,
      })
      .partial(),
    firstHundredUsers: z.string().max(L.firstHundredUsers.max),
    githubRepo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
    website: z.string().regex(/^https:\/\/\S+$/).max(L.website.max),
    // Rows or plain addresses (M83); the list replaces the stored list.
    testnetContracts: z
      .array(
        z.union([
          z.string().regex(/^0x[0-9a-f]{40}$/),
          z.strictObject({
            address: z.string().regex(/^0x[0-9a-f]{40}$/),
            label: z.string().max(L.mainnetLabel.max).optional(),
          }),
        ]),
      )
      .max(L.testnetContracts.max),
    addressBook: z.string().regex(/^https:\/\/\S+$/).max(L.addressBook.max),
    // The logo (M90), a URL on CanHav's image store from set_logo; null clears it.
    logo: z.string().max(LOGO_LIMITS.max).refine(isStoredImageUrl, "Logo must be an image uploaded to CanHav through set_logo").nullable(),
    verifyWallet: z.string().regex(/^0x[0-9a-f]{40}$/),
    // The deployer key's address (M102), never the key; null clears it.
    deployer: z.string().regex(/^0x[0-9a-f]{40}$/).nullable(),
    // Where the deployer key lives in the repository (M138), relative, null for the default.
    deployerEnvFile: z.string().max(L.deployerEnvFile.max).regex(/^(?!\/)(?!.*(^|\/)\.\.(\/|$))[\w./@ -]+$/, "A relative path inside the repository").nullable(),
    // The brand kit (M118): palette, fonts, tone and tagline merge over the stored kit; null clears it.
    brand: brandPatchSchema.nullable(),
    // The investor pack (M126): onepager, deck and grants merge over the stored pack; null clears it.
    investorPack: investorPackPatchSchema.nullable(),
    // How often the team posts an update (Studio+); null means the default weekly.
    updateCadence: z.enum(UPDATE_CADENCES).nullable(),
    // Competitors (M115): the line and the map state merge over the stored ones; null clears them.
    competitors: competitorsPatchSchema.nullable(),
    // Ideal customer profiles (M114): the list replaces the stored one; null clears it.
    icp: icpListSchema.nullable(),
    // The Business Model Canvas (M113): blocks merge over the stored ones; null clears it.
    canvas: canvasPatchSchema.nullable(),
    // The agent's summary (M104): both lists replace the stored ones; null clears it.
    summary: z
      .strictObject({
        built: z.array(z.string().min(L.summary.textMin).max(L.summary.textMax)).max(L.summary.lines),
        building: z.array(z.string().min(L.summary.textMin).max(L.summary.textMax)).max(L.summary.lines),
      })
      .nullable(),
    // The mainnet deployment and the Pons pairing (M70). Merged into the stored
    // record; contracts replace the stored list; null clears the whole record.
    // The chain id is always the mainnet the project's chain stands in for.
    mainnet: z
      .strictObject({
        contracts: z
          .array(
            z.strictObject({
              label: z.string().min(L.mainnetLabel.min).max(L.mainnetLabel.max),
              address: z.string().regex(/^0x[0-9a-f]{40}$/),
            }),
          )
          .max(L.mainnetContracts.max),
        companionTemplate: z.string().regex(TEMPLATE_ID).nullable(),
        pons: z
          .strictObject({
            tokenAddress: z.string().regex(/^0x[0-9a-f]{40}$/),
            feeRecipient: z.string().regex(/^0x[0-9a-f]{40}$/),
          })
          .nullable(),
        // An external trading pair (M78). The chain rule and the quote asset
        // shape are checked by validateMainnetPair through projectPatchProblem.
        pair: z
          .strictObject({
            venue: z.enum(PAIR_VENUES),
            quoteAsset: z.string().min(L.pairQuoteAsset.min).max(42),
            pairAddress: z.string().regex(/^0x[0-9a-f]{40}$/).optional(),
            url: z.string().regex(/^https:\/\/\S+$/).max(L.pairUrl.max),
          })
          .nullable(),
      })
      .partial()
      .nullable(),
    // What the project is classed as (M51). Applied through lib/classify.ts,
    // so the fields that follow a pick move with it, the same as in the editor.
    // The team's own files, by reference (M53). The list replaces the stored list.
    references: z
      .array(
        z.strictObject({
          title: z.string().min(L.referenceTitle.min).max(L.referenceTitle.max),
          location: z.string().min(L.referenceLocation.min).max(L.referenceLocation.max),
          note: z.string().max(L.referenceNote.max).default(""),
          evidence: z.string().max(L.referenceEvidence.max).optional(),
        }),
      )
      .max(L.references.max),
    // The chain the project builds on (M52). Refused once a token has launched from it.
    chain: z.enum(PROJECT_CHAINS),
    sectors: z.array(z.enum(SECTOR_VALUES as [Sector, ...Sector[]])).min(L.sectors.min).max(L.sectors.max),
    sectorOther: z.string().max(L.sectorOther.max),
    subsectors: z.array(z.enum(SUBSECTOR_VALUES as [Subsector, ...Subsector[]])).max(SUBSECTOR_VALUES.length),
    kit: z
      .strictObject({
        shapes: z
          .array(z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]))
          .max(KIT_LIMITS.shapes.max),
        startingPoint: z.enum(STARTING_POINT_VALUES as [StartingPoint, ...StartingPoint[]]),
        existingProduct: z.string().max(KIT_LIMITS.existingProduct.max),
        resources: z
          .strictObject({
            tick: z.array(z.string().max(120)).max(KIT_LIMITS.ids.max),
            untick: z.array(z.string().max(120)).max(KIT_LIMITS.ids.max),
          })
          .partial(),
        review: z
          .array(
            z.strictObject({
              pass: z.string().max(120),
              // "open" clears a recorded verdict.
              verdict: z.enum(["pass", "fail", "na", "open"]),
              // The evidence behind it (M121), a run link or a line; empty clears it.
              evidence: z.string().max(KIT_LIMITS.evidence.textMax).optional(),
            }),
          )
          .max(KIT_LIMITS.review.max),
        // What you could build (M68 follow-up), the list replaces the stored list.
        ideas: z
          .array(
            z.strictObject({
              shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]),
              text: z.string().min(KIT_LIMITS.ideas.textMin).max(KIT_LIMITS.ideas.textMax),
              // The catalog example the line was edited from, which then steps aside.
              from: z.string().min(1).max(KIT_LIMITS.ideas.textMax).optional(),
            }),
          )
          .max(KIT_LIMITS.ideas.max),
        // Add or remove single lines (M84), applied through toggleIdea and editIdea.
        addIdeas: z
          .array(
            z.strictObject({
              shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]),
              text: z.string().min(KIT_LIMITS.ideas.textMin).max(KIT_LIMITS.ideas.textMax),
              from: z.string().min(1).max(KIT_LIMITS.ideas.textMax).optional(),
            }),
          )
          .max(KIT_LIMITS.ideas.max),
        removeIdeas: z
          .array(
            z.strictObject({
              shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]),
              text: z.string().min(1).max(KIT_LIMITS.ideas.textMax),
            }),
          )
          .max(KIT_LIMITS.ideas.max),
        // Contract template decisions (M63), template id to decision. A record,
        // so the owner's panel decides each id on its own. "open" clears one.
        templates: z
          .record(z.string().max(80).regex(TEMPLATE_ID), z.enum(["accepted", "rejected", "open"]))
          .refine((o) => Object.keys(o).length <= KIT_LIMITS.templates.max, "Too many template decisions"),
        // Features (M64), feature id to ticked. A record, one panel line per id.
        features: z
          .record(z.string().max(120).regex(FEATURE_ID), z.boolean())
          .refine((o) => Object.keys(o).length <= KIT_LIMITS.features.max, "Too many features"),
      })
      .partial(),
  })
  .partial();

export type ProjectPatch = z.infer<typeof projectPatchSchema>;

const pct = z.number().int().min(0).max(100);
const months = z.number().int().min(T.vestingMonths.min).max(T.vestingMonths.max);

export const tokenDesignPatchSchema = z
  .strictObject({
    name: z.string().max(T.name.max),
    ticker: z.string().max(T.ticker.max).regex(T.ticker.pattern),
    logo: z.string().max(LOGO_LIMITS.max).refine(isStoredImageUrl, "Logo must be an image uploaded to CanHav through set_logo").nullable(),
    rationale: z
      .strictObject({
        why: z.enum([
          "token_is_product",
          "bootstrap_supply",
          "economic_security",
          "governance",
          "fee_capture",
          "fundraising",
          "not_sure",
        ]),
        path: z.enum(["issue_and_lock", "points_first", "straight_to_market"]),
        beyondDatabaseRow: z.string().max(T.beyondDatabaseRow.max),
      })
      .partial(),
    supply: z
      .strictObject({
        total: z.number().min(T.supplyTotal.min).max(T.supplyTotal.max),
        policy: z.enum(["fixed", "inflationary"]),
        inflationNote: z.string().max(T.inflationNote.max),
        allocations: z
          .strictObject({
            team: pct,
            investors: pct,
            treasuryEcosystem: pct,
            public: pct,
            liquidity: pct,
            advisors: pct,
            other: pct,
            otherLabel: z.string().max(60),
          })
          .partial(),
      })
      .partial(),
    vesting: z
      .strictObject({
        cohorts: z
          .array(
            z.strictObject({
              cohort: z.enum(["team", "investors", "advisors"]),
              cliffMonths: months,
              durationMonths: months,
            }),
          )
          .max(3),
        release: z.enum(["linear", "milestone_conditional", "cliff_then_linear"]),
        founderLeaves: z.enum([
          "returns_to_treasury",
          "returns_to_team",
          "continues_vesting",
          "no_policy",
        ]),
      })
      .partial(),
    distribution: z
      .strictObject({
        event: z.enum(["none", "airdrop", "fixed_price_sale", "auction", "lbp"]),
        sale: z
          .strictObject({
            price: z.number().min(0),
            hardCap: z.number().min(0),
            softCap: z.number().min(0),
            perWalletLimit: z.number().min(0),
            access: z.enum(["allowlist", "open"]),
            undersubscription: z.enum(["proceed", "refund", "postpone", "no_plan"]),
          })
          .partial(),
      })
      .partial(),
    market: z
      .strictObject({
        when: z.enum(["at_launch", "later", "never"]),
        launchTarget: z.enum(LAUNCH_TARGETS),
        atLaunch: z
          .strictObject({
            liquidityEth: z.number().min(0),
            ethSource: z.string().max(T.ethSource.max),
            lp: z.enum(["locked", "burned", "unlocked"]),
            lpLockMonths: z.number().int().min(T.lpLockMonths.min).max(T.lpLockMonths.max),
            antiSniping: z.enum(["window", "tax", "delay", "none"]),
          })
          .partial(),
      })
      .partial(),
    governance: z
      .strictObject({
        mechanism: statusDecl,
        adminKeys: statusDecl,
        treasuryCustody: statusDecl,
      })
      .partial(),
    legal: z
      .strictObject({
        counsel: z.enum(["working_with_counsel", "engaging_before_mainnet", "not_yet"]),
      })
      .partial(),
    postLaunch: z
      .strictObject({
        runwayMonths: z.number().int().min(T.runwayMonths.min).max(T.runwayMonths.max),
        reporting: z.enum(["monthly", "quarterly", "ad_hoc", "none_yet"]),
        priceCollapsePlan: z.string().max(T.priceCollapsePlan.max),
        failureCriteria: z.string().max(T.failureCriteria.max),
        milestones: z
          .array(
            z.strictObject({
              date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              title: z.string().min(1).max(JOURNEY_LIMITS.milestones.titleMax),
              description: z.string().max(JOURNEY_LIMITS.milestones.descriptionMax).default(""),
            }),
          )
          .min(JOURNEY_LIMITS.milestones.min)
          .max(JOURNEY_LIMITS.milestones.max),
      })
      .partial(),
  })
  .partial();

export type TokenDesignPatch = z.infer<typeof tokenDesignPatchSchema>;

export const buildStepsPatchSchema = z.strictObject({
  done: z.array(z.string().max(120)).max(AGENT_CHANGE_LIMITS.buildSteps.max).default([]),
  undone: z.array(z.string().max(120)).max(AGENT_CHANGE_LIMITS.buildSteps.max).default([]),
  add: z
    .array(
      z.strictObject({
        shape: z.string().max(60),
        title: z.string().min(KIT_LIMITS.customSteps.titleMin).max(KIT_LIMITS.customSteps.titleMax),
        detail: z.string().max(KIT_LIMITS.customSteps.detailMax).default(""),
      }),
    )
    .max(20)
    .default([]),
  remove: z.array(z.string().max(120)).max(AGENT_CHANGE_LIMITS.buildSteps.max).default([]),
  restore: z.array(z.string().max(120)).max(AGENT_CHANGE_LIMITS.buildSteps.max).default([]),
  evidence: z
    .array(z.strictObject({ id: z.string().max(120), text: z.string().max(KIT_LIMITS.evidence.textMax) }))
    .max(AGENT_CHANGE_LIMITS.buildSteps.max)
    .default([]),
  notApplicable: z
    .array(
      z.strictObject({
        id: z.string().max(120),
        reason: z.string().min(KIT_LIMITS.notApplicable.textMin).max(KIT_LIMITS.notApplicable.textMax),
      }),
    )
    .max(AGENT_CHANGE_LIMITS.buildSteps.max)
    .default([]),
  applicable: z.array(z.string().max(120)).max(AGENT_CHANGE_LIMITS.buildSteps.max).default([]),
});

/**
 * One key per entry of a build step change, in the order buildStepLines
 * lists them. Ticks keep the bare step id; the rest are prefixed, and an
 * added step is keyed by its position in the proposal.
 */
export function buildStepKeys(patch: BuildStepsPatch): string[] {
  return [
    ...patch.done,
    ...patch.undone,
    ...(patch.add ?? []).map((_, i) => `add:${i}`),
    ...(patch.remove ?? []).map((id) => `remove:${id}`),
    ...(patch.restore ?? []).map((id) => `restore:${id}`),
    ...(patch.evidence ?? []).map((e) => `evidence:${e.id}`),
    ...(patch.notApplicable ?? []).map((e) => `na:${e.id}`),
    ...(patch.applicable ?? []).map((id) => `applicable:${id}`),
  ];
}

const ADDRESS_PATTERN = "/^0x[0-9a-f]{40}$/";

function valueAtPath(input: unknown, path: ReadonlyArray<PropertyKey>): unknown {
  let cur: unknown = input;
  for (const part of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<PropertyKey, unknown>)[part];
  }
  return cur;
}

function sizeOf(v: unknown): number | null {
  if (typeof v === "string") return v.length;
  if (Array.isArray(v)) return v.length;
  if (typeof v === "number") return v;
  return null;
}

function unitOf(origin: unknown, size: number): string {
  if (origin === "string") return size === 1 ? "character" : "characters";
  if (origin === "array" || origin === "set") return size === 1 ? "item" : "items";
  return "";
}

/**
 * One zod issue in words an agent can act on, the field path in front and
 * the number that broke the rule beside the limit (M80). "architecture
 * .contracts is 812 characters, max 800" instead of "Invalid input".
 */
export function describeIssue(issue: z.core.$ZodIssue, input?: unknown): string {
  const path = issue.path.map((p) => String(typeof p === "object" && p !== null ? (p as { key: PropertyKey }).key : p)).join(".");
  const field = path || "The input";
  const actual = sizeOf(valueAtPath(input, issue.path as PropertyKey[]));
  switch (issue.code) {
    case "too_big": {
      const size = actual ?? null;
      const unit = unitOf(issue.origin, size ?? 0);
      const is = size === null ? "is too long" : `is ${size}${unit ? ` ${unit}` : ""}`;
      return `${field} ${is}, max ${issue.maximum}${unit && size === null ? ` ${unitOf(issue.origin, 2)}` : ""}.`;
    }
    case "too_small": {
      const size = actual ?? null;
      const unit = unitOf(issue.origin, size ?? 0);
      const is = size === null ? "is too short" : `is ${size}${unit ? ` ${unit}` : ""}`;
      return `${field} ${is}, min ${issue.minimum}${unit && size === null ? ` ${unitOf(issue.origin, 2)}` : ""}.`;
    }
    case "invalid_format": {
      const pattern = "pattern" in issue ? String(issue.pattern) : null;
      if (pattern === ADDRESS_PATTERN) return `${field} must be a lowercase 0x address of 40 hex characters.`;
      if (issue.format === "regex" && pattern) return `${field} must match ${pattern}.`;
      return `${field} must be a valid ${issue.format}.`;
    }
    case "unrecognized_keys":
      return `${field} has no field ${issue.keys.join(", ")}.`;
    case "invalid_value":
      return `${field} must be one of ${issue.values.map((v) => String(v)).join(", ")}.`;
    case "invalid_type":
      return `${field} must be ${/^[aeiou]/.test(issue.expected) ? "an" : "a"} ${issue.expected}${actual === null && valueAtPath(input, issue.path as PropertyKey[]) === undefined ? " and is missing" : ""}.`;
    case "invalid_key":
      return `${field} is not a valid key${"origin" in issue && issue.origin === "record" ? " in this record" : ""}.`;
    case "invalid_union":
      return `${field} does not match any of the accepted shapes.`;
    default:
      return path ? `${path}. ${issue.message}` : issue.message;
  }
}

/** Up to three issues of a zod failure in words, then what happened to the change. */
export function describeIssues(error: z.ZodError, input?: unknown): string {
  const lines = error.issues.slice(0, 3).map((i) => describeIssue(i, input));
  if (!lines.length) return "The change is not valid. Nothing was changed.";
  const more = error.issues.length > 3 ? ` ${error.issues.length - 3} more.` : "";
  return `${lines.join(" ")}${more} Nothing was changed.`;
}

/** First readable problem in a zod failure, with the field path in front. */
export function firstIssue(error: z.ZodError, input?: unknown): string {
  const issue = error.issues[0];
  if (!issue) return "The change is not valid.";
  return describeIssue(issue, input);
}

// ---------------------------------------------------------------------------
// Applying a change

function isPlain(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Objects merge key by key, everything else (arrays included) replaces. */
function deepMerge<D>(base: D, patch: unknown): D {
  if (!isPlain(patch) || !isPlain(base)) return patch as D;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = isPlain(v) && isPlain(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out as D;
}

export function applyProjectPatch(doc: ProjectDoc, patch: ProjectPatch): ProjectDoc {
  return markDraftedFields(applyProjectPatchInner(doc, patch), patch as Record<string, unknown>);
}

/** A field an agent writes clears its draft request and reads as drafted by the agent (M117); the pack clears part by part (M141). */
function markDraftedFields(doc: ProjectDoc, patch: Record<string, unknown>): ProjectDoc {
  let next = doc;
  for (const kind of kindsForPatch(patch)) {
    const requests = withoutRequest(next, kind);
    next = { ...next, drafted: withDrafted(next, kind, "agent"), ...(requests ? { draftRequests: requests } : {}) };
    if (!requests) next = dropKey(next, "draftRequests");
  }
  return next;
}

function applyProjectPatchInner(doc: ProjectDoc, patch: ProjectPatch): ProjectDoc {
  const { sectors, subsectors, kit: kitPatch, ...fields } = patch;
  let next = deepMerge(doc, fields);
  // Testnet contracts arrive as rows or plain addresses and are stored as rows (M83).
  // The rows are stamped with their provenance (M150): new addresses as recorded by the agent now, known ones keep their stamp.
  if (patch.testnetContracts)
    next = { ...next, testnetContracts: stampContracts(testnetContractRows(doc), testnetContractRows({ testnetContracts: patch.testnetContracts }), "agent") };
  if (patch.logo === null) next = dropKey(next, "logo");
  if (patch.deployer === null) next = dropKey(next, "deployer");
  if (patch.deployerEnvFile === null) next = dropKey(next, "deployerEnvFile");
  if (patch.waived) {
    const cur: Record<string, string> = { ...(doc.waived ?? {}) };
    for (const [k, v] of Object.entries(patch.waived)) {
      if (v === null) delete cur[k];
      else if (typeof v === "string") cur[k] = v.trim();
    }
    next = Object.keys(cur).length ? { ...next, waived: cur as ProjectDoc["waived"] } : dropKey(next, "waived");
  }
  if (patch.brand === null) next = dropKey(next, "brand");
  else if (patch.brand) {
    const cur = next.brand ?? DEFAULT_BRAND;
    next = { ...next, brand: { ...cur, palette: { ...cur.palette, ...(patch.brand.palette ?? {}) }, fonts: { ...cur.fonts, ...(patch.brand.fonts ?? {}) }, tone: patch.brand.tone ?? cur.tone, ...(patch.brand.tagline !== undefined ? { tagline: patch.brand.tagline } : cur.tagline ? { tagline: cur.tagline } : {}) } };
  }
  if (patch.updateCadence === null) next = dropKey(next, "updateCadence");
  if (patch.investorPack === null) next = dropKey(next, "investorPack");
  else if (patch.investorPack) next = { ...next, investorPack: mergeInvestorPack(next.investorPack, patch.investorPack) };
  if (patch.competitors === null) next = dropKey(next, "competitors");
  else if (patch.competitors) next = { ...next, competitors: { differentiator: "", ...(next.competitors ?? {}), ...patch.competitors } };
  if (patch.icp === null) next = dropKey(next, "icp");
  else if (patch.icp) next = { ...next, icp: patch.icp };
  if (patch.canvas === null) next = dropKey(next, "canvas");
  else if (patch.canvas) next = { ...next, canvas: { ...(next.canvas ?? {}), ...patch.canvas } };
  if (patch.summary === null) next = dropKey(next, "summary");
  else if (patch.summary) next = { ...next, summary: { ...patch.summary, updatedAt: new Date().toISOString() } };
  const a = { ...next.architecture };
  // The two dependency answers exclude each other. The one the agent sent wins.
  if (patch.architecture?.externalDepsNone === true) a.externalDeps = [];
  else if (patch.architecture?.externalDeps?.length) a.externalDepsNone = false;
  next = { ...next, architecture: a };
  // Classification in the order the editor asks for it, each with its cascade.
  if (sectors) next = { ...next, ...sectorsChange(next, sectors) };
  if (subsectors) next = { ...next, ...subsectorsChange(next, subsectors) };
  if (kitPatch?.shapes) next = { ...next, ...shapesChange(next, kitPatch.shapes) };
  // A kit exists from the first pick on, the same as the editor's patchKit.
  const kits = kitsForSectors(docSectors(next), next.subsectors ?? []);
  const base = next.kit ?? (kits.length ? emptyProjectKit(kits) : undefined);
  if (kitPatch && base) {
    let kit = base;
    if (kitPatch.startingPoint !== undefined) kit = { ...kit, startingPoint: kitPatch.startingPoint };
    if (kitPatch.existingProduct !== undefined) kit = { ...kit, existingProduct: kitPatch.existingProduct };
    const { tick = [], untick = [] } = kitPatch.resources ?? {};
    if (tick.length || untick.length) {
      const pack = packFor(KIT_CATALOG, kit, next);
      for (const [ids, on] of [[tick, true], [untick, false]] as const)
        for (const id of ids) {
          const r = pack.find((x) => x.id === id);
          const ticked = effectiveSelection(pack, kit).has(id);
          if (r && ticked !== on) kit = { ...kit, ...toggleResource(kit, r, ticked) };
        }
    }
    for (const v of kitPatch.review ?? []) {
      kit = { ...kit, ...setReviewVerdict(kit, v.pass, v.verdict === "open" ? null : v.verdict) };
      if (v.evidence !== undefined) kit = { ...kit, ...setReviewEvidence(kit, v.pass, v.evidence) };
    }
    for (const [id, d] of Object.entries(kitPatch.templates ?? {}))
      kit = { ...kit, ...setTemplateDecision(kit, id, d === "open" ? null : d) };
    for (const [id, on] of Object.entries(kitPatch.features ?? {}))
      kit = { ...kit, ...toggleFeature(kit, id, on) };
    if (kitPatch.ideas) {
      const own = new Set(kitShapes(kit));
      const seen = new Set<string>();
      const ideas = kitPatch.ideas
        .map((i) => (i.from ? { shape: i.shape, text: i.text.trim(), from: i.from.trim() } : { shape: i.shape, text: i.text.trim() }))
        .filter((i) => own.has(i.shape) && i.text && !seen.has(`${i.shape}\n${i.text}`) && seen.add(`${i.shape}\n${i.text}`));
      kit = { ...kit, ideas: ideas.length ? ideas : undefined };
    }
    for (const i of kitPatch.removeIdeas ?? []) kit = { ...kit, ...toggleIdea(kit, i.shape, i.text, false) };
    for (const i of kitPatch.addIdeas ?? [])
      kit = { ...kit, ...(i.from ? editIdea(kit, i.shape, i.from, i.text, true) : toggleIdea(kit, i.shape, i.text, true)) };
    // Keys set to undefined by the helpers must not be stored.
    next = { ...next, kit: Object.fromEntries(Object.entries(kit).filter(([, v]) => v !== undefined)) as unknown as ProjectKit };
  }
  // Mainnet record (M70). Stamp the chain id, drop nulls, and leave the key out when nothing is recorded.
  if ("mainnet" in patch) {
    const { mainnet: raw, ...rest } = next as ProjectDoc & { mainnet?: unknown };
    const merged = (patch.mainnet === null ? null : raw) as (Partial<MainnetRecord> & { companionTemplate?: string | null; pons?: MainnetRecord["pons"] | null; pair?: MainnetRecord["pair"] | null }) | null;
    if (merged) {
      const record: MainnetRecord = { chainId: chainInfo(projectChainOf(rest)).mainnetChainId, contracts: merged.contracts ?? [] };
      if (merged.companionTemplate) record.companionTemplate = merged.companionTemplate;
      if (merged.pons) record.pons = merged.pons;
      if (merged.pair) record.pair = merged.pair;
      next = mainnetRecordEmpty(record) ? (rest as ProjectDoc) : { ...rest, mainnet: record };
    } else {
      next = rest as ProjectDoc;
    }
  }
  return next;
}

/**
 * Null when the classification part of a change can be applied to this
 * draft, else the problem in words an agent can act on. Field bounds are the
 * schema's job; this checks what depends on the draft (M51).
 */
export function projectPatchProblem(doc: ProjectDoc, patch: ProjectPatch): string | null {
  let next = doc;
  if (patch.mainnet) {
    // The record as it would be stored, checked with the project's own rule (M70).
    const after = applyProjectPatch(doc, { ...patch, sectors: undefined, subsectors: undefined, kit: undefined });
    if (after.mainnet) {
      const problem = validateMainnetRecord(after, after.mainnet);
      if (problem) return problem;
      const id = after.mainnet.companionTemplate;
      if (id && !templateById(id)?.ponsFit)
        return `${templateById(id)?.name ?? id} carries no Pons fit line, so it cannot be the companion contract. Read get_templates for the accepted templates with ponsFit.`;
    }
  }
  if (patch.sectors) {
    const closed = patch.sectors.filter((s) => SECTOR_OPTIONS.find((o) => o.value === s)?.available === false);
    if (closed.length) return `${closed.join(", ")} is not open on CanHav yet. Open sectors are ${SECTOR_OPTIONS.filter((o) => o.available !== false).map((o) => o.value).join(" and ")}.`;
    next = { ...next, ...sectorsChange(next, patch.sectors) };
  }
  const sectors = docSectors(next);
  if (patch.subsectors) {
    const stray = patch.subsectors.filter((s) => !sectors.includes(sectorOfSubsector(s)));
    if (stray.length) return `${stray[0]} belongs to ${sectorOfSubsector(stray[0])}, which is not one of this project's sectors (${sectors.join(", ") || "none"}). Send sectors in the same change.`;
    for (const sector of sectors) {
      const n = patch.subsectors.filter((s) => SECTOR_SUBSECTORS[sector].includes(s)).length;
      if (n > PROJECT_LIMITS.subsectors.max) return `At most ${PROJECT_LIMITS.subsectors.max} subsectors per sector.`;
    }
    next = { ...next, ...subsectorsChange(next, patch.subsectors) };
  }
  const k = patch.kit;
  if (!k) return null;
  if (kitsForSectors(sectors, next.subsectors ?? []).length === 0 && !next.kit)
    return "This project has no subsector with product shapes yet. Send sectors and subsectors first, in the same change or an earlier one.";
  if (k.shapes) {
    if (k.shapes.length > KIT_LIMITS.shapes.max) return `At most ${KIT_LIMITS.shapes.max} shapes per project. Pick the ones the product is really made of.`;
    const offered = offeredShapes(next.subsectors ?? []);
    const stray = k.shapes.filter((s) => !offered.includes(s));
    if (stray.length) return `${stray[0]} is not offered under this project's subsectors (${(next.subsectors ?? []).join(", ") || "none"}). Offered shapes are ${offered.join(", ") || "none"}.`;
    next = { ...next, ...shapesChange(next, k.shapes) };
  }
  const shapes = kitShapes(next.kit);
  const tick = k.resources?.tick ?? [];
  const untick = k.resources?.untick ?? [];
  if ((tick.length || untick.length || k.review?.length) && shapes.length === 0)
    return "This project has no product shape yet, so it has no resource pack and no review passes. Send kit.shapes first.";
  if (tick.length || untick.length) {
    const pack = new Set(packFor(KIT_CATALOG, next.kit, next).map((r) => r.id));
    const unknown = [...tick, ...untick].filter((id) => !pack.has(id));
    if (unknown.length) return `Unknown resource ${unknown.slice(0, 3).join(", ")}. Read get_resource_pack with includeUnselected for the ids.`;
    const both = tick.filter((id) => untick.includes(id));
    if (both.length) return `${both[0]} is in both tick and untick.`;
  }
  if (k.review?.length) {
    const passes = new Set(reviewPassesFor(REVIEW_PASSES, shapes).map((p) => p.id));
    const unknown = k.review.filter((v) => !passes.has(v.pass));
    if (unknown.length) return `Unknown review pass ${unknown[0].pass}. Read get_prelaunch_review for the ids.`;
  }
  const decided = Object.keys(k.templates ?? {});
  if (decided.length) {
    if (shapes.length === 0)
      return "This project has no product shape yet, so it has no contract templates. Send kit.shapes first.";
    // The one decidable set (M80), the same get_templates lists.
    const reachable = reachableTemplateIds(shapes, projectChainOf(next), { includeInactive: true });
    const unknown = decided.filter((id) => !reachable.has(id));
    if (unknown.length) {
      const ids = [...reachable];
      const shown = ids.slice(0, 20).join(", ");
      const rest = ids.length > 20 ? ` and ${ids.length - 20} more on get_templates` : "";
      return `Unknown template ${unknown.slice(0, 3).join(", ")}. This project's shapes can decide ${shown}${rest}.`;
    }
  }
  const ideaLines = [...(k.ideas ?? []), ...(k.addIdeas ?? []), ...(k.removeIdeas ?? [])];
  if (ideaLines.length) {
    const stray = ideaLines.filter((i) => !shapes.includes(i.shape));
    if (stray.length) return `${stray[0].shape} is not one of this project's shapes (${shapes.join(", ") || "none"}), so a what you could build line cannot name it.`;
  }
  const ticked = Object.keys(k.features ?? {});
  if (ticked.length) {
    if (shapes.length === 0) return "This project has no product shape yet, so it has no features. Send kit.shapes first.";
    const known = new Set(featuresFor(shapes).map((f) => f.id));
    const unknown = ticked.filter((id) => !known.has(id));
    if (unknown.length) return `Unknown feature ${unknown.slice(0, 3).join(", ")}. Read get_build_steps for the feature ids of this project's shapes.`;
  }
  return null;
}

export function applyTokenDesignPatch(doc: TokenDesignDoc, patch: TokenDesignPatch): TokenDesignDoc {
  const next = deepMerge(doc, patch);
  return patch.logo === null ? dropKey(next, "logo") : next;
}

/** The object without one key, so a cleared optional field is never stored as null. */
function dropKey<T extends object>(obj: T, key: string): T {
  const { [key as keyof T]: _dropped, ...rest } = obj;
  void _dropped;
  return rest as T;
}

/** The build step ids this project's chosen shapes offer. */
export function buildStepIds(doc: ProjectDoc): Set<string> {
  return new Set([
    ...checklistFor(kitShapes(doc.kit)).map((i) => i.id),
    // Steps the team added (M50) are ticked by id like the rest.
    ...(doc.kit?.customSteps ?? []).map((c) => c.id),
  ]);
}

/** Null when every id belongs to this project's build steps, else the problem. */
export function buildStepsProblem(doc: ProjectDoc, patch: BuildStepsPatch): string | null {
  if (!doc.kit || kitShapes(doc.kit).length === 0)
    return "This project has no product shape yet, so it has no build steps. Set kit.shapes with update_project, or the owner picks a shape in the studio.";
  if (buildStepKeys(patch).length === 0) return "Name at least one build step.";
  const known = buildStepIds(doc);
  const add = patch.add ?? [];
  const remove = patch.remove ?? [];
  const restore = patch.restore ?? [];
  const evidence = patch.evidence ?? [];
  const na = patch.notApplicable ?? [];
  const applicable = patch.applicable ?? [];
  const unknown = [...patch.done, ...patch.undone, ...remove, ...restore, ...evidence.map((e) => e.id), ...na.map((e) => e.id), ...applicable].filter((id) => !known.has(id));
  if (unknown.length)
    return `Unknown build step ${unknown.slice(0, 3).join(", ")}. Read get_build_steps for the ids.`;
  const both = patch.done.filter((id) => patch.undone.includes(id));
  if (both.length) return `${both[0]} is in both done and undone.`;
  const naAndDone = na.filter((e) => patch.done.includes(e.id));
  if (naAndDone.length) return `${naAndDone[0].id} is in both done and notApplicable.`;
  const naAndBack = na.filter((e) => applicable.includes(e.id));
  if (naAndBack.length) return `${naAndBack[0].id} is in both notApplicable and applicable.`;
  const shapes = kitShapes(doc.kit);
  const badShape = add.find((a) => !shapes.includes(a.shape as ProductShape));
  if (badShape)
    return `${badShape.shape} is not one of this project's product shapes (${shapes.join(", ")}). A step is added under a shape the project builds.`;
  const room = KIT_LIMITS.customSteps.max - (doc.kit.customSteps?.length ?? 0);
  if (add.length > room) return `This project can add ${Math.max(room, 0)} more build steps.`;
  const hidden = new Set(doc.kit.hiddenSteps ?? []);
  const notRemoved = restore.filter((id) => !hidden.has(id));
  if (notRemoved.length) return `${notRemoved[0]} is not removed, so there is nothing to restore.`;
  return null;
}

export function applyBuildSteps(doc: ProjectDoc, patch: BuildStepsPatch): ProjectDoc {
  if (!doc.kit) return doc;
  let kit = doc.kit;
  for (const a of patch.add ?? [])
    kit = { ...kit, ...addCustomStep(kit, a.shape as ProductShape, a.title, a.detail ?? "") };
  if (patch.remove?.length) {
    // A catalog id takes its whole shared group with it, the same as the studio's remove.
    const groups = groupsFor(kitShapes(kit), kit);
    for (const id of patch.remove) {
      const custom = (kit.customSteps ?? []).find((c) => c.id === id);
      const group: StepGroup | undefined = custom
        ? { key: id, slug: "custom", title: custom.title, detail: custom.detail, step: "review", resources: [], templates: [], ids: [id], shapes: [custom.shape], custom: true }
        : groups.find((g) => g.ids.includes(id));
      if (group) kit = { ...kit, ...removeStepGroup(kit, group) };
    }
  }
  if (patch.restore?.length) {
    const groups = groupsFor(kitShapes(kit), kit);
    const ids = patch.restore.flatMap((id) => groups.find((g) => g.ids.includes(id))?.ids ?? [id]);
    kit = { ...kit, ...restoreSteps(kit, ids) };
  }
  for (const id of patch.done) kit = { ...kit, ...toggleChecklistItem(kit, id, true) };
  for (const id of patch.undone) kit = { ...kit, ...toggleChecklistItem(kit, id, false) };
  // Evidence lands on every member id of a shared step, so any id of the group reads it (M83).
  if (patch.evidence?.length) {
    const groups = groupsFor(kitShapes(kit), kit);
    for (const e of patch.evidence) {
      const ids = groups.find((g) => g.ids.includes(e.id))?.ids ?? [e.id];
      for (const id of ids) kit = { ...kit, ...setStepEvidence(kit, id, e.text) };
    }
  }
  // Not applicable, with the reason, on every member id; applicable clears it (M84).
  if (patch.notApplicable?.length || patch.applicable?.length) {
    const groups = groupsFor(kitShapes(kit), kit);
    const groupOf = (id: string) => groups.find((g) => g.ids.includes(id)) ?? { ids: [id] };
    for (const e of patch.notApplicable ?? []) kit = { ...kit, ...setGroupNotApplicable(kit, groupOf(e.id), e.reason) };
    for (const id of patch.applicable ?? []) kit = { ...kit, ...setGroupNotApplicable(kit, groupOf(id), null) };
  }
  // Keys set to undefined by the helpers must not be stored.
  const clean = Object.fromEntries(Object.entries(kit).filter(([, v]) => v !== undefined)) as ProjectDoc["kit"];
  return { ...doc, kit: clean };
}

// ---------------------------------------------------------------------------
// Token build steps (M46). Same patch shape, target token_design.

/** Null when every id is a manual token step, else the problem. */
export function tokenBuildStepsProblem(patch: BuildStepsPatch): string | null {
  if ((patch.add?.length ?? 0) + (patch.remove?.length ?? 0) + (patch.restore?.length ?? 0) + (patch.notApplicable?.length ?? 0) + (patch.applicable?.length ?? 0) > 0)
    return "Token build steps can be ticked, not added, removed or marked not applicable. Send done, undone and evidence only.";
  if (patch.done.length + patch.undone.length + (patch.evidence?.length ?? 0) === 0) return "Name at least one build step.";
  const known = tokenStepIds(TOKEN_STEPS);
  const manual = manualTokenStepIds(TOKEN_STEPS);
  const all = [...patch.done, ...patch.undone, ...(patch.evidence ?? []).map((e) => e.id)];
  const unknown = all.filter((id) => !known.has(id));
  if (unknown.length)
    return `Unknown build step ${unknown.slice(0, 3).join(", ")}. Read get_token_build_steps for the ids.`;
  const computed = all.filter((id) => !manual.has(id));
  if (computed.length) return `${computed[0]} is read from the platform and cannot be ticked.`;
  const both = patch.done.filter((id) => patch.undone.includes(id));
  if (both.length) return `${both[0]} is in both done and undone.`;
  return null;
}

export function applyTokenBuildSteps(doc: TokenDesignDoc, patch: BuildStepsPatch): TokenDesignDoc {
  let next = doc;
  for (const id of patch.done) next = { ...next, ...toggleTokenStep(next, id, true) };
  for (const id of patch.undone) next = { ...next, ...toggleTokenStep(next, id, false) };
  for (const e of patch.evidence ?? []) next = { ...next, ...setTokenStepEvidence(next, e.id, e.text) };
  // Keys set to undefined by the helpers must not be stored.
  return Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as unknown as TokenDesignDoc;
}

/** Step id to title, for the studio's change lines. */
export function tokenStepTitles(): Map<string, string> {
  return new Map(TOKEN_STEPS.map((s) => [s.id, s.title] as const));
}

// ---------------------------------------------------------------------------
// Showing a change

export interface ChangeLine {
  /** Dotted path, e.g. architecture.contracts. */
  path: string;
  before: string;
  after: string;
  /** On a decided change, false when the owner dropped this line (M44). */
  applied?: boolean;
  /** On a decided change, true when the owner changed the value before accepting. */
  edited?: boolean;
}

/** One profile as lines: the name, the summary, then the labelled lists and the two short answers (M141). */
function showIcp(v: unknown): string {
  if (!Array.isArray(v)) return show(v);
  const F = STUDIO_PLUS_COPY.icp.fields;
  return v
    .map((p) => {
      if (!isPlain(p)) return show(p);
      const list = (x: unknown) => (Array.isArray(x) ? x.map(show).filter(Boolean).join(", ") : show(x));
      const lines = [show(p.name), show(p.summary)];
      for (const k of ["walletsTheyUse", "channels", "protocolsTheyUse", "buyingTrigger", "objection"] as const) {
        const text = k === "buyingTrigger" || k === "objection" ? show(p[k]) : list(p[k]);
        if (text) lines.push(`${F[k].label}, ${text}`);
      }
      return lines.filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

/** A palette or font set as "Label, value" lines. */
function showLabelled(labels: Record<string, string>): (v: unknown) => string {
  return (v) => (isPlain(v) ? Object.entries(v).map(([k, x]) => (show(x) ? `${labels[k] ?? k}, ${show(x)}` : "")).filter(Boolean).join("\n") : show(v));
}

/** A deck as numbered slides, each with its bullets under it. */
function showDeck(v: unknown): string {
  if (!Array.isArray(v)) return show(v);
  return v
    .map((s, i) => (isPlain(s) ? [`${i + 1}. ${show(s.title)}`, ...(Array.isArray(s.bullets) ? s.bullets.map((b) => `   ${show(b)}`) : [])].join("\n") : show(s)))
    .join("\n");
}

/** Grant answers for one programme as "Question, answer" paragraphs. */
function showGrant(programId: string): (v: unknown) => string {
  return (v) => {
    if (!isPlain(v)) return show(v);
    const program = grantProgram(programId);
    return Object.entries(v)
      .map(([qid, a]) => (show(a) ? `${program?.questions.find((q) => q.id === qid)?.label ?? qid}\n${show(a)}` : ""))
      .filter(Boolean)
      .join("\n\n");
  };
}

/**
 * Paths the feed renders by shape rather than by joining values (M141):
 * the profiles, the palette and fonts, the deck and the grant answers.
 * Each is a leaf in changeLines.
 */
function fieldRenderer(path: string): ((v: unknown) => string) | null {
  if (path === "icp") return showIcp;
  if (path === "brand.palette") return showLabelled(STUDIO_PLUS_COPY.brand.swatches);
  if (path === "brand.fonts") return showLabelled({ display: STUDIO_PLUS_COPY.brand.display, body: STUDIO_PLUS_COPY.brand.body });
  if (path === "investorPack.deck") return showDeck;
  if (path.startsWith("investorPack.grants.") && path.split(".").length === 3) return showGrant(path.slice("investorPack.grants.".length));
  return null;
}

function show(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(show).filter(Boolean).join(" · ");
  if (isPlain(v))
    return Object.values(v)
      .map(show)
      .filter(Boolean)
      .join(", ");
  return "";
}

/**
 * One line per changed leaf, with the draft's current value beside the
 * agent's. Arrays and status declarations count as one leaf.
 */
export function changeLines(doc: unknown, patch: unknown, prefix = ""): ChangeLine[] {
  if (!isPlain(patch)) return [];
  const base = isPlain(doc) ? doc : {};
  const out: ChangeLine[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    const render = fieldRenderer(path);
    if (render) {
      out.push({ path, before: render(base[k]), after: render(v) });
      continue;
    }
    const leaf = !isPlain(v) || "status" in v;
    if (leaf) out.push({ path, before: show(base[k]), after: show(v) });
    else out.push(...changeLines(base[k], v, path));
  }
  return out;
}

/** Paths whose field name would read oddly (M51). */
const PATH_LABELS: Record<string, string> = {
  references: "Project files",
  waived: "Not applicable",
  "kit.shapes": "Product shapes",
  "kit.startingPoint": "Starting point",
  "kit.existingProduct": "Existing product",
  "kit.resources.tick": "Resources to tick",
  "kit.resources.untick": "Resources to untick",
  "kit.review": "Review verdicts",
  "kit.ideas": "What you could build",
  "kit.addIdeas": "What you could build, lines to add",
  "kit.removeIdeas": "What you could build, lines to remove",
  "market.launchTarget": "Market, launch venue",
  mainnet: "Mainnet record",
  testnetContracts: "Testnet contracts",
  addressBook: "Address book",
  deployer: "Deployer address",
  deployerEnvFile: "Deployer env file",
  icp: "Ideal customers",
  brand: "Brand",
  "brand.palette": "Brand palette",
  "brand.fonts": "Brand fonts",
  "brand.tone": "Brand tone",
  "brand.tagline": "Tagline",
  competitors: "Competitors",
  "competitors.differentiator": "How you differ",
  canvas: "Business model",
  investorPack: "Investor and grant pack",
  "investorPack.onepager": "One pager",
  "investorPack.deck": "Deck",
  "investorPack.grants": "Grant answers",
  updateCadence: "Team update cadence",
  "canvas.customerSegments": "Canvas, customer segments",
  "canvas.valueProposition": "Canvas, value proposition",
  "canvas.channels": "Canvas, channels",
  "canvas.customerRelationships": "Canvas, customer relationships",
  "canvas.revenueStreams": "Canvas, revenue streams",
  "canvas.keyResources": "Canvas, key resources",
  "canvas.keyActivities": "Canvas, key activities",
  "canvas.keyPartners": "Canvas, key partners",
  "canvas.costStructure": "Canvas, cost structure",
  summary: "Summary",
  "summary.built": "Summary, built",
  "summary.building": "Summary, being built",
  "mainnet.contracts": "Mainnet contracts",
  "mainnet.companionTemplate": "Companion contract",
  "mainnet.pons": "Pons pairing",
  "mainnet.pons.tokenAddress": "Pons token address",
  "mainnet.pons.feeRecipient": "Pons creator fee recipient",
  "mainnet.pair": "Trading pair",
  "mainnet.pair.venue": "Trading pair venue",
  "mainnet.pair.quoteAsset": "Trading pair quote asset",
  "mainnet.pair.pairAddress": "Trading pair address",
  "mainnet.pair.url": "Trading pair link",
  website: "Website",
  logo: "Logo",
  tokenAddress: "Token",
  linked: "Linked",
};

/**
 * What a poll of the agent changes list brought that was not there before
 * (M79), for the editor's notice. `prev` null is the first load, which
 * reports what is already waiting instead of pretending it is new.
 */
export interface AgentActivity {
  proposed: number;
  written: number;
  waiting: number;
  /** The agent session moved to waiting, done or error (M86). */
  session?: SessionEvent;
}

export function newChangeCounts(
  prev: ReadonlySet<string> | null,
  rows: ReadonlyArray<{ id: string; status: AgentChangeStatus }>,
): AgentActivity | null {
  if (prev === null) {
    const waiting = rows.filter((r) => r.status === "proposed").length;
    return waiting ? { proposed: 0, written: 0, waiting } : null;
  }
  let proposed = 0;
  let written = 0;
  for (const r of rows) {
    if (prev.has(r.id)) continue;
    if (r.status === "proposed") proposed += 1;
    else if (r.status === "applied") written += 1;
  }
  return proposed || written ? { proposed, written, waiting: 0 } : null;
}

/** architecture.externalDeps reads as "Architecture, external deps". */
export function pathLabel(path: string): string {
  if (path in PATH_LABELS) return PATH_LABELS[path];
  // One line per waiver (M130), named after the field.
  if (path.startsWith("waived.")) {
    const key = path.slice("waived.".length) as keyof typeof WAIVABLE_FIELD_LABELS;
    return `Not applicable, ${WAIVABLE_FIELD_LABELS[key] ?? key}`;
  }
  // One line per grant programme (M141), named after the programme.
  if (path.startsWith("investorPack.grants.")) {
    const id = path.slice("investorPack.grants.".length).split(".")[0];
    return `Grant answers, ${grantProgram(id)?.name ?? id}`;
  }
  // One line per template decision (M63), named after the template.
  if (path.startsWith("kit.templates.")) {
    const id = path.slice("kit.templates.".length);
    return `Template ${templateById(id)?.name ?? id}`;
  }
  if (path.startsWith("kit.features.")) {
    const id = path.slice("kit.features.".length);
    const shape = id.slice(0, id.indexOf(".")) as ProductShape;
    return `Feature ${featuresFor([shape]).find((f) => f.id === id)?.title ?? id}`;
  }
  const words = path
    .split(".")
    .map((part) => part.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase())
    .join(", ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Lines for a build step change, with the step titles instead of ids. */
export function buildStepLines(patch: BuildStepsPatch): ChangeLine[] {
  return [
    ...patch.done.map((id) => ({ path: id, before: "Not done", after: "Done" })),
    ...patch.undone.map((id) => ({ path: id, before: "Done", after: "Not done" })),
    ...(patch.add ?? []).map((a, i) => ({
      path: `add:${i}`,
      before: "",
      after: a.detail ? `${a.title}. ${a.detail}` : a.title,
    })),
    ...(patch.remove ?? []).map((id) => ({ path: `remove:${id}`, before: "Listed", after: "Removed" })),
    ...(patch.restore ?? []).map((id) => ({ path: `restore:${id}`, before: "Removed", after: "Listed" })),
    ...(patch.evidence ?? []).map((e) => ({ path: `evidence:${e.id}`, before: "", after: e.text.trim() || "Cleared" })),
    ...(patch.notApplicable ?? []).map((e) => ({ path: `na:${e.id}`, before: "Listed", after: `Not applicable, because ${e.reason.trim()}` })),
    ...(patch.applicable ?? []).map((id) => ({ path: `applicable:${id}`, before: "Not applicable", after: "Listed" })),
  ];
}

// ---------------------------------------------------------------------------
// Deciding a proposal line by line (M44)

/** True for the values changeLines shows as one line. Arrays and status declarations count as one leaf. */
function isLeaf(v: unknown): boolean {
  return !isPlain(v) || "status" in v;
}

/** Every leaf path of a patch, the same walk changeLines takes. */
export function leafPaths(patch: unknown, prefix = ""): string[] {
  if (!isPlain(patch)) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (isLeaf(v)) out.push(path);
    else out.push(...leafPaths(v, path));
  }
  return out;
}

/** The raw value at a dotted path, undefined when the path is not there. */
export function valueAt(patch: unknown, path: string): unknown {
  let cur: unknown = patch;
  for (const part of path.split(".")) {
    if (!isPlain(cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** The patch with only the leaves in `keep`, parents that empty out dropped with them. */
export function subsetPatch(patch: unknown, keep: ReadonlySet<string>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!isPlain(patch)) return out;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (isLeaf(v)) {
      if (keep.has(path)) out[k] = v;
    } else {
      const inner = subsetPatch(v, keep, path);
      if (Object.keys(inner).length) out[k] = inner;
    }
  }
  return out;
}

/** The patch with leaf values replaced at paths that exist. Unknown paths are ignored, never added. */
export function withEdits(
  patch: unknown,
  edits: Readonly<Record<string, unknown>>,
  prefix = "",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!isPlain(patch)) return out;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (isLeaf(v)) out[k] = path in edits ? edits[path] : v;
    else out[k] = withEdits(v, edits, path);
  }
  return out;
}

/** True when `decided` is non-empty and every leaf of it is a leaf of `stored`. An owner may drop or edit, never add. */
export function patchNarrows(stored: unknown, decided: unknown): boolean {
  const allowed = new Set(leafPaths(stored));
  const paths = leafPaths(decided);
  return paths.length > 0 && paths.every((p) => allowed.has(p));
}

/** The entries of a build step change whose key (see buildStepKeys) is kept. */
export function subsetBuildSteps(patch: BuildStepsPatch, keep: ReadonlySet<string>): BuildStepsPatch {
  return {
    done: patch.done.filter((id) => keep.has(id)),
    undone: patch.undone.filter((id) => keep.has(id)),
    add: (patch.add ?? []).filter((_, i) => keep.has(`add:${i}`)),
    remove: (patch.remove ?? []).filter((id) => keep.has(`remove:${id}`)),
    restore: (patch.restore ?? []).filter((id) => keep.has(`restore:${id}`)),
    evidence: (patch.evidence ?? []).filter((e) => keep.has(`evidence:${e.id}`)),
    notApplicable: (patch.notApplicable ?? []).filter((e) => keep.has(`na:${e.id}`)),
    applicable: (patch.applicable ?? []).filter((id) => keep.has(`applicable:${id}`)),
  };
}

const sameAdd = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function buildStepsNarrow(stored: BuildStepsPatch, decided: BuildStepsPatch): boolean {
  return (
    buildStepKeys(decided).length > 0 &&
    decided.done.every((id) => stored.done.includes(id)) &&
    decided.undone.every((id) => stored.undone.includes(id)) &&
    (decided.add ?? []).every((a) => (stored.add ?? []).some((b) => sameAdd(a, b))) &&
    (decided.remove ?? []).every((id) => (stored.remove ?? []).includes(id)) &&
    (decided.restore ?? []).every((id) => (stored.restore ?? []).includes(id)) &&
    (decided.evidence ?? []).every((e) => (stored.evidence ?? []).some((b) => sameAdd(e, b))) &&
    (decided.notApplicable ?? []).every((e) => (stored.notApplicable ?? []).some((b) => sameAdd(e, b))) &&
    (decided.applicable ?? []).every((id) => (stored.applicable ?? []).includes(id))
  );
}

export interface Decision {
  /** Leaf paths (or build step ids) the owner unticked. */
  dropped: ReadonlySet<string>;
  /** Leaf path to the owner's replacement value. Ignored for build steps. */
  edits: Readonly<Record<string, unknown>>;
}

/** The patch the owner decided on. Build steps are per step, fields are per leaf with edits applied. */
export function decidePatch(kind: AgentChangeKind, patch: unknown, decision: Decision): unknown {
  if (kind === "build_steps") {
    const parsed = buildStepsPatchSchema.safeParse(patch);
    if (!parsed.success) return patch;
    const keep = new Set(buildStepKeys(parsed.data as BuildStepsPatch).filter((key) => !decision.dropped.has(key)));
    return subsetBuildSteps(parsed.data as BuildStepsPatch, keep);
  }
  const keep = new Set(leafPaths(patch).filter((p) => !decision.dropped.has(p)));
  return withEdits(subsetPatch(patch, keep), decision.edits);
}

/** How the panel edits one leaf, read off the zod schema so the two never drift. */
export type LeafSpec =
  | { kind: "string"; max?: number }
  | { kind: "number"; min?: number; max?: number; int?: boolean }
  | { kind: "enum"; options: readonly string[] }
  | { kind: "boolean" }
  | { kind: "structured" };

type ZodLike = { _zod?: { def?: Record<string, unknown> } };

function unwrapZod(schema: unknown): unknown {
  let cur = schema;
  for (let i = 0; i < 8; i++) {
    const def = (cur as ZodLike)?._zod?.def;
    if (!def) return cur;
    const t = def.type as string | undefined;
    if (t === "optional" || t === "default" || t === "nullable" || t === "readonly" || t === "nonoptional")
      cur = def.innerType;
    else if (t === "pipe") cur = def.in;
    else return cur;
  }
  return cur;
}

/**
 * The leaf kind at a dotted path of a patch schema. Falls back to a plain
 * string editor when the schema cannot be read, so an unknown zod shape
 * never hides a line.
 */
export function leafSpec(schema: unknown, path: string): LeafSpec {
  try {
    let cur = unwrapZod(schema);
    for (const part of path.split(".")) {
      const def = (cur as ZodLike)?._zod?.def;
      if (!def || def.type !== "object") return { kind: "structured" };
      const shape = def.shape as Record<string, unknown> | undefined;
      if (!shape || !(part in shape)) return { kind: "string" };
      cur = unwrapZod(shape[part]);
    }
    const def = (cur as ZodLike)?._zod?.def;
    if (!def) return { kind: "string" };
    const t = def.type as string;
    if (t === "string") {
      const max = (cur as { maxLength?: number | null }).maxLength;
      return { kind: "string", ...(typeof max === "number" ? { max } : {}) };
    }
    if (t === "number") {
      const n = cur as { minValue?: number | null; maxValue?: number | null; isInt?: boolean };
      return {
        kind: "number",
        ...(typeof n.minValue === "number" && Number.isFinite(n.minValue) ? { min: n.minValue } : {}),
        ...(typeof n.maxValue === "number" && Number.isFinite(n.maxValue) ? { max: n.maxValue } : {}),
        ...(n.isInt ? { int: true } : {}),
      };
    }
    if (t === "enum") {
      const entries = def.entries as Record<string, string> | undefined;
      const options = (cur as { options?: readonly string[] }).options ?? (entries ? Object.values(entries) : []);
      return { kind: "enum", options };
    }
    if (t === "boolean") return { kind: "boolean" };
    return { kind: "structured" };
  } catch {
    return { kind: "string" };
  }
}

/**
 * History lines for a decided change. One per leaf of the proposal; a leaf
 * missing from the applied patch is marked not applied, a leaf whose value
 * differs shows the agent's value as before and the applied one as after.
 */
export function decisionLines(patch: unknown, appliedPatch: unknown): ChangeLine[] {
  return leafPaths(patch).map((path) => {
    const proposed = valueAt(patch, path);
    const applied = valueAt(appliedPatch, path);
    const kept = applied !== undefined;
    const edited = kept && JSON.stringify(applied) !== JSON.stringify(proposed);
    return {
      path,
      before: edited ? show(proposed) : "",
      after: show(kept ? applied : proposed),
      applied: kept,
      edited,
    };
  });
}

export function buildStepDecisionLines(patch: BuildStepsPatch, applied: BuildStepsPatch | null): ChangeLine[] {
  if (!applied) return buildStepLines(patch).map((l) => ({ ...l, applied: true }));
  // Added steps are matched by content, since dropping one shifts the positions after it.
  const kept = new Set([
    ...applied.done,
    ...applied.undone,
    ...(patch.add ?? []).flatMap((a, i) => ((applied.add ?? []).some((b) => sameAdd(a, b)) ? [`add:${i}`] : [])),
    ...(applied.remove ?? []).map((id) => `remove:${id}`),
    ...(applied.restore ?? []).map((id) => `restore:${id}`),
    ...(applied.evidence ?? []).map((e) => `evidence:${e.id}`),
    ...(applied.notApplicable ?? []).map((e) => `na:${e.id}`),
    ...(applied.applicable ?? []).map((id) => `applicable:${id}`),
  ]);
  return buildStepLines(patch).map((l) => ({ ...l, applied: kept.has(l.path) }));
}
