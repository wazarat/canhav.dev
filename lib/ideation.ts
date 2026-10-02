import { keccak256, stringToBytes } from "viem";

import { type ProjectChain, isProjectChain, projectChainOf } from "@/lib/chains";
import {
  kitsForSectors,
  normalizeProjectKit,
  type ProductShape,
  type ProjectKit,
  validateProjectKit,
} from "@/lib/kits";
import { type JourneyMilestone, sortValue, validateMilestones } from "@/lib/journey";
import {
  LEGACY_SECTOR_MAP,
  SECTOR_SUBSECTORS,
  SECTOR_VALUES,
  SUBSECTOR_VALUES,
  type Sector,
  type Subsector,
  docSectors,
  sectorOfSubsector,
  withSectors,
} from "@/lib/sectors";
import { LAUNCH_FORM } from "@/content/launch";

export {
  LEGACY_SECTOR_MAP,
  SECTOR_SUBSECTORS,
  SECTOR_VALUES,
  SUBSECTOR_VALUES,
  type Sector,
  type Subsector,
  docSectors,
  sectorOfSubsector,
  withSectors,
} from "@/lib/sectors";

/**
 * Ideation documents: the two-track thinking layer (Project + Token Design).
 * A published doc is snapshotted content-addressed —
 * `snapshotHash = keccak256(canonicalizeIdeationDoc(doc))` — into
 * `launchpad.ideation_snapshots`. When a token is deployed from a design, the
 * factory's `journeyHash` carries that snapshot hash, committing the design
 * on-chain forever (quick deploys keep committing the v1 JourneyDoc hash from
 * lib/journey.ts; the table a hash resolves in is the path discriminator).
 *
 * Docs embed `kind`, `slug`, and `publishVersion`, so hashes can never
 * collide across entity types, entities, or versions.
 *
 * IMPORTANT: the canonicalization (shared `sortValue` from lib/journey.ts) is
 * a consensus rule for this app. Changing it invalidates verification for
 * every previously published snapshot — bump `version` and keep the old path
 * if the format ever has to evolve.
 */

/**
 * A status declaration: things a team may have handled elsewhere, or
 * legitimately not have addressed pre-PMF. Cheap to answer, honest,
 * publishable. `note` is a one-line description, accepted only for
 * "in_place".
 */
export interface StatusDecl {
  status: "in_place" | "legal_ops" | "planned_before_mainnet" | "not_yet";
  note?: string;
}

// ---------------------------------------------------------------------------
// Project track

/**
 * Sector and subsector types live in lib/sectors.ts since M32 (2026-09-28) and
 * are re-exported above. A project declares one or more sectors; Credit and
 * Liquidity are open today and the other four render as "Coming soon".
 */

export type ProjectStage =
  | "idea"
  | "design_doc"
  | "prototype"
  | "testnet_deployed"
  | "live_elsewhere";

export type Upgradeability = "immutable" | "upgradeable_proxy" | "partially" | "undecided";

export type WorstCase = "lose_funds" | "lock_funds" | "misprice" | "nothing_serious";

export type Payer = "user" | "third_party";

export type OracleUse = "none" | "uses";

export const REVENUE_RANGE_VALUES = [
  "pre_revenue",
  "under_1m",
  "1m_10m",
  "10m_50m",
  "50m_250m",
  "over_250m",
] as const;

export type RevenueRange = (typeof REVENUE_RANGE_VALUES)[number];

/** Who the project sells to (M42). Businesses get the B2B persona table, individuals the B2C one. */
export const AUDIENCE_VALUES = ["b2b", "b2c"] as const;

export type Audience = (typeof AUDIENCE_VALUES)[number];

export const CRYPTO_EXPERIENCE_VALUES = ["new", "some", "active", "professional"] as const;

export type CryptoExperience = (typeof CRYPTO_EXPERIENCE_VALUES)[number];

/** One ideal customer persona. Every cell is optional. */
export interface Persona {
  /** Digits, or a digit range like 10-50. */
  teamSize: string;
  /** City, country, or continent. */
  geography: string;
  industry: string;
  /** Role or title of the primary contact, not a named person. */
  primaryContact: string;
  revenueRange: RevenueRange | "";
}

/** Digits or a digit range, shared by team size (B2B) and age range (B2C). */
export const TEAM_SIZE_PATTERN = /^\d+(\s*-\s*\d+)?$/;

/** One ideal consumer persona (B2C, M42). Every cell is optional. */
export interface ConsumerPersona {
  /** Digits, or a digit range like 25-40. */
  ageRange: string;
  geography: string;
  cryptoExperience: CryptoExperience | "";
  /** The channel. Twitter, Discord, referrals, an app store. */
  howTheyFindYou: string;
  /** What they hold today. ETH, stablecoins, stocks. */
  holdings: string;
}

export function emptyConsumerPersona(): ConsumerPersona {
  return { ageRange: "", geography: "", cryptoExperience: "", howTheyFindYou: "", holdings: "" };
}

export function isEmptyConsumerPersona(p: ConsumerPersona): boolean {
  return !(
    p.ageRange.trim() ||
    p.geography.trim() ||
    p.cryptoExperience ||
    p.howTheyFindYou.trim() ||
    p.holdings.trim()
  );
}

export function filledConsumerPersonas(doc: { consumerPersonas?: ConsumerPersona[] }): ConsumerPersona[] {
  return (doc.consumerPersonas ?? []).filter((p) => !isEmptyConsumerPersona(p));
}

