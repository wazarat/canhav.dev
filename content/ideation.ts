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
import type { WaivableField } from "@/lib/ideation";
import type { ProjectChain } from "@/lib/chains";
import { chainOptions } from "@/lib/chains";
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
 * open one milestone at a time (M62 onward) by flipping `available`, which
 * is the one switch for the studio cards, the shapes offered and the agent
 * write rules. A project picks one or more. Retired ids from the earlier
 * eleven-sector list are remapped in lib/ideation.ts.
 */
export const SECTOR_OPTIONS: Array<GatedOption<Sector>> = [
  {
    value: "credit_lending",
    label: "Credit",
    title: "Credit sector application",
    sentence: "I am looking to let users lend, borrow, or earn yield on their assets.",
  },
  {
    value: "staking",
    label: "Staking",
    title: "Staking sector application",
    sentence: "I am looking to let holders stake, restake or earn on what they already hold.",
    
  },
  {
    value: "liquidity_infra",
    label: "Liquidity",
    title: "Liquidity sector application",
    sentence: "I am looking to put assets to work through vaults and pools.",
  },
  {
    value: "perps_derivatives",
    label: "Derivatives",
    title: "Derivatives sector application",
    sentence: "I am looking to let users trade leverage, options or hedged exposure.",
    
  },
  {
    value: "rwa_infra",
    label: "RWA",
    title: "RWA sector application",
    sentence: "I am looking to bring stocks, credit or reserve-backed assets on-chain as tokens.",
    
  },
  {
    value: "other",
    label: "Other",
    title: "Other sector application",
    sentence: "I am looking to build cover, underwriting or governance around a protocol.",
  },
];

/** True when the sector can be picked today. */
export function sectorOpen(sector: Sector): boolean {
  return SECTOR_OPTIONS.find((o) => o.value === sector)?.available !== false;
}

/** The labels of the sectors that are not open yet, in option order. */
export function closedSectorLabels(): string[] {
  return SECTOR_OPTIONS.filter((o) => o.available === false).map((o) => o.label);
}

