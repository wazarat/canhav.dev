import { keccak256, stringToBytes } from "viem";
import { sortValue } from "@/lib/journey";
import { LAUNCH_FORM } from "@/content/launch";

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

export type Sector =
  | "credit_lending"
  | "liquidity_infra"
  | "underwriting_risk"
  | "rwa_infra"
  | "oracles_data"
  | "perps_derivatives"
  | "agentic_trading"
  | "stablecoin_payments"
  | "portfolio_vaults"
  | "dex_market_structure"
  | "other";

export type ProjectStage =
  | "idea"
  | "design_doc"
  | "prototype"
  | "testnet_deployed"
  | "live_elsewhere";

export type Upgradeability = "immutable" | "upgradeable_proxy" | "partially" | "undecided";

export type WorstCase = "lose_funds" | "lock_funds" | "misprice" | "nothing_serious";

export interface ProjectDoc {
  kind: "project";
  version: 1;
  /** Assigned at first publish, "" in drafts. Immutable once set. */
  slug: string;
  /** Snapshot counter, stamped at publish. 0 in drafts. */
  publishVersion: number;
  name: string;
  sector: Sector | "";
  sectorOther?: string;
  /** What it does, one paragraph. */
  whatItDoes: string;
  /** Who the user is — and separately, who pays. */
  userIs: string;
  whoPays: string;
  whyThisChain: string;
  stage: ProjectStage | "";
  architecture: {
    /** What contracts exist (or "None yet"). */
    contracts: string;
    /** External dependencies: Uniswap, Morpho, Chainlink, … */
    externalDeps: string;
    oracles: string;
    /** Admin functions and why they exist. */
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
  whatItDoes: { min: 80, max: 1200 },
  userIs: { min: 20, max: 400 },
  whoPays: { min: 20, max: 400 },
  whyThisChain: { min: 40, max: 800 },
  architectureField: { min: 4, max: 800 },
  firstHundredUsers: { min: 40, max: 600 },
  testnetContracts: { max: 10 },
} as const;

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
  };
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
} as const;

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
    return `${label}: a note is only accepted for "already in place".`;
  if (decl.note && decl.note.length > 200) return `${label} note is over 200 characters.`;
  return null;
}

export function validateProjectDoc(doc: ProjectDoc): string | null {
  const L = PROJECT_LIMITS;
  if (doc.kind !== "project") return "Not a project document.";
  if (doc.version !== 1) return "Unsupported project document version.";

  let p = checkText("Name", doc.name, L.name);
  if (p) return p;
  if (!doc.sector) return "Pick a sector.";
  if (doc.sector === "other") {
    if (!doc.sectorOther?.trim()) return "Describe the sector.";
    if (doc.sectorOther.length > L.sectorOther.max)
      return `Sector description is over ${L.sectorOther.max} characters.`;
  }
  p =
    checkText("What it does", doc.whatItDoes, L.whatItDoes) ??
    checkText("Who the user is", doc.userIs, L.userIs) ??
    checkText("Who pays", doc.whoPays, L.whoPays) ??
    checkText("Why this chain", doc.whyThisChain, L.whyThisChain);
  if (p) return p;
  if (!doc.stage) return "Pick a current stage.";

  const a = doc.architecture;
  p =
    checkText("Contracts", a.contracts, L.architectureField) ??
    checkText("External dependencies", a.externalDeps, L.architectureField) ??
    checkText("Oracles", a.oracles, L.architectureField) ??
    checkText("Admin functions", a.adminFunctions, L.architectureField);
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

  if (doc.mythAck !== true)
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
  if (!L.ticker.pattern.test(doc.ticker)) return "Ticker: uppercase letters and numbers only.";

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
      return `${cohort}: cliff must be ${M.min}–${M.max} months.`;
    if (!Number.isInteger(durationMonths) || durationMonths < M.min || durationMonths > M.max)
      return `${cohort}: duration must be ${M.min}–${M.max} months.`;
    if (cliffMonths > durationMonths) return `${cohort}: cliff cannot exceed the duration.`;
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
    whoPays: "",
    whyThisChain: "",
    stage: "",
    architecture: {
      contracts: "",
      externalDeps: "",
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