/**
 * The audience in force. The stored answer when there is one, else whichever
 * table has a filled persona (an M38 document is B2B), else nothing chosen.
 */
export function docAudience(
  doc: { audience?: Audience; personas?: Persona[]; consumerPersonas?: ConsumerPersona[] },
): Audience | "" {
  if (doc.audience) return doc.audience;
  if (filledPersonas(doc).length) return "b2b";
  if (filledConsumerPersonas(doc).length) return "b2c";
  return "";
}

export function emptyPersona(): Persona {
  return { teamSize: "", geography: "", industry: "", primaryContact: "", revenueRange: "" };
}

/** True when no cell of the persona is filled. */
export function isEmptyPersona(p: Persona): boolean {
  return !(
    p.teamSize.trim() ||
    p.geography.trim() ||
    p.industry.trim() ||
    p.primaryContact.trim() ||
    p.revenueRange
  );
}

/** Personas with at least one filled cell, for the public page, review and export. */
export function filledPersonas(doc: { personas?: Persona[] }): Persona[] {
  return (doc.personas ?? []).filter((p) => !isEmptyPersona(p));
}

/** One external dependency, optionally linked per contract/protocol. */
export interface ExternalDep {
  name: string;
  url?: string;
}

/**
 * A file the team keeps for this project, by reference (M53). Nothing is
 * uploaded. `location` is a link or a path on the team's own machine, so a
 * local agent can open it. Stays on the draft and out of the published
 * snapshot, the same as token build step ticks.
 */
export interface ProjectReference {
  title: string;
  location: string;
  /** What it is for. May be empty. */
  note: string;
}

/** True when a reference points at the web rather than a local path. */
export function referenceIsLink(r: Pick<ProjectReference, "location">): boolean {
  return /^https?:\/\/\S+$/.test(r.location.trim());
}

export interface ProjectDoc {
  kind: "project";
  version: 1;
  /** Assigned at first publish, "" in drafts. Immutable once set. */
  slug: string;
  /** Snapshot counter, stamped at publish. 0 in drafts. */
  publishVersion: number;
  name: string;
  /** The first of `sectors`, kept so older readers, snapshots and MCP consumers keep working. */
  sector: Sector | "";
  /**
   * Every sector the project is in, in table order (M32). Optional so
   * normalizeProjectDoc never injects the key; read with docSectors().
   */
  sectors?: Sector[];
  sectorOther?: string;
  /**
   * One to three subsectors for each chosen sector that has them, all in one
   * list. Optional so normalizeProjectDoc never injects the key into older
   * documents.
   */
  subsectors?: Subsector[];
  /**
   * Research kit (M21+). Created when a builder picks a lending product
   * shape; absent otherwise. Optional so normalizeProjectDoc never injects it.
   */
  kit?: ProjectKit;
  /**
   * The chain the project builds on and its token launches on (M52).
   * Optional and never injected; absent reads as Robinhood testnet through
   * projectChainOf(), so older documents keep their hash.
   */
  chain?: ProjectChain;
  /**
   * The team's own files, by reference (M53). Optional, never injected and
   * never published; publishEntity strips it from the snapshot.
   */
  references?: ProjectReference[];
  /** What it does, one paragraph. */
  whatItDoes: string;
  /**
   * Who the user is, as free text. Superseded by `personas`; kept for
   * documents written before the persona table. Optional answer.
   */
  userIs: string;
  /**
   * Ideal customer personas, one to three. Optional so normalizeProjectDoc
   * never injects the key into older documents.
   */
  personas?: Persona[];
  /**
   * Who the project sells to (M42). Optional and never injected. b2b shows
   * `personas`, b2c shows `consumerPersonas`; the other list stays stored
   * and hidden so a builder who switches back finds their typing.
   */
  audience?: Audience;
  /** Ideal consumer personas, one to three, for a b2c audience. Optional, never injected. */
  consumerPersonas?: ConsumerPersona[];
  /** Optional answer. whoPays text is asked only when someone other than the user pays. */
  payer: Payer | "";
  whoPays: string;
  whyThisChain: string;
  stage: ProjectStage | "";
  architecture: {
    /** What contracts exist (or "None yet"). */
    contracts: string;
    /** External dependencies, one entry per contract/protocol, each linkable. */
    externalDeps: ExternalDep[];
    /** Explicit "no external dependencies" is a first-class answer. */
    externalDepsNone: boolean;
    /** Gate: oracles text is required only when "uses". Optional field. */
    oracleUse: OracleUse | "";
    oracles: string;
    /** Admin functions and why they exist. "None" is a valid answer. */
    adminFunctions: string;
    upgradeability: Upgradeability | "";
  };
  /** What's the worst thing a bug could do? Scales the security section. */
  worstCase: WorstCase | "";
  security: {
    audit: StatusDecl;
    bugBounty: StatusDecl;
    monitoring: StatusDecl;
    incidentResponse: StatusDecl;
    keyCustody: StatusDecl;
  };
  /**
   * Must be literally `true` to publish: acknowledges that Robinhood Chain
   * does not provide distribution to Robinhood brokerage customers and
   * CanHav has no affiliation with Robinhood.
   */
  mythAck: boolean;
  /** So where will the first hundred users actually come from? */
  firstHundredUsers: string;
  githubRepo?: string;
  /** Testnet contract addresses, lowercase hex — feed the verify signals. */
  testnetContracts?: string[];
  /** Declared team wallet (unproven — labeled "declared by team" in UI). */
  verifyWallet?: string;
}