/**
 * Subsectors per sector, in SECTOR_SUBSECTORS order. Pick one to three per
 * sector (Other may pick none and describe itself instead). A subsector is
 * open when its sector is, see ALL_SUBSECTOR_OPTIONS.
 */
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
  staking: [
    {
      value: "liquid_staking",
      label: "Liquid staking",
      sentence: "I am looking to let holders stake and keep a liquid token they can use elsewhere.",
    },
    {
      value: "restaking",
      label: "Restaking",
      sentence: "I am looking to let already staked assets secure a second service for extra reward.",
    },
    {
      value: "liquid_restaking",
      label: "Liquid restaking",
      sentence: "I am looking to issue one liquid token backed by positions restaked across services.",
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
  perps_derivatives: [
    {
      value: "perp_dex",
      label: "Perp DEX",
      sentence: "I am looking to let users trade perpetuals with leverage against a pool or a book.",
    },
    {
      value: "option_vaults",
      label: "Option vaults",
      sentence: "I am looking to run a vault that writes or buys options for depositors on a schedule.",
    },
    {
      value: "delta_neutral",
      label: "Delta neutral",
      sentence: "I am looking to earn funding or basis for depositors while the price risk is hedged away.",
    },
  ],
  rwa_infra: [
    {
      value: "tokenized_securities",
      label: "Tokenized securities",
      sentence: "I am looking to issue or build on tokens that track stocks, funds or bonds.",
    },
    {
      value: "private_credit",
      label: "Private credit",
      sentence: "I am looking to pool lender capital into loans to named borrowers off-chain.",
    },
    {
      value: "asset_backed_tokens",
      label: "Asset-backed tokens",
      sentence: "I am looking to issue a token backed one to one by a reserve someone attests.",
    },
  ],
  other: [
    {
      value: "underwriting",
      label: "Underwriting",
      sentence: "I am looking to pool capital that pays out when a defined event happens.",
    },
    {
      value: "governance",
      label: "Governance",
      sentence: "I am looking to give holders a vote and a treasury the vote controls.",
    },
  ],
};

/**
 * Every subsector option, sector by sector, for label lookups and picker
 * order. A subsector of a sector that is not open yet reads `available:
 * false` here, so offeredShapes and the agent rules gate on the sector flag.
 */
export const ALL_SUBSECTOR_OPTIONS: Array<GatedOption<Subsector>> = SECTOR_OPTIONS.flatMap((s) =>
  (SUBSECTOR_OPTIONS_BY_SECTOR[s.value] ?? []).map((o) =>
    s.available === false ? { ...o, available: false } : o,
  ),
);

/** The subsector chips a chosen sector shows, or none. */
export function subsectorOptionsFor(sector: Sector): Array<GatedOption<Subsector>> {
  return SUBSECTOR_OPTIONS_BY_SECTOR[sector] ?? [];
}

export const SECTOR_COPY = {
  label: "Sector",
  hint: "Pick every sentence that fits.",
  /** Under the sector cards, naming the sectors that are not open yet. Empty once every sector is open. */
  moreSoon: (closed: readonly string[]) =>
    closed.length === 0
      ? ""
      : closed.length === 1
        ? `${closed[0]} opens soon.`
        : `${closed.slice(0, -1).join(", ")} and ${closed[closed.length - 1]} open soon.`,
  subsectorLabel: "Subsector",
  subsectorHint: "Pick every sentence that fits, up to three per sector. Each opens its own research workflow.",
  /** Under the Other card's text field. */
  otherLabel: "Anything else about the sector?",
  otherHint: "Optional once a subsector is picked. A few words on what the product is.",
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

/** The team's own files, by reference (M53). */
export const REFERENCES_COPY = {
  label: "Project files",
  hint: "Specs, diagrams, audits, spreadsheets, anything your build leans on. Give a link or a path on your own machine. Nothing is uploaded and none of this is published. Your agent sees the list through the MCP server and the draft exports.",
  titleLabel: "File title",
  titlePlaceholder: "Rate model spec",
  locationLabel: "Link or local path",
  locationPlaceholder: "https://... or ~/docs/rate-model.md",
  noteLabel: "What it is for",
  notePlaceholder: "What it is for (optional)",
  link: "Link",
  local: "Local file",
  add: "Add a file",
  remove: (title: string) => `Remove ${title || "this file"}`,
  removeTitle: "Remove this file",
  limit: (max: number) => `At most ${max} files.`,
  evidenceLabel: "Evidence handle",
  evidencePlaceholder: "Evidence handle, an REA evidence id or a test name (optional)",
  exportTitle: "Your files",
  exportIntro:
    "Files the team keeps for this project. A local path is on the team's machine, so open it only when you are working there.",
} as const;

/** The logo on a project or a token design (M90). */
export const LOGO_COPY = {
  label: "Logo",
  projectHint: "PNG, JPG, WEBP or GIF, up to 4 MB. Shown on the studio, the public page and the Explore board. Your agent can set it with set_logo.",
  designHint: "PNG, JPG, WEBP or GIF, up to 4 MB. Becomes the token image when you launch from this design, and shows on the public page and the Explore board. Your agent can set it with set_logo.",
  uploading: "Uploading",
  failed: "The image could not be uploaded.",
  fileName: "Uploaded logo",
  designLogo: "The design's logo",
  alt: (name: string) => `${name || "Untitled"} logo`,
} as const;

/** Testnet contracts as labelled rows and the address book link (M83). */
export const TESTNET_COPY = {
  contractsLabel: "Testnet contract addresses",
  contractsHint:
    "A label and an address per contract, up to a hundred. We read deploy history from the chain. The addresses are the claim, the chain is the evidence. Your agent can record them with update_project.",
  labelPlaceholder: "Vault",
  addressPlaceholder: "0x…",
  labelField: "Contract label",
  addressField: "Contract address",
  add: "Add a contract",
  remove: (label: string) => `Remove ${label || "this contract"}`,
  removeTitle: "Remove this contract",
  edit: "Edit",
  done: "Done",
  limit: (max: number) => `At most ${max} testnet contracts.`,
  addressBookLabel: "Address book",
  addressBookHint: "https only. The file or explorer list that holds every deployed address, for a deployment larger than this list.",
  exportAddressBook: "Address book",
} as const;

/** The mainnet deployment and the Pons pairing (M70). No colons, no em dashes. */
export const MAINNET_COPY = {
  label: "Mainnet and Pons pairing",
  hint: "Once the product is live on mainnet, record its contracts beside the testnet launch, name the companion contract built from an accepted template with a Pons fit, and record the Pons launch it is paired with. Published with the project.",
  chainLine: (name: string, chainId: number) => `${name}, chain id ${chainId}`,
  chainHint: "The mainnet this project's chain stands in for. Every address below lives there.",
  contractsLabel: "Mainnet contracts",
  contractsHint: "A label and an address per contract. Verify the source on the explorer; the public page links every address there.",
  labelPlaceholder: "Vault",
  addressPlaceholder: "0x…",
  labelField: "Contract label",
  addressField: "Contract address",
  add: "Add a contract",
  remove: (label: string) => `Remove ${label || "this contract"}`,
  removeTitle: "Remove this contract",
  edit: "Edit",
  done: "Done",
  limit: (max: number) => `At most ${max} mainnet contracts.`,
  companionLabel: "Companion contract",
  companionHint: "The accepted template with a Pons fit the mainnet companion is built from. Accept templates on the Build step first.",
  companionNone: "No accepted template on this project's steps carries a Pons fit. Accept one on the Build step and it appears here.",
  companionClear: "No companion",
  ponsLabel: "Pons launch",
  ponsHint: "The token launched on Pons that the companion contract is paired with, and the address its creator fees are paid to.",
  ponsTokenLabel: "Pons token address",
  ponsFeeLabel: "Creator fee recipient",
  ponsOffChain: (chainName: string) =>
    `Pons runs on Robinhood Chain mainnet. This project builds on ${chainName}, so there is no Pons pairing to record.`,
  /** The external trading pair (M78). */
  pairLabel: "Trading pair",
  pairHint:
    "Where the token trades outside CanHav once it is on mainnet. A Pons market, a Pools or Uniswap pool, or another venue, with the asset it is quoted in and the link people trade at. Shown on the token page and the public page.",
  pairVenueLabel: "Venue",
  pairVenuePlaceholder: "Choose a venue",
  pairVenueClear: "No pair recorded",
  pairQuoteLabel: "Quote asset",
  pairQuoteHint: "A symbol such as ETH or USDC, or the token's address.",
  pairQuotePlaceholder: "ETH, USDC or 0x…",
  pairAddressLabel: "Pair or pool address",
  pairAddressHint: "Optional.",
  pairUrlLabel: "Trade link",
  pairUrlPlaceholder: "https://",
  pairLine: (venue: string, quote: string) => `Trades on ${venue} against ${quote}`,
  pairTrade: (venue: string) => `Trade on ${venue}`,
  pairAddressLine: "Pair address",
  /** Read-only surfaces. */
  panelTitle: "Mainnet",
  panelNone: "No mainnet contracts recorded yet. Add them on the Reality step once the product is live.",
  publicTitle: "Mainnet",
  publicLead: (name: string) => `Contracts the team recorded on ${name}. Addresses are the claim, the explorer is the evidence.`,
  companionLine: (name: string) => `Companion contract built from ${name}`,
  ponsLine: "Paired with a Pons launch",
  feeLine: "Creator fees paid to",
  exportTitle: "Mainnet and Pons pairing",
} as const;

/**
 * The chain a project builds on (M52). Its token launch follows it. Picked
 * from a dropdown since M148, Robinhood testnet first and the default,
 * Arbitrum Sepolia second and marked beta with the note below it.
 */
export const CHAIN_COPY = {
  label: "Chain",
  hint: "Where you build and test. A token launched from this project goes on the same chain.",
  locked: "A token has launched from this project, so its chain is fixed.",
  options: chainOptions(),
  /** Under the field while a beta chain is picked, and in get_project_status and AGENTS.md for the agent. */
  betaNote: (name: string) =>
    `${name} is in beta. Funding the deployer key is harder there, since most faucets want mainnet ETH on the address first. Pons and Pools run on Robinhood Chain mainnet only. Some protocols in the kits have no ${name} deployment, so your team or its agent deploys or mocks them. Expect to fix a few things yourselves.`,
} as const;

/** The misconception this platform refuses to let stand quietly. */
/** The one line that stays visible above the Security declarations; the pressure text sits behind it (M76). */
export const WORST_CASE_WHY = "Why this matters";

/** The Review step's publishing line, with the longer explanation behind the info icon (M76). */
export const PUBLISH_COPY = {
  project: {
    line: "Publishing makes this page public and snapshots it.",
    more: "Every version is kept, and the latest renders at your public URL.",
  },
  token: {
    line: "Publishing makes this design public and snapshots it.",
    more: "Deploying from a published design commits its hash on chain, making the design tamper evident forever.",
  },
} as const;

export const ROBINHOOD_MYTH = {
  title: "A reality check before you publish",
  body:
    "Robinhood Chain does not provide distribution to Robinhood brokerage " +
    "customers. Deploying here puts your app in front of nobody by default. " +
    "CanHav is an independent project with no affiliation with Robinhood " +
    "Markets, Inc.; listing here is not a channel to its users either.",
  ack: "I understand there is no built-in distribution and no Robinhood affiliation.",
  /** The lead above the first hundred users field on a Robinhood project only (M139). */
  followUp: "So where will your first hundred users actually come from?",
} as const;

/** The first hundred users field on every chain (M139); the Robinhood lead sits above it where it applies. */
export const FIRST_HUNDRED_LABEL = "Where will your first hundred users come from?";

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
  rationale_shape_mismatch: {
    title: "The reason does not fit the product shape",
    body:
      "The project linked to this design builds a shape where this reason for a token rarely holds up. The advice on the Rationale step lists the reasons that fit and what a token for that shape should lock. Pick one of those, or write down in the next field why this product is the exception.",
    example:
      "Worked example: an earn feature inside a wallet picks Bootstrapping a supply side. The vaults it routes to already have suppliers, so the emissions would pay for nothing. Fee capture on the cut the app keeps is the reason that fits.",
  },
  launch_target_off_chain: {
    title: "The launch venue is not on this project's chain",
    body:
      "The venue this design ideates for runs on Robinhood Chain mainnet, and the project linked to this design builds on Arbitrum Sepolia, which stands in for Arbitrum One. The testnet launch on the CanHav curve is unaffected. Taking the design to that venue afterwards would need a Robinhood Chain project, or a different venue. Advisory only; it never blocks publishing.",
    example:
      "Worked example: a design picks Pons while its project builds on Arbitrum Sepolia. The team launches on the CanHav curve on Arbitrum Sepolia as planned, then either starts a Robinhood Chain project for the mainnet launch or switches the venue to the CanHav curve.",
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

/** The market name check (M116), plain text under a name or ticker field. */
export const NAME_CHECK_COPY = {
  /** The chain lines (M139) name the design's mainnet, not Robinhood by default. */
  notFound: (label: string, mainnet: string) => `${label} not found on ${mainnet} or CanHav.`,
  notFoundUnavailable: (label: string, mainnet: string) => `${label} not found on CanHav. The ${mainnet} check is unavailable right now.`,
  inUse: (mainnet: string) => `Already in use on ${mainnet} by`,
  inUseTail: ". Duplicates are legal on a permissionless chain, but buyers will have to tell them apart.",
  unavailable: (mainnet: string) => `The ${mainnet} check is unavailable right now.`,
  listed: (name: string, symbol: string, source: string) => `A coin named ${name} (${symbol}) is listed on ${source}.`,
  sources: { coingecko: "CoinGecko", dexscreener: "DexScreener" },
  open: "Open",
  note: "Names are not unique, so this never blocks. Buyers will have to tell them apart.",
} as const;

export const STUDIO_COPY = {
  kicker: "Studio",
  /** The drafts list on the studio home (M91). The track itself is called Studio, so the list is not. */
  inProgress: "In progress",
  /** The nav switcher on studio routes (M92). The plan word is the product name, Studio or Studio+. */
  switcher: {
    studio: "Studio",
    plus: "+",
    projects: "Projects",
    designs: "Token designs",
    newProject: "New project",
    home: "Studio home",
    loading: "Loading",
    empty: "Nothing yet",
    untitled: "Untitled",
    open: "Switch project or design",
    current: "Current",
  },
  subtitle:
    "Start a project, build it with your agent over MCP, publish the record " +
    "and launch its token when you are ready. Everything you have started is " +
    "below.",
  /** Draft rows only. Published records are unpublished from their editor first. */
  delete: {
    action: "Delete",
    confirm: (name: string) => `Delete the draft ${name}? This cannot be undone.`,
    yes: "Delete draft",
    no: "Keep",
    busy: "Deleting",
    failed: "Could not delete this draft. Reload and try again.",
    /** The API refuses a record whose token has launched (M75). */
    launched: "This record has a launched token, so it stays. Unlink the launch first if it should go.",
  },
  /** Agent activity on a studio project row (M79). */
  agent: {
    proposed: (n: number) => (n === 1 ? "1 proposed" : `${n} proposed`),
    wrote: (date: string) => `Agent wrote ${date}`,
    /** The live session on a row (M86). */
    working: "Agent working",
    waiting: "Waiting on you",
    failed: "Agent error",
  },
  /** The command menu (M87). */
  command: {
    title: "Command menu",
    placeholder: "Type a command or a name",
    empty: "Nothing matches.",
    hintMac: "⌘K",
    hintOther: "Ctrl K",
    hintTitle: "Open the command menu",
    groups: {
      create: "Create",
      go: "Go to",
      open: "Open",
      project: "This project",
    },
    newProject: "New project",
    newProjectHint: "Name, sector, chain and logo in four steps",
    newDesign: "New token design",
    newDesignHint: "A blank design draft",
    studio: "Studio home",
    launches: "Launches",
    templates: "Contract templates",
    openProject: (name: string) => `Project ${name || "Untitled"}`,
    openDesign: (name: string) => `Token design ${name || "Untitled"}`,
    step: (label: string) => `Go to ${label}`,
    copyMcp: "Copy the MCP add command",
    copyMcpHint: "claude mcp add for this project's server",
    copied: "Copied",
    agentGuide: "Open the agent guide",
    reviewChanges: "Review agent changes",
    loading: "Loading your records",
  },
  /** Launched-token lines on the studio Projects row and the launch list (M19d). */
  launch: {
    launched: "Token launched",
    fromProject: "From",
  },
  /** The studio home summary and the launches page (M75). */
  launches: {
    title: "Launches",
    /** The collapsed summary line. */
    /** Only this account's launches, the ones made while signed in and the ones its verified wallets created. */
    summary: (count: number, newest: string | null) =>
      count === 1
        ? `You have launched 1 token${newest ? `, ${newest}` : ""}`
        : `You have launched ${count} tokens${newest ? `, newest ${newest}` : ""}`,
    viewAll: "View all launches",
    viewAllHint: "Opens in a new tab",
    launchOne: "Start from a project",
    none: "No launches yet. Launch a token while signed in and it appears here and in get_my_launches.",
    pageTitle: "Your launches",
    pageSubtitle:
      "Every token launched from this account, then the projects still in progress. " +
      "Launched records leave the studio home lists and live here.",
    inProgress: "Projects in progress",
    inProgressEmpty: "Every project has launched, or there are none yet.",
    chainFilter: "Chain",
    allChains: "All chains",
    launchedChip: "Launched",
    draftsNote: (projects: number) =>
      `${projects} launched project${projects === 1 ? " is" : "s are"} listed under Launches.`,
  },
  /** The services offer for small teams, under the account row (2026-10-09). */
  pro: {
    join: "Join Studio Pro",
  },
  /** Move a personal project to the active team (M107). */
  moveToTeam: {
    action: "Move to team",
    confirm: (name: string, team: string) => `Move ${name} to ${team}? Every member of the team can then open and edit it, its token design and its launches. The record keeps you as its creator.`,
    yes: "Move",
    no: "Keep personal",
    busy: "Moving",
    done: "Moved to the team.",
    failed: "Could not move this project. Reload and try again.",
    /** The button is hidden until the session has a team; this hint sits in the account menu. */
    hint: "Switch to a team to move projects into it.",
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
  dependsOnEarlier: "This change builds on proposals above it. Accept those first.",
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
  /** The notice in the editor when an agent proposes or writes (M79). */
  toast: {
    proposed: (n: number) => (n === 1 ? "The agent proposed 1 change." : `The agent proposed ${n} changes.`),
    written: (n: number) =>
      n === 1 ? "The agent wrote 1 change to the draft." : `The agent wrote ${n} changes to the draft.`,
    waiting: (n: number) =>
      n === 1 ? "1 agent change is waiting for you." : `${n} agent changes are waiting for you.`,
    review: "Review",
    dismiss: "Dismiss",
    /** The agent session moved (M86). */
    session: {
      waiting: "The agent is waiting on you.",
      finished: "The agent finished its run.",
      failed: "The agent stopped with an error.",
    },
  },
  /** The live session card at the top of Agent changes (M86). */
  session: {
    title: "Agent session",
    hint: "What the connected agent says it is doing. It reports a plan before it starts, after each step and when it finishes. A session that stops reporting reads as stale after thirty minutes.",
    none: "No agent has reported a session on this project yet.",
    states: {
      working: "Working",
      awaiting_input: "Waiting on you",
      done: "Done",
      error: "Error",
      stale: "Stale",
    },
    untitled: "Untitled run",
    plan: "Plan",
    planProgress: (done: number, total: number) => `${done} of ${total}`,
    planStatus: {
      pending: "Pending",
      in_progress: "In progress",
      done: "Done",
      canceled: "Canceled",
    },
    updated: (when: string) => `Reported ${when}`,
    link: "Open the work",
    justNow: "just now",
    minutesAgo: (n: number) => (n === 1 ? "1 minute ago" : `${n} minutes ago`),
    hoursAgo: (n: number) => (n === 1 ? "1 hour ago" : `${n} hours ago`),
    daysAgo: (n: number) => (n === 1 ? "1 day ago" : `${n} days ago`),
  },
  unparseable: "This proposal no longer matches what agents may change, so it can only be rejected.",
  invalidDecision: "This decision cannot be applied.",
  busy: "Working",
  was: "Was",
  now: "Now",
  empty: "Empty",
  targets: { project: "Project", token_design: "Token design" },
  kinds: { fields: "Fields", build_steps: "Build steps", create: "Started", link: "Launch link", prospects: "Prospects" },
  statuses: {
    proposed: "Proposed",
    applied: "Written by agent",
    accepted: "Accepted",
    rejected: "Rejected",
    withdrawn: "Withdrawn by agent",
  },
  failed: "Could not update this change. Reload and try again.",
  modeFailed: "Could not save the setting. Reload and try again.",
  tokenAccepted: "Accepted. The token design draft has the change.",
  stale:
    "This draft changed outside this editor, so saving is paused. Reload to see the latest. Edits made here since the change are not saved.",
  reload: "Reload",
} as const;

/** The milestone list on the Post-launch step of a token design (M48). */
export const POST_LAUNCH_MILESTONE_COPY = {
  add: "Add milestones",
  remove: "Remove the milestones",
  heading: "Milestones",
  stepProblem: "Milestones incomplete",
  /** Review step hints. */
  missing:
    "Add milestones in the Post-launch step so a launch from this design can hold sales, escrow and progress updates.",
  republish:
    "The published snapshot does not carry these milestones. Publish again so it does. A launch commits the published snapshot, not the draft.",
  launched:
    "The launched token committed a snapshot without milestones. Publishing again changes the design page, not the launch.",
} as const;

/** The three launch tracks, in launch order: tokens, then projects, then agents. */
/** The one track card on the studio home (2026-10-18). The token design and agents launch cards left the home. */
export const STUDIO_TRACKS = {
  projects: {
    title: "Start a project",
    description: "Name it, pick a sector, build it with your agent and publish the record. A token is optional and starts from the project.",
    cta: "Start a project",
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

// ---------------------------------------------------------------------------
// Recommended fields and waivers (M130)

/** The recommended fields of the record, as the readiness list and the public page name them. */
export const WAIVABLE_FIELD_LABELS: Record<WaivableField, string> = {
  subsectors: "Subsector",
  sectorOther: "Sector description",
  contracts: "Contracts",
  externalDeps: "External dependencies",
  oracles: "Oracles",
  adminFunctions: "Admin functions",
  upgradeability: "Upgradeability",
  worstCase: "Worst case",
  audit: "Audit",
  bugBounty: "Bug bounty",
  monitoring: "Monitoring",
  incidentResponse: "Incident response",
  keyCustody: "Key custody",
  firstHundredUsers: FIRST_HUNDRED_LABEL,
};

/** How a recommended field reads when it is empty or waived. Commas, never a colon. */
export const FIELD_STATE_COPY = {
  notStated: "Not stated",
  none: "None",
  noneYet: "None yet",
  /** The explicit choice for admin functions (M154), stated as a strength. */
  adminNone: "None. The contracts are immutable and have no admin functions.",
  notApplicable: (reason: string) => `Not applicable, ${reason}`,
  /** The link under a recommended field. */
  markNa: "Does not apply",
  applies: "Applies after all",
  edit: "Edit the reason",
  reasonLabel: "Why it does not apply",
  reasonPlaceholder: "One line. It publishes with the record.",
  save: "Save",
  cancel: "Cancel",
  /** Above the readiness rows. */
  recommended: (n: number) =>
    n === 0
      ? "Every recommended field is stated or marked not applicable."
      : n === 1
        ? "1 recommended field is not stated. It publishes as Not stated."
        : `${n} recommended fields are not stated. Each publishes as Not stated.`,
  /** The sentence on a public page under a field the team did not state. */
  publicNote: "Recommended fields the team left open read as Not stated.",
} as const;

/** The token design editor since M131, essentials first. */
export const TOKEN_EDITOR_COPY = {
  /** The fold under each section holding the optional answers and the reading. */
  more: "More",
  moreHint: "Optional answers and background. Your agent can fill any of these over MCP.",
  /** The post launch answers, under Governance since M131. */
  postLaunch: "After launch",
  postLaunchLead: "All optional, but the teams that can answer these tend to still be here in two years.",
} as const;
