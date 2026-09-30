import type {
  AntiSniping,
  Audience,
  ConsumerPersona,
  CounselStatus,
  CryptoExperience,
  DistributionEvent,
  FounderLeavesPolicy,
  IssuancePath,
  LpTreatment,
  MarketTiming,
  OracleUse,
  Payer,
  Persona,
  ProjectDoc,
  ProjectStage,
  RationaleWhy,
  RevenueRange,
  ReleaseType,
  Sector,
  StatusDecl,
  Subsector,
  SupplyPolicy,
  UndersubscriptionPlan,
  Upgradeability,
  WorstCase,
} from "@/lib/ideation";
// Values, used only inside functions. lib/ideation reaches this file through
// content/kits/copy, so nothing here may read them at module load.
import { PROJECT_LIMITS, docAudience, filledConsumerPersonas, filledPersonas } from "@/lib/ideation";
import { docSectors } from "@/lib/sectors";
import type { DesignWarning } from "@/lib/tokenDesign";

/**
 * Copy and option lists for the ideation tracks (/studio, /p, /t). Limits
 * live in lib/ideation.ts; everything shown to a human lives here.
 */

// ---------------------------------------------------------------------------
// Shared

/** Display label for a select value, or "Not set" when unset/unknown. */
export function optionLabel<V extends string>(
  options: ReadonlyArray<{ value: V; label: string }>,
  value: V | "" | undefined,
): string {
  return options.find((o) => o.value === value)?.label ?? "Not set";
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

/** The exact phrase for options that exist in the list but cannot be chosen yet. */
export const SOON_LABEL = "Coming soon";

/** An option that may be listed but not yet selectable. `available` defaults to true. */
export interface GatedOption<V extends string> {
  value: V;
  label: string;
  available?: boolean;
  /** Card heading in the sentence pickers. Falls back to `label`. */
  title?: string;
  /** First-person sentence under the card heading. */
  sentence?: string;
}

/**
 * Six sectors, Credit first. Credit and Liquidity open today; the other four
 * are listed so builders see where the platform is going. A project picks one
 * or more. Retired ids from the earlier eleven-sector list are remapped in
 * lib/ideation.ts.
 */
export const SECTOR_OPTIONS: Array<GatedOption<Sector>> = [
  {
    value: "credit_lending",
    label: "Credit",
    title: "Credit sector application",
    sentence: "I am looking to let users lend, borrow, or earn yield on their assets.",
  },
  { value: "staking", label: "Staking", available: false },
  {
    value: "liquidity_infra",
    label: "Liquidity",
    title: "Liquidity sector application",
    sentence: "I am looking to put assets to work through vaults and pools.",
  },
  { value: "perps_derivatives", label: "Derivatives", available: false },
  { value: "rwa_infra", label: "RWAs", available: false },
  { value: "other", label: "Other", available: false },
];

/** Subsectors per sector, in SECTOR_SUBSECTORS order. Pick one to three per sector. All are open. */
export const SUBSECTOR_OPTIONS_BY_SECTOR: Partial<Record<Sector, Array<GatedOption<Subsector>>>> = {
  credit_lending: [
    {
      value: "lending",
      label: "Lending",
      sentence: "I am looking to let users lend and borrow against collateral.",
    },
    {
      value: "leveraged_yield",
      label: "Leveraged yield",
      sentence: "I am looking to offer amplified yield through looped positions.",
    },
    {
      value: "fixed_income",
      label: "Fixed income",
      sentence: "I am looking to offer fixed-rate returns over a set term.",
    },
  ],
  liquidity_infra: [
    {
      value: "vaults",
      label: "Vaults",
      sentence: "I am looking to run managed vaults that allocate deposits.",
    },
    {
      value: "pools",
      label: "Pools",
      sentence: "I am looking to set up pools that traders swap against.",
    },
  ],
};

/** Every subsector option, sector by sector, for label lookups and picker order. */
export const ALL_SUBSECTOR_OPTIONS: Array<GatedOption<Subsector>> = SECTOR_OPTIONS.flatMap(
  (s) => SUBSECTOR_OPTIONS_BY_SECTOR[s.value] ?? [],
);

/** The subsector chips a chosen sector shows, or none. */
export function subsectorOptionsFor(sector: Sector): Array<GatedOption<Subsector>> {
  return SUBSECTOR_OPTIONS_BY_SECTOR[sector] ?? [];
}

export const SECTOR_COPY = {
  label: "Sector",
  hint: "Pick every sentence that fits.",
  /** Under the sector cards, in place of listing sectors that are not open yet. */
  moreSoon: "We have more features coming soon.",
  subsectorLabel: "Subsector",
  subsectorHint: "Pick every sentence that fits, up to three per sector. Each opens its own research workflow.",
  /** Under the subsector chips when the overlap rule ticked something. */
  overlapHint: (added: string, because: string) =>
    `${added} is ticked because it shares product shapes with ${because}.`,
} as const;

/** Labels for a project's sectors, in option order, honouring the free-text "other". */
export function sectorLabels(doc: Pick<ProjectDoc, "sector" | "sectors" | "sectorOther">): string[] {
  const chosen = new Set(docSectors(doc));
  return SECTOR_OPTIONS.filter((o) => chosen.has(o.value)).map((o) =>
    o.value === "other" && doc.sectorOther?.trim() ? doc.sectorOther.trim() : o.label,
  );
}

/** One line for a project's sectors, or "Not set". */
export function sectorLabel(doc: Pick<ProjectDoc, "sector" | "sectors" | "sectorOther">): string {
  const labels = sectorLabels(doc);
  return labels.length ? labels.join(" · ") : "Not set";
}

/** Labels for a project's chosen subsectors, in option order. Empty when none. */
export function subsectorLabels(doc: Pick<ProjectDoc, "subsectors">): string[] {
  const chosen = new Set(doc.subsectors ?? []);
  return ALL_SUBSECTOR_OPTIONS.filter((o) => chosen.has(o.value)).map((o) => o.label);
}

/** The label of one subsector. */
export function subsectorLabel(sub: Subsector): string {
  return optionLabel(ALL_SUBSECTOR_OPTIONS, sub);
}

export const STAGE_OPTIONS: Array<{ value: ProjectStage; label: string }> = [
  { value: "idea", label: "Idea" },
  { value: "design_doc", label: "Design doc" },
  { value: "prototype", label: "Prototype" },
  { value: "testnet_deployed", label: "Testnet contracts deployed" },
  { value: "live_elsewhere", label: "Live elsewhere" },
];

export const REVENUE_RANGE_OPTIONS: Array<{ value: RevenueRange; label: string }> = [
  { value: "pre_revenue", label: "Pre revenue" },
  { value: "under_1m", label: "Under $1M" },
  { value: "1m_10m", label: "$1M to $10M" },
  { value: "10m_50m", label: "$10M to $50M" },
  { value: "50m_250m", label: "$50M to $250M" },
  { value: "over_250m", label: "Over $250M" },
];

export const CRYPTO_EXPERIENCE_OPTIONS: Array<{ value: CryptoExperience; label: string }> = [
  { value: "new", label: "New to crypto" },
  { value: "some", label: "Some experience" },
  { value: "active", label: "Active user" },
  { value: "professional", label: "Professional" },
];

/** Who the project sells to (M42). Chosen above the persona table. */
export const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string }> = [
  { value: "b2b", label: "Businesses (B2B)" },
  { value: "b2c", label: "Individuals (B2C)" },
];