export const PROJECT_LIMITS = {
  name: { min: 3, max: 60 },
  sectorOther: { max: 60 },
  sectors: { min: 1, max: SECTOR_VALUES.length },
  /** Per sector that asks for them. */
  subsectors: { min: 1, max: 3 },
  whatItDoes: { min: 80, max: 1200 },
  /** Optional answers, so no minimum. */
  userIs: { max: 400 },
  whoPays: { max: 400 },
  whyThisChain: { max: 800 },
  personas: { min: 1, max: 3 },
  personaText: { max: 80 },
  personaTeamSize: { max: 12 },
  personaAgeRange: { max: 12 },
  architectureField: { min: 4, max: 800 },
  externalDeps: { max: 12 },
  externalDepName: { min: 2, max: 80 },
  externalDepUrl: { max: 200 },
  firstHundredUsers: { min: 40, max: 600 },
  testnetContracts: { max: 10 },
  references: { max: 40 },
  referenceTitle: { min: 2, max: 80 },
  referenceLocation: { min: 1, max: 300 },
  referenceNote: { max: 200 },
} as const;

/**
 * Bring a stored ProjectDoc (possibly written by an older client) up to the
 * current shape. Idempotent; applied at every read choke point in
 * lib/ideation-db.ts and before publish stamping.
 */
export function normalizeProjectDoc(raw: ProjectDoc): ProjectDoc {
  const doc = raw as ProjectDoc & {
    architecture: ProjectDoc["architecture"] & { externalDeps: ExternalDep[] | string };
  };
  const a = doc.architecture ?? ({} as (typeof doc)["architecture"]);

  let externalDeps: ExternalDep[];
  const rawDeps = a.externalDeps;
  if (typeof rawDeps === "string") {
    externalDeps = rawDeps
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, PROJECT_LIMITS.externalDeps.max)
      .map((name) => ({ name: name.slice(0, PROJECT_LIMITS.externalDepName.max) }));
  } else if (Array.isArray(rawDeps)) {
    externalDeps = rawDeps;
  } else {
    externalDeps = [];
  }

  const oracles = typeof a.oracles === "string" ? a.oracles : "";
  const oracleUse: OracleUse | "" =
    a.oracleUse === "none" || a.oracleUse === "uses"
      ? a.oracleUse
      : oracles.trim()
        ? "uses"
        : "";

  const whoPays = typeof doc.whoPays === "string" ? doc.whoPays : "";
  const payer: Payer | "" =
    doc.payer === "user" || doc.payer === "third_party"
      ? doc.payer
      : whoPays.trim()
        ? "third_party"
        : "";

  // Retired sector ids fold into "other", keeping the old label as the
  // free-text sector so nothing renders "Not set". Idempotent: a doc already
  // on "other" is left alone. The `sectors` list (M32) is cleaned the same
  // way but only when the key exists, and `sector` then follows its first
  // entry.
  const foldSector = (raw: unknown): { sector: Sector | ""; legacyLabel?: string } => {
    if (typeof raw !== "string" || !raw) return { sector: "" };
    if (raw in LEGACY_SECTOR_MAP) return { sector: "other", legacyLabel: LEGACY_SECTOR_MAP[raw] };
    return SECTOR_VALUES.includes(raw as Sector) ? { sector: raw as Sector } : { sector: "" };
  };
  let sectorOther = doc.sectorOther;
  const first = foldSector(doc.sector);
  let sector: Sector | "" = first.sector;
  if (first.legacyLabel && !sectorOther?.trim()) sectorOther = first.legacyLabel;
  let sectorsPatch: { sectors?: Sector[] } = {};
  if (Array.isArray(doc.sectors)) {
    const folded: Sector[] = [];
    for (const v of doc.sectors as unknown[]) {
      const f = foldSector(v);
      if (f.sector) folded.push(f.sector);
      if (f.legacyLabel && !sectorOther?.trim()) sectorOther = f.legacyLabel;
    }
    const next = withSectors(folded);
    sectorsPatch = { sectors: next.sectors };
    sector = next.sector;
  }

  // Subsectors: only present when the stored doc has the key. Unknown values
  // drop, duplicates collapse, the stored order is kept so a published
  // snapshot re-reads as it was hashed.
  let subsectorPatch: { subsectors?: Subsector[] } = {};
  if (Array.isArray(doc.subsectors)) {
    const seen = new Set<Subsector>();
    for (const v of doc.subsectors as unknown[]) {
      if (typeof v === "string" && SUBSECTOR_VALUES.includes(v as Subsector))
        seen.add(v as Subsector);
    }
    subsectorPatch = { subsectors: [...seen] };
  }

  // Personas: only present when the stored doc has the key. Cells coerce to
  // strings, an unknown revenue range clears, extra columns drop.
  let personasPatch: { personas?: Persona[] } = {};
  if (Array.isArray(doc.personas)) {
    const text = (v: unknown) => (typeof v === "string" ? v : "");
    personasPatch = {
      personas: (doc.personas as unknown[])
        .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
        .slice(0, PROJECT_LIMITS.personas.max)
        .map((v) => ({
          teamSize: text(v.teamSize),
          geography: text(v.geography),
          industry: text(v.industry),
          primaryContact: text(v.primaryContact),
          revenueRange: REVENUE_RANGE_VALUES.includes(v.revenueRange as RevenueRange)
            ? (v.revenueRange as RevenueRange)
            : "",
        })),
    };
  }

  // Consumer personas (M42): the same rule as personas.
  let consumerPatch: { consumerPersonas?: ConsumerPersona[] } = {};
  if (Array.isArray(doc.consumerPersonas)) {
    const text = (v: unknown) => (typeof v === "string" ? v : "");
    consumerPatch = {
      consumerPersonas: (doc.consumerPersonas as unknown[])
        .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
        .slice(0, PROJECT_LIMITS.personas.max)
        .map((v) => ({
          ageRange: text(v.ageRange),
          geography: text(v.geography),
          cryptoExperience: CRYPTO_EXPERIENCE_VALUES.includes(v.cryptoExperience as CryptoExperience)
            ? (v.cryptoExperience as CryptoExperience)
            : "",
          howTheyFindYou: text(v.howTheyFindYou),
          holdings: text(v.holdings),
        })),
    };
  }
  // Audience (M42): kept when it is one of the two values, dropped when it is garbage.
  const { audience: rawAudience, ...withoutAudience } = doc as ProjectDoc & { audience?: unknown };
  const audiencePatch = AUDIENCE_VALUES.includes(rawAudience as Audience)
    ? { audience: rawAudience as Audience }
    : {};

  // Research kit: coerced when the key exists, dropped when it is garbage,
  // never invented.
  const { kit: rawKit, ...rest } = withoutAudience as ProjectDoc & { kit?: unknown };
  const kits = kitsForSectors(docSectors({ sector, ...sectorsPatch }), subsectorPatch.subsectors ?? []);
  const kit = rawKit === undefined ? null : normalizeProjectKit(rawKit, kits);
  // Project files (M53): cleaned when the key exists, never invented.
  const rawRefs = (rest as { references?: unknown }).references;
  if (rawRefs !== undefined) {
    const L = PROJECT_LIMITS;
    const refs: ProjectReference[] = [];
    for (const v of Array.isArray(rawRefs) ? (rawRefs as unknown[]) : []) {
      if (!v || typeof v !== "object" || refs.length >= L.references.max) continue;
      const r = v as Record<string, unknown>;
      if (typeof r.title !== "string" || typeof r.location !== "string") continue;
      refs.push({
        title: r.title.slice(0, L.referenceTitle.max),
        location: r.location.slice(0, L.referenceLocation.max),
        note: typeof r.note === "string" ? r.note.slice(0, L.referenceNote.max) : "",
      });
    }
    (rest as { references?: ProjectReference[] }).references = refs;
  }
  // Chain (M52): kept when it is a known chain, dropped when it is garbage, never invented.
  if ("chain" in rest && !isProjectChain((rest as { chain?: unknown }).chain))
    delete (rest as { chain?: unknown }).chain;

  return {
    ...(rest as ProjectDoc),
    ...(kit ? { kit } : {}),
    sector,
    ...sectorsPatch,
    ...(sectorOther !== undefined ? { sectorOther } : {}),
    ...subsectorPatch,
    ...personasPatch,
    ...consumerPatch,
    ...audiencePatch,
    payer,
    whoPays,
    architecture: {
      ...a,
      externalDeps,
      externalDepsNone: a.externalDepsNone === true,
      oracleUse,
      oracles,
    },
  };
}

