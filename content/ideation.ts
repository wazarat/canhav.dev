import type {
  AntiSniping,
  CounselStatus,
  DistributionEvent,
  FounderLeavesPolicy,
  IssuancePath,
  LpTreatment,
  MarketTiming,
  ProjectStage,
  RationaleWhy,
  ReleaseType,
  Sector,
  StatusDecl,
  SupplyPolicy,
  UndersubscriptionPlan,
  Upgradeability,
  WorstCase,
} from "@/lib/ideation";
import type { DesignWarning } from "@/lib/tokenDesign";

/**
 * Copy and option lists for the ideation tracks (/studio, /p, /t). Limits
 * live in lib/ideation.ts; everything shown to a human lives here.
 */

// ---------------------------------------------------------------------------
// Shared

/** Display label for a select value, or an em dash when unset/unknown. */
export function optionLabel<V extends string>(
  options: ReadonlyArray<{ value: V; label: string }>,
  value: V | "" | undefined,
): string {
  return options.find((o) => o.value === value)?.label ?? "—";
}

export const STATUS_DECL_OPTIONS: Array<{ value: StatusDecl["status"]; label: string }> = [
  { value: "in_place", label: "Already in place" },
  { value: "legal_ops", label: "Handled by our legal/ops team" },
  { value: "planned_before_mainnet", label: "Planned before mainnet" },
  { value: "not_yet", label: "Not yet" },
];

export const STATUS_DECL_LABELS: Record<StatusDecl["status"], string> = {
  in_place: "Already in place",
  legal_ops: "Handled by our legal/ops team",
  planned_before_mainnet: "Planned before mainnet",
  not_yet: "Not yet",
};

// ---------------------------------------------------------------------------
// Project track

export const SECTOR_OPTIONS: Array<{ value: Sector; label: string }> = [
  { value: "credit_lending", label: "Credit and lending" },
  { value: "liquidity_infra", label: "Liquidity infrastructure" },
  { value: "underwriting_risk", label: "Underwriting and risk" },
  { value: "rwa_infra", label: "RWA infrastructure" },
  { value: "oracles_data", label: "Oracles and data" },
  { value: "perps_derivatives", label: "Perps and derivatives" },
  { value: "agentic_trading", label: "Agentic trading" },
  { value: "stablecoin_payments", label: "Stablecoin and payments" },
  { value: "portfolio_vaults", label: "Portfolio and vaults" },
  { value: "dex_market_structure", label: "DEX and market structure" },
  { value: "other", label: "Other" },
];

export const STAGE_OPTIONS: Array<{ value: ProjectStage; label: string }> = [
  { value: "idea", label: "Idea" },
  { value: "design_doc", label: "Design doc" },
  { value: "prototype", label: "Prototype" },
  { value: "testnet_deployed", label: "Testnet contracts deployed" },
  { value: "live_elsewhere", label: "Live elsewhere" },
];

export const UPGRADEABILITY_OPTIONS: Array<{ value: Upgradeability; label: string }> = [
  { value: "immutable", label: "Immutable" },
  { value: "upgradeable_proxy", label: "Upgradeable proxy" },
  { value: "partially", label: "Partially upgradeable" },
  { value: "undecided", label: "Undecided" },
];

export const WORST_CASE_OPTIONS: Array<{ value: WorstCase; label: string }> = [
  { value: "lose_funds", label: "Lose user funds" },
  { value: "lock_funds", label: "Lock funds" },
  { value: "misprice", label: "Misprice" },
  { value: "nothing_serious", label: "Nothing serious" },
];

/** Security-step framing, scaled by the worst-case answer — copy pressure
 *  only, never validation. */
export const WORST_CASE_PRESSURE: Record<WorstCase, string> = {
  lose_funds:
    "A bug can lose user funds. Read the declarations below with that " +
    "sentence in mind — every \"not yet\" is a live risk you're choosing to " +
    "publish, and readers will weigh it exactly that way.",
  lock_funds:
    "A bug can lock funds. Recovery plans and monitoring matter more than " +
    "usual — say honestly where they stand.",
  misprice:
    "A bug can misprice. Oracles and monitoring are your blast radius — " +
    "declare where they stand.",
  nothing_serious:
    "Low blast radius is a fine answer — declare the basics and move on.",
};

export const PROJECT_SECURITY_FIELDS = [
  { key: "audit", label: "Audit" },
  { key: "bugBounty", label: "Bug bounty" },
  { key: "monitoring", label: "Monitoring" },
  { key: "incidentResponse", label: "Incident response" },
  { key: "keyCustody", label: "Key custody" },
] as const;

/** The misconception this platform refuses to let stand quietly. */
export const ROBINHOOD_MYTH = {
  title: "A reality check before you publish",
  body:
    "Robinhood Chain does not provide distribution to Robinhood brokerage " +
    "customers. Deploying here puts your app in front of nobody by default. " +
    "CanHav is an independent project with no affiliation with Robinhood " +
    "Markets, Inc. — listing here is not a channel to its users either.",
  ack: "I understand: no built-in distribution, no Robinhood affiliation.",
  followUp: "So where will your first hundred users actually come from?",
} as const;