/** The ideal customer persona tables. Row order is the order in PERSONA_ROWS. */
export const PERSONA_COPY = {
  label: "Who the user is",
  audienceLabel: "Who you sell to",
  audienceHint: "Pick one. The persona table follows.",
  audienceHints: {
    b2b: "Ideal customer personas for the businesses you sell to. Up to three.",
    b2c: "Ideal personas for the individuals you reach. Up to three.",
  },
  note: "Ideal customer personas. Up to three.",
  column: (n: number) => `Persona ${n}`,
  add: "Add persona",
  remove: (n: number) => `Remove persona ${n}`,
  legacyLabel: "Earlier description",
  rows: {
    teamSize: { label: "Team size", placeholder: "25 or 10-50" },
    geography: { label: "Geography", placeholder: "City, country, or continent" },
    industry: { label: "Industry", placeholder: "Fintech, asset management" },
    primaryContact: { label: "Primary contact", placeholder: "Head of Treasury" },
    revenueRange: { label: "Revenue range", placeholder: "Choose…" },
  },
  consumerRows: {
    ageRange: { label: "Age range", placeholder: "30 or 25-40" },
    geography: { label: "Geography", placeholder: "City, country, or continent" },
    cryptoExperience: { label: "Crypto experience", placeholder: "Choose…" },
    howTheyFindYou: { label: "How they find you", placeholder: "Twitter, Discord, referrals" },
    holdings: { label: "What they hold", placeholder: "ETH, stablecoins, stocks" },
  },
} as const;