// ---------------------------------------------------------------------------
// Token track (v2 question spec, sections 1–8)

export type RationaleWhy =
  | "token_is_product"
  | "bootstrap_supply"
  | "economic_security"
  | "governance"
  | "fee_capture"
  | "fundraising"
  | "not_sure";

export type IssuancePath = "issue_and_lock" | "points_first" | "straight_to_market";

export type SupplyPolicy = "fixed" | "inflationary";

/** Allocation split in whole percent, must total exactly 100. */
export interface AllocationSplit {
  team: number;
  investors: number;
  treasuryEcosystem: number;
  public: number;
  liquidity: number;
  advisors: number;
  other: number;
  otherLabel?: string;
}

export type VestedCohort = "team" | "investors" | "advisors";

export interface CohortVesting {
  cohort: VestedCohort;
  cliffMonths: number;
  durationMonths: number;
}

export type ReleaseType = "linear" | "milestone_conditional" | "cliff_then_linear";

export type FounderLeavesPolicy =
  | "returns_to_treasury"
  | "returns_to_team"
  | "continues_vesting"
  | "no_policy";

export type DistributionEvent = "none" | "airdrop" | "fixed_price_sale" | "auction" | "lbp";

export type UndersubscriptionPlan = "proceed" | "refund" | "postpone" | "no_plan";

export type MarketTiming = "at_launch" | "later" | "never";

export type LpTreatment = "locked" | "burned" | "unlocked";

export type AntiSniping = "window" | "tax" | "delay" | "none";

export type CounselStatus = "working_with_counsel" | "engaging_before_mainnet" | "not_yet";