// ---------------------------------------------------------------------------
// Token track

export const RATIONALE_WHY_OPTIONS: Array<{ value: RationaleWhy; label: string }> = [
  { value: "token_is_product", label: "The token is the product (stablecoin, vault share, receipt)" },
  { value: "bootstrap_supply", label: "Bootstrapping a supply side before revenue exists" },
  { value: "economic_security", label: "Slashable economic security" },
  { value: "governance", label: "Governance over real parameters and treasury" },
  { value: "fee_capture", label: "Fee capture in a system with existing volume" },
  { value: "fundraising", label: "Fundraising" },
  { value: "not_sure", label: "Not sure yet" },
];

export const ISSUANCE_PATH_OPTIONS: Array<{ value: IssuancePath; label: string }> = [
  { value: "issue_and_lock", label: "Issue and lock, no market yet" },
  { value: "points_first", label: "Non-transferable points first" },
  { value: "straight_to_market", label: "Straight to market" },
];

export const SUPPLY_POLICY_OPTIONS: Array<{ value: SupplyPolicy; label: string }> = [
  { value: "fixed", label: "Fixed" },
  { value: "inflationary", label: "Inflationary" },
];

export const ALLOCATION_FIELDS = [
  { key: "team", label: "Team" },
  { key: "investors", label: "Investors" },
  { key: "treasuryEcosystem", label: "Treasury / ecosystem" },
  { key: "public", label: "Public" },
  { key: "liquidity", label: "Liquidity" },
  { key: "advisors", label: "Advisors" },
  { key: "other", label: "Other" },
] as const;

export const RELEASE_TYPE_OPTIONS: Array<{ value: ReleaseType; label: string }> = [
  { value: "linear", label: "Linear" },
  { value: "milestone_conditional", label: "Milestone-conditional" },
  { value: "cliff_then_linear", label: "Cliff then linear" },
];

export const FOUNDER_LEAVES_OPTIONS: Array<{ value: FounderLeavesPolicy; label: string }> = [
  { value: "returns_to_treasury", label: "Unvested returns to treasury" },
  { value: "returns_to_team", label: "Unvested returns to remaining team" },
  { value: "continues_vesting", label: "Continues vesting" },
  { value: "no_policy", label: "No policy yet" },
];

export const DISTRIBUTION_EVENT_OPTIONS: Array<{ value: DistributionEvent; label: string }> = [
  { value: "none", label: "No distribution — creator holds supply" },
  { value: "airdrop", label: "Airdrop" },
  { value: "fixed_price_sale", label: "Fixed-price sale" },
  { value: "auction", label: "Auction / batch" },
  { value: "lbp", label: "LBP" },
];

export const UNDERSUBSCRIPTION_OPTIONS: Array<{ value: UndersubscriptionPlan; label: string }> = [
  { value: "proceed", label: "Proceed anyway" },
  { value: "refund", label: "Refund" },
  { value: "postpone", label: "Postpone" },
  { value: "no_plan", label: "No plan yet" },
];

export const MARKET_TIMING_OPTIONS: Array<{ value: MarketTiming; label: string }> = [
  { value: "at_launch", label: "At launch" },
  { value: "later", label: "Later" },
  { value: "never", label: "Never" },
];

export const LP_TREATMENT_OPTIONS: Array<{ value: LpTreatment; label: string }> = [
  { value: "locked", label: "Locked, with duration" },
  { value: "burned", label: "Burned" },
  { value: "unlocked", label: "Unlocked" },
];

export const ANTI_SNIPING_OPTIONS: Array<{ value: AntiSniping; label: string }> = [
  { value: "window", label: "Launch window" },
  { value: "tax", label: "Early-sell tax" },
  { value: "delay", label: "Trading delay" },
  { value: "none", label: "None" },
];

export const GOVERNANCE_FIELDS = [
  { key: "mechanism", label: "Governance mechanism" },
  { key: "adminKeys", label: "Admin key custody" },
  { key: "treasuryCustody", label: "Treasury custody" },
] as const;

export const GOVERNANCE_FRAMING =
  "Most pre-PMF teams haven't settled this, and that's fine. Tell us where it stands.";

export const COUNSEL_OPTIONS: Array<{ value: CounselStatus; label: string }> = [
  { value: "working_with_counsel", label: "Working with counsel" },
  { value: "engaging_before_mainnet", label: "Engaging counsel before mainnet" },
  { value: "not_yet", label: "Not yet" },
];

export const LEGAL_TOPICS = [
  "How the token is offered and to whom",
  "Whether any sale is a securities offering where buyers live",
  "Tax treatment of allocations, vesting, and treasury sales",
  "Entity structure holding the treasury and IP",
] as const;