/** One row of a persona table. `max` comes from PROJECT_LIMITS, `options` only for a select. */
export interface PersonaRowSpec<K extends string> {
  key: K;
  label: string;
  placeholder: string;
  kind: "text" | "digits" | "select";
  max: number;
  options?: ReadonlyArray<{ value: string; label: string }>;
}

/** The single row order for the editor, the export, the public page and Review. A function so the limits are read after every module has loaded. */
export function personaRows(audience: "b2b"): ReadonlyArray<PersonaRowSpec<keyof Persona>>;
export function personaRows(audience: "b2c"): ReadonlyArray<PersonaRowSpec<keyof ConsumerPersona>>;
export function personaRows(
  audience: Audience,
): ReadonlyArray<PersonaRowSpec<keyof Persona>> | ReadonlyArray<PersonaRowSpec<keyof ConsumerPersona>> {
  const L = PROJECT_LIMITS;
  const R = PERSONA_COPY.rows;
  const C = PERSONA_COPY.consumerRows;
  if (audience === "b2b")
    return [
      { key: "teamSize", ...R.teamSize, kind: "digits", max: L.personaTeamSize.max },
      { key: "geography", ...R.geography, kind: "text", max: L.personaText.max },
      { key: "industry", ...R.industry, kind: "text", max: L.personaText.max },
      { key: "primaryContact", ...R.primaryContact, kind: "text", max: L.personaText.max },
      { key: "revenueRange", ...R.revenueRange, kind: "select", max: 20, options: REVENUE_RANGE_OPTIONS },
    ] satisfies ReadonlyArray<PersonaRowSpec<keyof Persona>>;
  return [
    { key: "ageRange", ...C.ageRange, kind: "digits", max: L.personaAgeRange.max },
    { key: "geography", ...C.geography, kind: "text", max: L.personaText.max },
    { key: "cryptoExperience", ...C.cryptoExperience, kind: "select", max: 20, options: CRYPTO_EXPERIENCE_OPTIONS },
    { key: "howTheyFindYou", ...C.howTheyFindYou, kind: "text", max: L.personaText.max },
    { key: "holdings", ...C.holdings, kind: "text", max: L.personaText.max },
  ] satisfies ReadonlyArray<PersonaRowSpec<keyof ConsumerPersona>>;
}

/** The cells of one persona as label and value pairs, empty cells left out. Selects show their option label. */
export function personaRowCells<T extends { [K in keyof T]: string }>(
  rows: ReadonlyArray<PersonaRowSpec<keyof T & string>>,
  p: T,
): Array<{ label: string; value: string }> {
  return rows
    .map((row) => {
      const raw = (p[row.key] as string).trim();
      const value = row.kind === "select" && raw ? (row.options?.find((o) => o.value === raw)?.label ?? raw) : raw;
      return { label: row.label, value };
    })
    .filter((c) => c.value);
}

export function personaCells(p: Persona): Array<{ label: string; value: string }> {
  return personaRowCells(personaRows("b2b"), p);
}

export function consumerPersonaCells(p: ConsumerPersona): Array<{ label: string; value: string }> {
  return personaRowCells(personaRows("b2c"), p);
}

/** The filled persona cards for the audience in force, one cell list per card. */
export function audiencePersonaCards(
  doc: Pick<ProjectDoc, "audience" | "personas" | "consumerPersonas">,
): Array<Array<{ label: string; value: string }>> {
  const audience = docAudience(doc);
  if (audience === "b2c") return filledConsumerPersonas(doc).map(consumerPersonaCells);
  if (audience === "b2b") return filledPersonas(doc).map(personaCells);
  return [];
}