export interface TokenDesignDoc {
  kind: "token_design";
  version: 1;
  /** Assigned at first publish, "" in drafts. Immutable once set. */
  slug: string;
  /** Snapshot counter, stamped at publish. 0 in drafts. */
  publishVersion: number;
  name: string;
  ticker: string;
  /** §1 Token rationale. */
  rationale: {
    why: RationaleWhy | "";
    path: IssuancePath | "";
    /** What does the token do that a database row couldn't? */
    beyondDatabaseRow: string;
  };
  /** §2 Supply and allocation. */
  supply: {
    total: number;
    policy: SupplyPolicy | "";
    inflationNote?: string;
    allocations: AllocationSplit;
  };
  /** §3 Vesting and lockups. Cohort rows mandatory where allocation > 0. */
  vesting: {
    cohorts: CohortVesting[];
    release: ReleaseType | "";
    founderLeaves: FounderLeavesPolicy | "";
  };
  /** §4 Distribution — internally gated on `event`. */
  distribution: {
    event: DistributionEvent | "";
    sale?: {
      price: number;
      hardCap: number;
      softCap: number;
      perWalletLimit: number;
      access: "allowlist" | "open" | "";
      undersubscription: UndersubscriptionPlan | "";
    };
  };
  /** §5 Market — internally gated on `when`. */
  market: {
    when: MarketTiming | "";
    atLaunch?: {
      liquidityEth: number;
      ethSource: string;
      lp: LpTreatment | "";
      lpLockMonths?: number;
      antiSniping: AntiSniping | "";
    };
  };
  /** §6 Governance — status declarations only. */
  governance: {
    mechanism: StatusDecl;
    adminKeys: StatusDecl;
    treasuryCustody: StatusDecl;
  };
  /** §7 Legal — status only, nothing else stored. */
  legal: {
    counsel: CounselStatus | "";
  };
  /** §8 Post-launch — all optional. */
  postLaunch: {
    runwayMonths?: number;
    reporting?: "monthly" | "quarterly" | "ad_hoc" | "none_yet";
    priceCollapsePlan?: string;
    failureCriteria?: string;
    /**
     * Two to five dated milestones (M48). A launch that commits this
     * design's snapshot reads them as its commitment, so the creator can
     * run sales, escrow and milestone updates against them. Optional and
     * never injected, so older published hashes hold.
     */
    milestones?: JourneyMilestone[];
  };
  /**
   * Token build steps ticked (M46), a map of true entries keyed by step id.
   * Optional, never injected, and stripped from the published snapshot so a
   * tick after launch never changes the hash the launch committed.
   */
  checklist?: Record<string, true>;
}

export const TOKEN_DESIGN_LIMITS = {
  name: { min: 3, max: 60 },
  // Same ticker rules as the launch form — the design should deploy as-is.
  ticker: { max: LAUNCH_FORM.ticker.max, pattern: LAUNCH_FORM.ticker.pattern },
  beyondDatabaseRow: { min: 20, max: 400 },
  supplyTotal: { min: 1, max: 1e15 },
  inflationNote: { max: 400 },
  vestingMonths: { min: 0, max: 120 },
  ethSource: { min: 4, max: 200 },
  lpLockMonths: { min: 1, max: 120 },
  runwayMonths: { min: 0, max: 120 },
  priceCollapsePlan: { max: 800 },
  failureCriteria: { max: 800 },
  /** Token build step ticks. */
  checklist: { max: 200 },
} as const;

/** Only true entries survive, capped. Undefined when nothing is left. */
export function normalizeTokenChecklist(raw: unknown): Record<string, true> | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const out: Record<string, true> = {};
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v !== true) continue;
    if (n >= TOKEN_DESIGN_LIMITS.checklist.max) break;
    out[k] = true;
    n += 1;
  }
  return n ? out : undefined;
}

/**
 * The read side normaliser for token designs (M46). Touches only the build
 * step ticks, dropped when garbage or empty and never added, so a document
 * without the key is byte identical and every published hash holds.
 */
export function normalizeTokenDesignDoc(raw: TokenDesignDoc): TokenDesignDoc {
  const { checklist, ...rest } = raw as TokenDesignDoc & { checklist?: unknown };
  const clean = normalizeTokenChecklist(checklist);
  return clean ? { ...(rest as TokenDesignDoc), checklist: clean } : (rest as TokenDesignDoc);
}

export type IdeationDoc = ProjectDoc | TokenDesignDoc;

// ---------------------------------------------------------------------------
// Canonicalization + hashing (consensus rule — see header)

export function canonicalizeIdeationDoc(doc: IdeationDoc): string {
  return JSON.stringify(sortValue(doc));
}

export function hashIdeationDoc(doc: IdeationDoc): `0x${string}` {
  return keccak256(stringToBytes(canonicalizeIdeationDoc(doc)));
}

// ---------------------------------------------------------------------------
// Validation — first human-readable problem or null, matching lib/journey.ts.
// Drafts are saved without validation; these run at publish time (server and
// client) and gate each editor step.

const ADDRESS = /^0x[0-9a-f]{40}$/;

function checkText(
  label: string,
  value: string,
  limits: { min?: number; max: number },
): string | null {
  const trimmed = value.trim();
  if (limits.min && trimmed.length < limits.min)
    return `${label} needs at least ${limits.min} characters.`;
  if (value.length > limits.max) return `${label} is over ${limits.max} characters.`;
  return null;
}

function checkStatusDecl(label: string, decl: StatusDecl): string | null {
  const valid = ["in_place", "legal_ops", "planned_before_mainnet", "not_yet"];
  if (!valid.includes(decl.status)) return `${label} needs a status.`;
  if (decl.note && decl.status !== "in_place")
    return `${label} accepts a note only for "already in place".`;
  if (decl.note && decl.note.length > 200) return `${label} note is over 200 characters.`;
  return null;
}

