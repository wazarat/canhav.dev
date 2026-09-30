import { z } from "zod";

import { checklistFor } from "@/content/kits/checklists";
import {
  AUDIENCE_VALUES,
  CRYPTO_EXPERIENCE_VALUES,
  PROJECT_LIMITS,
  REVENUE_RANGE_VALUES,
  TEAM_SIZE_PATTERN,
  TOKEN_DESIGN_LIMITS,
  type ProjectDoc,
  type TokenDesignDoc,
} from "@/lib/ideation";
import { kitShapes, toggleChecklistItem } from "@/lib/kits";

/**
 * Agent writes (M39). An agent connected to a project's MCP server may change
 * the project draft, tick build steps, and change the linked token design
 * draft. The owner decides how, per project:
 *
 *   off      the agent reads only
 *   propose  every change waits in the studio until the owner accepts it
 *   direct   changes land in the draft at once and are listed in the studio
 *
 * Agents never publish, never pick sectors, subsectors or product shapes, and
 * never tick the distribution acknowledgement. Those stay with a person.
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
export type AgentChangeKind = "fields" | "build_steps";
export type AgentChangeStatus = "proposed" | "applied" | "accepted" | "rejected";

export interface BuildStepsPatch {
  done: string[];
  undone: string[];
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

const statusDecl = z.strictObject({
  status: z.enum(["in_place", "legal_ops", "planned_before_mainnet", "not_yet"]),
  note: z.string().max(200).optional(),
});

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
    testnetContracts: z.array(z.string().regex(/^0x[0-9a-f]{40}$/)).max(L.testnetContracts.max),
    verifyWallet: z.string().regex(/^0x[0-9a-f]{40}$/),
  })
  .partial();

export type ProjectPatch = z.infer<typeof projectPatchSchema>;

const pct = z.number().int().min(0).max(100);
const months = z.number().int().min(T.vestingMonths.min).max(T.vestingMonths.max);

export const tokenDesignPatchSchema = z
  .strictObject({
    name: z.string().max(T.name.max),
    ticker: z.string().max(T.ticker.max).regex(T.ticker.pattern),
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
      })
      .partial(),
  })
  .partial();

export type TokenDesignPatch = z.infer<typeof tokenDesignPatchSchema>;

export const buildStepsPatchSchema = z.strictObject({
  done: z.array(z.string().max(120)).max(AGENT_CHANGE_LIMITS.buildSteps.max).default([]),
  undone: z.array(z.string().max(120)).max(AGENT_CHANGE_LIMITS.buildSteps.max).default([]),
});

/** First readable problem in a zod failure, with the field path in front. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "The change is not valid.";
  const path = issue.path.join(".");
  return path ? `${path} is not valid. ${issue.message}` : issue.message;
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
  const next = deepMerge(doc, patch);
  const a = { ...next.architecture };
  // The two dependency answers exclude each other. The one the agent sent wins.
  if (patch.architecture?.externalDepsNone === true) a.externalDeps = [];
  else if (patch.architecture?.externalDeps?.length) a.externalDepsNone = false;
  return { ...next, architecture: a };
}

export function applyTokenDesignPatch(doc: TokenDesignDoc, patch: TokenDesignPatch): TokenDesignDoc {
  return deepMerge(doc, patch);
}

/** The build step ids this project's chosen shapes offer. */
export function buildStepIds(doc: ProjectDoc): Set<string> {
  return new Set(checklistFor(kitShapes(doc.kit)).map((i) => i.id));
}

/** Null when every id belongs to this project's build steps, else the problem. */
export function buildStepsProblem(doc: ProjectDoc, patch: BuildStepsPatch): string | null {
  if (!doc.kit || kitShapes(doc.kit).length === 0)
    return "This project has no product shape yet, so it has no build steps. The owner picks a shape in the studio under What are you building.";
  if (patch.done.length + patch.undone.length === 0) return "Name at least one build step.";
  const known = buildStepIds(doc);
  const unknown = [...patch.done, ...patch.undone].filter((id) => !known.has(id));
  if (unknown.length)
    return `Unknown build step ${unknown.slice(0, 3).join(", ")}. Read get_build_steps for the ids.`;
  const both = patch.done.filter((id) => patch.undone.includes(id));
  if (both.length) return `${both[0]} is in both done and undone.`;
  return null;
}

export function applyBuildSteps(doc: ProjectDoc, patch: BuildStepsPatch): ProjectDoc {
  if (!doc.kit) return doc;
  let kit = doc.kit;
  for (const id of patch.done) kit = { ...kit, ...toggleChecklistItem(kit, id, true) };
  for (const id of patch.undone) kit = { ...kit, ...toggleChecklistItem(kit, id, false) };
  return { ...doc, kit };
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
    const leaf = !isPlain(v) || "status" in v;
    if (leaf) out.push({ path, before: show(base[k]), after: show(v) });
    else out.push(...changeLines(base[k], v, path));
  }
  return out;
}

/** architecture.externalDeps reads as "Architecture, external deps". */
export function pathLabel(path: string): string {
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

export function subsetBuildSteps(patch: BuildStepsPatch, keep: ReadonlySet<string>): BuildStepsPatch {
  return { done: patch.done.filter((id) => keep.has(id)), undone: patch.undone.filter((id) => keep.has(id)) };
}

export function buildStepsNarrow(stored: BuildStepsPatch, decided: BuildStepsPatch): boolean {
  const n = decided.done.length + decided.undone.length;
  return (
    n > 0 &&
    decided.done.every((id) => stored.done.includes(id)) &&
    decided.undone.every((id) => stored.undone.includes(id))
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
    const keep = new Set([...parsed.data.done, ...parsed.data.undone].filter((id) => !decision.dropped.has(id)));
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
  const kept = applied ? new Set([...applied.done, ...applied.undone]) : null;
  return buildStepLines(patch).map((l) => ({ ...l, applied: kept ? kept.has(l.path) : true }));
}