export const PAYER_OPTIONS: Array<{ value: Payer; label: string }> = [
  { value: "user", label: "The user pays" },
  { value: "third_party", label: "Someone else pays" },
];

export const ORACLE_USE_OPTIONS: Array<{ value: OracleUse; label: string }> = [
  { value: "none", label: "No oracles" },
  { value: "uses", label: "Uses oracles" },
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
    "sentence in mind. Every \"not yet\" is a live risk you're choosing to " +
    "publish, and readers will weigh it exactly that way.",
  lock_funds:
    "A bug can lock funds. Recovery plans and monitoring matter more than " +
    "usual. Say honestly where they stand.",
  misprice:
    "A bug can misprice. Oracles and monitoring are your blast radius. " +
    "Declare where they stand.",
  nothing_serious:
    "Low blast radius is a fine answer. Declare the basics and move on.",
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
    "Markets, Inc.; listing here is not a channel to its users either.",
  ack: "I understand there is no built-in distribution and no Robinhood affiliation.",
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
  { value: "none", label: "No distribution, creator holds supply" },
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
  "work stands; nothing more is stored.";

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
      "A tiny circulating float makes the quoted price nearly meaningless. A " +
      "small buy moves it violently up, the first unlock moves it violently " +
      "down, and holders discover the fully-diluted valuation was the real " +
      "number all along. Low float + high FDV is the most common launch " +
      "structure that ends badly.",
    example:
      "Worked example: 3% float at a $10M FDV means $300k of real tokens set " +
      "the price for the other $9.7M. When the month-6 cliff releases 15%, " +
      "supply grows 6× at once. The chart does the rest. By comparison, a 15% " +
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
      "12-month cliff / 24-month vest. The team can sell for six months " +
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
      "If the sale doesn't fill, something happens by default, and default " +
      "outcomes are the worst ones. A half-funded treasury, an accidental " +
      "low-float launch, or a quiet cancellation that burns trust. Decide " +
      "now whether to proceed, refund, or postpone.",
    example:
      "Worked example: a 1,000 ETH hard-cap sale raises 180 ETH. Proceed " +
      "anyway → you launch with 18% of planned runway and the same promises. " +
      "Refund → buyers are whole and you re-scope. Postpone → you keep " +
      "optionality. All three beat finding out live.",
  },
  rationale_unsure: {
    title: "Does this actually need a token?",
    body:
      "The honest fit test. If a database row, a Stripe account, or a " +
      "points table would do the same job, the token adds regulatory " +
      "surface, sell pressure, and a second product to run, and removes " +
      "nothing. Loyalty-style rewards are the classic false positive. " +
      "There is a respectable exit here. Build the product, list it on " +
      "CanHav as a project, and skip the token until it earns its place.",
    example:
      "Worked example: \"users earn tokens for referrals\" is a points " +
      "column. \"LPs stake the token to underwrite risk and get slashed on " +
      "bad debt\" cannot be a database row; the token is doing economic " +
      "work a ledger entry can't.",
  },
};

// ---------------------------------------------------------------------------
// Facts shown, not asked — rendered with a Blockscout link to the contract.

export const GOVERNANCE_FACTS = [
  "Cannot be minted after deployment",
  "Cannot be paused, frozen, or blacklisted",
  "Cannot be upgraded. No proxy, no owner",
  "Source pre-verified. The factory clones a verified implementation",
] as const;

export const MARKET_FACTS = [
  "Venue and pairing are platform-fixed. Token ⇄ ETH on the launch AMM",
  "Trading fee of 0.30% to LPs. The opt-in protocol fee is split 70/30 project/platform, enforced in bytecode",
  "A locked LP position still accrues trading fees to its owner",
] as const;

// ---------------------------------------------------------------------------
// Page copy