export function validateProjectDoc(doc: ProjectDoc): string | null {
  const L = PROJECT_LIMITS;
  if (doc.kind !== "project") return "Not a project document.";
  if (doc.version !== 1) return "Unsupported project document version.";

  let p = checkText("Name", doc.name, L.name);
  if (p) return p;
  const sectors = docSectors(doc);
  if (sectors.length < L.sectors.min) return "Pick a sector.";
  if (sectors.some((s) => !SECTOR_VALUES.includes(s))) return "Unknown sector.";
  if (new Set(sectors).size !== sectors.length || sectors.length > L.sectors.max)
    return "Too many sectors.";
  if (doc.sector && doc.sector !== sectors[0]) return "Sectors are out of step.";
  if (sectors.includes("other")) {
    if (!doc.sectorOther?.trim()) return "Describe the sector.";
    if (doc.sectorOther.length > L.sectorOther.max)
      return `Sector description is over ${L.sectorOther.max} characters.`;
  }
  const subsectors = doc.subsectors ?? [];
  if (subsectors.some((v) => !SUBSECTOR_VALUES.includes(v))) return "Unknown subsector.";
  for (const sub of subsectors)
    if (!sectors.includes(sectorOfSubsector(sub))) return "A subsector belongs to a sector that is not chosen.";
  for (const sector of sectors) {
    const own = SECTOR_SUBSECTORS[sector];
    if (own.length === 0) continue;
    const n = subsectors.filter((v) => own.includes(v)).length;
    if (n < L.subsectors.min) return "Pick at least one subsector.";
    if (n > L.subsectors.max) return `At most ${L.subsectors.max} subsectors.`;
  }
  if (doc.chain !== undefined && !isProjectChain(doc.chain)) return "Unknown chain.";
  if (doc.kit) {
    p = validateProjectKit(doc.kit, kitsForSectors(sectors, subsectors));
    if (p) return p;
  }
  p =
    checkText("What it does", doc.whatItDoes, L.whatItDoes) ??
    checkText("Who the user is", doc.userIs, L.userIs);
  if (p) return p;
  if (doc.personas) {
    if (doc.personas.length > L.personas.max) return `At most ${L.personas.max} personas.`;
    for (const persona of doc.personas) {
      p =
        checkText("Persona team size", persona.teamSize, L.personaTeamSize) ??
        checkText("Persona geography", persona.geography, L.personaText) ??
        checkText("Persona industry", persona.industry, L.personaText) ??
        checkText("Persona primary contact", persona.primaryContact, L.personaText);
      if (p) return p;
      if (persona.teamSize.trim() && !TEAM_SIZE_PATTERN.test(persona.teamSize.trim()))
        return "Persona team size must be a number or a range like 10-50.";
      if (persona.revenueRange && !REVENUE_RANGE_VALUES.includes(persona.revenueRange))
        return "Unknown persona revenue range.";
    }
  }
  if (doc.audience !== undefined && !AUDIENCE_VALUES.includes(doc.audience)) return "Unknown audience.";
  if (doc.consumerPersonas) {
    if (doc.consumerPersonas.length > L.personas.max) return `At most ${L.personas.max} personas.`;
    for (const persona of doc.consumerPersonas) {
      p =
        checkText("Persona age range", persona.ageRange, L.personaAgeRange) ??
        checkText("Persona geography", persona.geography, L.personaText) ??
        checkText("Persona how they find you", persona.howTheyFindYou, L.personaText) ??
        checkText("Persona holdings", persona.holdings, L.personaText);
      if (p) return p;
      if (persona.ageRange.trim() && !TEAM_SIZE_PATTERN.test(persona.ageRange.trim()))
        return "Persona age range must be a number or a range like 25-40.";
      if (persona.cryptoExperience && !CRYPTO_EXPERIENCE_VALUES.includes(persona.cryptoExperience))
        return "Unknown persona crypto experience.";
    }
  }
  if (doc.payer === "third_party") {
    p = checkText("Who pays", doc.whoPays, L.whoPays);
    if (p) return p;
  }
  p = checkText("Why this chain", doc.whyThisChain, L.whyThisChain);
  if (p) return p;
  if (!doc.stage) return "Pick a current stage.";

  const a = doc.architecture;
  p = checkText("Contracts", a.contracts, L.architectureField);
  if (p) return p;
  if (!a.externalDepsNone && a.externalDeps.length === 0)
    return "List external dependencies, or mark that there are none.";
  if (a.externalDeps.length > L.externalDeps.max)
    return `At most ${L.externalDeps.max} external dependencies.`;
  for (const dep of a.externalDeps) {
    p = checkText("Dependency name", dep.name, L.externalDepName);
    if (p) return p;
    if (dep.url) {
      if (!/^https?:\/\/\S+$/.test(dep.url)) return "Dependency links must be http(s) URLs.";
      if (dep.url.length > L.externalDepUrl.max)
        return `Dependency link is over ${L.externalDepUrl.max} characters.`;
    }
  }
  if (!a.oracleUse) return "Answer the oracle question, or pick none.";
  if (a.oracleUse === "uses") {
    p = checkText("Oracles", a.oracles, L.architectureField);
    if (p) return p;
  }
  p = checkText("Admin functions", a.adminFunctions, L.architectureField);
  if (p) return p;
  if (!a.upgradeability) return "Pick an upgradeability answer.";
  if (!doc.worstCase) return "Answer the worst-case question.";

  const s = doc.security;
  p =
    checkStatusDecl("Audit", s.audit) ??
    checkStatusDecl("Bug bounty", s.bugBounty) ??
    checkStatusDecl("Monitoring", s.monitoring) ??
    checkStatusDecl("Incident response", s.incidentResponse) ??
    checkStatusDecl("Key custody", s.keyCustody);
  if (p) return p;

  // The acknowledgement is about Robinhood Chain, so only a project there owes it (M52).
  if (projectChainOf(doc) === "robinhood_testnet" && doc.mythAck !== true)
    return "Acknowledge the Robinhood distribution reality before publishing.";
  p = checkText("First hundred users", doc.firstHundredUsers, L.firstHundredUsers);
  if (p) return p;

  if (doc.githubRepo && !/^[\w.-]+\/[\w.-]+$/.test(doc.githubRepo))
    return "GitHub repo must be owner/name.";
  if (doc.testnetContracts) {
    if (doc.testnetContracts.length > L.testnetContracts.max)
      return `At most ${L.testnetContracts.max} testnet contracts.`;
    for (const addr of doc.testnetContracts)
      if (!ADDRESS.test(addr)) return "Testnet contract addresses must be lowercase hex.";
  }
  if (doc.verifyWallet && !ADDRESS.test(doc.verifyWallet))
    return "Team wallet must be a lowercase hex address.";
  return null;
}