export const LEGAL_DISCLAIMER =
  "CanHav does not give legal advice. This section records where your legal " +
  "work stands — nothing more is stored.";

export const REPORTING_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "ad_hoc", label: "Ad hoc" },
  { value: "none_yet", label: "None yet" },
] as const;

// ---------------------------------------------------------------------------
// Resources — fire on warnings, not completions. Catching bad answers is the
// product; each entry explains the problem and shows a worked example.

export interface IdeationResource {
  title: string;
  body: string;
  example: string;
}

export const IDEATION_RESOURCES: Record<DesignWarning, IdeationResource> = {
  low_float: {
    title: "Float under 5%",
    body:
      "A tiny circulating float makes the quoted price nearly meaningless: a " +
      "small buy moves it violently up, the first unlock moves it violently " +
      "down, and holders discover the fully-diluted valuation was the real " +
      "number all along. Low float + high FDV is the most common launch " +
      "structure that ends badly.",
    example:
      "Worked example: 3% float at a $10M FDV means $300k of real tokens set " +
      "the price for the other $9.7M. When the month-6 cliff releases 15%, " +
      "supply grows 6× at once — the chart does the rest. Compare: a 15% " +
      "float absorbs the same unlock as a 2× change.",
  },
  team_cliff_short: {
    title: "Team cliff shorter than investors'",
    body:
      "Your team can start exiting before the people who funded you. Every " +
      "sophisticated buyer reads this as adverse selection, and it will come " +
      "up in every diligence conversation. Standard practice is team terms " +
      "at least as long as investor terms.",
    example:
      "Worked example: team 6-month cliff / 24-month vest vs investors " +
      "12-month cliff / 24-month vest — the team can sell for six months " +
      "while investors are still locked. Flip the cliffs (team 12, investors " +
      "6–12) and the signal reverses.",
  },
  unlock_cluster: {
    title: "Unlocks clustered in the same month",
    body:
      "Two or more cohorts hit their first unlock in the same month. Cliffs " +
      "that coincide concentrate sell pressure into a single date the whole " +
      "market can see coming; staggering them by even a quarter spreads the " +
      "supply shock.",
    example:
      "Worked example: team and investors both cliff at month 12 → 35% of " +
      "supply becomes liquid in one week. Staggered (investors month 9, team " +
      "month 15), each event is under 20% and the market has a price between " +
      "them.",
  },
  sale_no_undersub_plan: {
    title: "Sale with no undersubscription plan",
    body:
      "If the sale doesn't fill, something happens by default — and default " +
      "outcomes are the worst ones: a half-funded treasury, an accidental " +
      "low-float launch, or a quiet cancellation that burns trust. Decide " +
      "now: proceed, refund, or postpone.",
    example:
      "Worked example: a 1,000 ETH hard-cap sale raises 180 ETH. Proceed " +
      "anyway → you launch with 18% of planned runway and the same promises. " +
      "Refund → buyers are whole and you re-scope. Postpone → you keep " +
      "optionality. All three beat finding out live.",
  },
  rationale_unsure: {
    title: "Does this actually need a token?",
    body:
      "The honest fit test: if a database row, a Stripe account, or a " +
      "points table would do the same job, the token adds regulatory " +
      "surface, sell pressure, and a second product to run — and removes " +
      "nothing. Loyalty-style rewards are the classic false positive. " +
      "There is a respectable exit here: build the product, list it on " +
      "CanHav as a project, and skip the token until it earns its place.",
    example:
      "Worked example: \"users earn tokens for referrals\" is a points " +
      "column. \"LPs stake the token to underwrite risk and get slashed on " +
      "bad debt\" cannot be a database row — the token is doing economic " +
      "work a ledger entry can't.",
  },
};

// ---------------------------------------------------------------------------
// Facts shown, not asked — rendered with a Blockscout link to the contract.

export const GOVERNANCE_FACTS = [
  "Cannot be minted after deployment",
  "Cannot be paused, frozen, or blacklisted",
  "Cannot be upgraded — no proxy, no owner",
  "Source pre-verified: the factory clones a verified implementation",
] as const;

export const MARKET_FACTS = [
  "Venue and pairing are platform-fixed: token ⇄ ETH on the launch AMM",
  "Trading fee: 0.30% to LPs; the opt-in protocol fee is split 70/30 project/platform, enforced in bytecode",
  "A locked LP position still accrues trading fees to its owner",
] as const;

// ---------------------------------------------------------------------------
// Page copy

export const STUDIO_COPY = {
  kicker: "Studio",
  title: "Ideation",
  subtitle:
    "Two tracks, independent by design. Define the product you're building, " +
    "design the token you're issuing — either, both, or linked.",
  newProject: "New project",
  newTokenDesign: "New token design",
} as const;

export const ENFORCEMENT_COPY = {
  enforced: "Enforced on-chain",
  enforcedHint: "Written into the contract at deployment — cannot be changed by anyone.",
  stated: "Stated by team",
  statedHint: "Published commitments. Not enforced by the contract.",
} as const;