export const STUDIO_COPY = {
  kicker: "Studio",
  title: "Ideation",
  subtitle:
    "Ship a DeFi product that is researched before it is launched. Start " +
    "with a token design grounded in real constraints and published " +
    "tradeoffs; project records and agent launches follow on the same rails.",
  /** Draft rows only. Published records are unpublished from their editor first. */
  delete: {
    action: "Delete",
    confirm: (name: string) => `Delete the draft ${name}? This cannot be undone.`,
    yes: "Delete draft",
    no: "Keep",
    busy: "Deleting",
    failed: "Could not delete this draft. Reload and try again.",
  },
  /** Launched-token lines on the studio Projects row and the launch list (M19d). */
  launch: {
    launched: "Token launched",
    fromProject: "From",
  },
} as const;

/** Agent changes panel on a project's studio page, and the stale draft notice (M39). */
export const AGENT_COPY = {
  title: "Agent changes",
  /** Anchor the MCP guide scrolls to. */
  anchor: "agent-changes",
  /** Window event the MCP guide fires after it changes the mode. */
  modeEvent: "canhav:agent-mode",
  body: "An agent connected to this project over MCP can fill in the project, tick build steps and edit the linked token design. You decide how. Agents never publish.",
  modeLabel: "How agents write",
  modes: [
    { value: "propose", label: "Propose changes" },
    { value: "direct", label: "Write directly" },
    { value: "off", label: "Off" },
  ],
  modeHints: {
    propose: "Each change waits here until you accept or reject it.",
    direct: "Changes land in the draft at once and are listed here.",
    off: "Agents can read this project and change nothing.",
  },
  unavailable: "Agent changes open once the database update for them has run.",
  pending: "Waiting for you",
  nonePending: "No changes are waiting.",
  history: "Earlier changes",
  acceptAll: "Accept all",
  acceptSelected: (n: number, m: number) => `Accept ${n} of ${m}`,
  rejectAll: "Reject all",
  nothingSelected: "Nothing is selected. Tick a line to accept it, or reject all.",
  lineHint: "Untick a line to leave it out. Edit a value before you accept it.",
  notApplied: "Not applied",
  proposed: "Proposed",
  applied: "Applied",
  edited: "Edited",
  decision: (applied: number, total: number, edited: number) =>
    applied === total && edited === 0
      ? "Applied as proposed"
      : `${applied} of ${total} applied${edited ? `, ${edited} edited` : ""}`,
  unparseable: "This proposal no longer matches what agents may change, so it can only be rejected.",
  invalidDecision: "This decision cannot be applied.",
  busy: "Working",
  was: "Was",
  now: "Now",
  empty: "Empty",
  targets: { project: "Project", token_design: "Token design" },
  kinds: { fields: "Fields", build_steps: "Build steps" },
  statuses: {
    proposed: "Proposed",
    applied: "Written by agent",
    accepted: "Accepted",
    rejected: "Rejected",
  },
  failed: "Could not update this change. Reload and try again.",
  modeFailed: "Could not save the setting. Reload and try again.",
  tokenAccepted: "Accepted. The token design draft has the change.",
  stale:
    "This draft changed outside this editor, so saving is paused. Reload to see the latest. Edits made here since the change are not saved.",
  reload: "Reload",
} as const;

/** The three launch tracks, in launch order: tokens, then projects, then agents. */
export const STUDIO_TRACKS = {
  token: {
    title: "Token Design",
    description: "Design, sanity-check, and launch a token backed by research.",
    cta: "Start a token design",
    ctaWorking: "Creating a draft...",
  },
  projects: {
    title: "Projects",
    description: "A published record of what you are building, token optional.",
    cta: "Start a project",
    ctaWorking: "Creating a draft...",
  },
  agents: {
    title: "Agents Launch",
    description: "Register and verify onchain agents for your product.",
    note: "Coming soon. Opens after Projects.",
  },
} as const;

export const ENFORCEMENT_COPY = {
  enforced: "Enforced on-chain",
  enforcedHint: "Written into the contract at deployment. Cannot be changed by anyone.",
  stated: "Stated by team",
  statedHint: "Published commitments. Not enforced by the contract.",
} as const;

/** Shown where allocations are entered (P4: stated vs enforced, in the form). */
export const ALLOCATION_ENFORCEMENT_NOTE =
  "Allocations are recorded in the design and shown on your public page. " +
  "On-chain, the factory sends the entire supply to the deployer minus the " +
  "optional vesting slice; only vesting parameters are enforced by contract.";