/** Cohorts that must have a vesting row: allocation > 0. */
export function vestedCohorts(allocations: AllocationSplit): VestedCohort[] {
  const out: VestedCohort[] = [];
  if (allocations.team > 0) out.push("team");
  if (allocations.investors > 0) out.push("investors");
  if (allocations.advisors > 0) out.push("advisors");
  return out;
}

const SALE_EVENTS: DistributionEvent[] = ["fixed_price_sale", "auction", "lbp"];

export function isSaleEvent(event: TokenDesignDoc["distribution"]["event"]): boolean {
  return SALE_EVENTS.includes(event as DistributionEvent);
}

export function validateTokenDesignDoc(doc: TokenDesignDoc): string | null {
  const L = TOKEN_DESIGN_LIMITS;
  if (doc.kind !== "token_design") return "Not a token design document.";
  if (doc.version !== 1) return "Unsupported token design document version.";

  let p = checkText("Name", doc.name, L.name);
  if (p) return p;
  if (!doc.ticker.trim()) return "Ticker is required.";
  if (doc.ticker.length > L.ticker.max) return `Ticker is over ${L.ticker.max} characters.`;
  if (!L.ticker.pattern.test(doc.ticker)) return "Ticker must be uppercase letters and numbers only.";

  // §1 Rationale
  if (!doc.rationale.why) return "Answer why this needs a token.";
  if (!doc.rationale.path) return "Pick an issuance path.";
  p = checkText("Beyond a database row", doc.rationale.beyondDatabaseRow, L.beyondDatabaseRow);
  if (p) return p;

  // §2 Supply and allocation
  const { total, policy, allocations } = doc.supply;
  if (!Number.isFinite(total) || total < L.supplyTotal.min || total > L.supplyTotal.max)
    return "Total supply must be a positive number.";
  if (!policy) return "Pick fixed or inflationary supply.";
  if (doc.supply.inflationNote && doc.supply.inflationNote.length > L.inflationNote.max)
    return `Inflation note is over ${L.inflationNote.max} characters.`;
  const parts = [
    allocations.team,
    allocations.investors,
    allocations.treasuryEcosystem,
    allocations.public,
    allocations.liquidity,
    allocations.advisors,
    allocations.other,
  ];
  for (const v of parts)
    if (!Number.isInteger(v) || v < 0 || v > 100)
      return "Allocations must be whole percentages between 0 and 100.";
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum !== 100) return `Allocations must total 100% (currently ${sum}%).`;
  if (allocations.other > 0 && !allocations.otherLabel?.trim())
    return 'Label the "other" allocation.';

  // §3 Vesting — mandatory where allocation is non-zero
  const needed = vestedCohorts(allocations);
  for (const cohort of needed) {
    const row = doc.vesting.cohorts.find((c) => c.cohort === cohort);
    if (!row) return `Vesting terms are required for the ${cohort} allocation.`;
    const { cliffMonths, durationMonths } = row;
    const M = L.vestingMonths;
    if (!Number.isInteger(cliffMonths) || cliffMonths < M.min || cliffMonths > M.max)
      return `${cohort} cliff must be ${M.min}–${M.max} months.`;
    if (!Number.isInteger(durationMonths) || durationMonths < M.min || durationMonths > M.max)
      return `${cohort} duration must be ${M.min}–${M.max} months.`;
    if (cliffMonths > durationMonths) return `${cohort} cliff cannot exceed the duration.`;
  }
  if (needed.length > 0) {
    if (!doc.vesting.release) return "Pick a release type.";
    if (!doc.vesting.founderLeaves) return "Answer the founder-departure question.";
  }

  // §4 Distribution — gated on its own first question
  if (!doc.distribution.event) return "Answer whether there is a distribution event.";
  if (isSaleEvent(doc.distribution.event)) {
    const sale = doc.distribution.sale;
    if (!sale) return "Fill in the sale terms.";
    if (!(sale.price > 0)) return "Sale price must be positive.";
    if (!(sale.hardCap > 0)) return "Hard cap must be positive.";
    if (sale.softCap < 0 || sale.softCap > sale.hardCap)
      return "Soft cap must be between 0 and the hard cap.";
    if (sale.perWalletLimit < 0) return "Per-wallet limit cannot be negative.";
    if (!sale.access) return "Pick allowlist or open access.";
    if (!sale.undersubscription) return "Pick an undersubscription plan.";
  }

  // §5 Market — gated on its own first question
  if (!doc.market.when) return "Answer whether a market exists at launch.";
  if (doc.market.when === "at_launch") {
    const m = doc.market.atLaunch;
    if (!m) return "Fill in the launch-market terms.";
    if (!(m.liquidityEth > 0)) return "Liquidity amount must be positive.";
    p = checkText("ETH source", m.ethSource, L.ethSource);
    if (p) return p;
    if (!m.lp) return "Pick an LP treatment.";
    if (m.lp === "locked") {
      const lk = L.lpLockMonths;
      if (
        !Number.isInteger(m.lpLockMonths) ||
        (m.lpLockMonths as number) < lk.min ||
        (m.lpLockMonths as number) > lk.max
      )
        return `LP lock must be ${lk.min}–${lk.max} months.`;
    }
    if (!m.antiSniping) return "Pick an anti-sniping answer.";
  }

  // §6 Governance
  p =
    checkStatusDecl("Governance mechanism", doc.governance.mechanism) ??
    checkStatusDecl("Admin key custody", doc.governance.adminKeys) ??
    checkStatusDecl("Treasury custody", doc.governance.treasuryCustody);
  if (p) return p;

  // §7 Legal
  if (!doc.legal.counsel) return "Answer the counsel status.";

  // §8 Post-launch — optional, bounds only
  const pl = doc.postLaunch;
  if (pl.runwayMonths !== undefined) {
    const R = L.runwayMonths;
    if (!Number.isInteger(pl.runwayMonths) || pl.runwayMonths < R.min || pl.runwayMonths > R.max)
      return `Runway must be ${R.min}–${R.max} months.`;
  }
  if (pl.priceCollapsePlan && pl.priceCollapsePlan.length > L.priceCollapsePlan.max)
    return `Price-collapse response is over ${L.priceCollapsePlan.max} characters.`;
  if (pl.failureCriteria && pl.failureCriteria.length > L.failureCriteria.max)
    return `Failure criteria is over ${L.failureCriteria.max} characters.`;
  if (pl.milestones !== undefined) {
    p = validateMilestones(pl.milestones);
    if (p) return p;
  }
  if (doc.checklist && Object.keys(doc.checklist).length > L.checklist.max)
    return "Too many build step entries.";

  return null;
}

export function validateIdeationDoc(doc: IdeationDoc): string | null {
  return doc.kind === "project" ? validateProjectDoc(doc) : validateTokenDesignDoc(doc);
}

// ---------------------------------------------------------------------------
// Empty drafts

export function emptyStatusDecl(): StatusDecl {
  return { status: "" as StatusDecl["status"] };
}

export function emptyProjectDoc(name = ""): ProjectDoc {
  return {
    kind: "project",
    version: 1,
    slug: "",
    publishVersion: 0,
    name,
    sector: "",
    whatItDoes: "",
    userIs: "",
    payer: "",
    whoPays: "",
    whyThisChain: "",
    stage: "",
    architecture: {
      contracts: "",
      externalDeps: [],
      externalDepsNone: false,
      oracleUse: "",
      oracles: "",
      adminFunctions: "",
      upgradeability: "",
    },
    worstCase: "",
    security: {
      audit: emptyStatusDecl(),
      bugBounty: emptyStatusDecl(),
      monitoring: emptyStatusDecl(),
      incidentResponse: emptyStatusDecl(),
      keyCustody: emptyStatusDecl(),
    },
    mythAck: false,
    firstHundredUsers: "",
  };
}

export function emptyAllocationSplit(): AllocationSplit {
  return {
    team: 0,
    investors: 0,
    treasuryEcosystem: 0,
    public: 0,
    liquidity: 0,
    advisors: 0,
    other: 0,
  };
}

export function emptyTokenDesignDoc(name = ""): TokenDesignDoc {
  return {
    kind: "token_design",
    version: 1,
    slug: "",
    publishVersion: 0,
    name,
    ticker: "",
    rationale: { why: "", path: "", beyondDatabaseRow: "" },
    supply: { total: 0, policy: "", allocations: emptyAllocationSplit() },
    vesting: { cohorts: [], release: "", founderLeaves: "" },
    distribution: { event: "" },
    market: { when: "" },
    governance: {
      mechanism: emptyStatusDecl(),
      adminKeys: emptyStatusDecl(),
      treasuryCustody: emptyStatusDecl(),
    },
    legal: { counsel: "" },
    postLaunch: {},
  };
}

/**
 * What a launch carries about the studio project it was started from: the
 * chosen sectors, subsectors and product shapes with their labels, and the
 * public URL when the project is published. Built server-side by
 * lib/launch-project.ts; shared with client components, so it lives here
 * rather than in a server-only module.
 */
export interface ProjectContext {
  id: string;
  name: string;
  status: "draft" | "published";
  slug: string | null;
  sectors: Sector[];
  subsectors: Subsector[];
  shapes: ProductShape[];
  sectorLabels: string[];
  subsectorLabels: string[];
  shapeLabels: string[];
  /** https://www.canhav.com/p/<slug> when published, else null. */
  publicUrl: string | null;
  /** The chain the project builds on, which its token launches on (M54). */
  chain: ProjectChain;
}
