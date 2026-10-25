import { CANVAS_BLOCKS, CANVAS_LIMITS, type Canvas, normalizeCanvas } from "@/lib/canvas";
import { type Icp, icpListSchema, normalizeIcp } from "@/lib/icp";
import { type Competitors, normalizeCompetitors } from "@/lib/competitors/record";
import { type DraftRequest, type Drafted, normalizeDraftRequests, normalizeDrafted } from "@/lib/draft/requests";
import { type AgentRequest, normalizeAgentRequests } from "@/lib/agent-requests";
import { ASSET_LIMITS, type AssetEntry, cleanSymbol, isAssetRole, normalizeAssets } from "@/lib/assets";
import { type Economics, normalizeEconomics } from "@/lib/economics";
import { type Reach, type ReachProtocol, normalizeReach, normalizeReachProtocols } from "@/lib/reach";
import { EXPERIMENT_LIMITS, type Experiment, normalizeExperiments } from "@/lib/experiments";
import { isItemId } from "@/lib/canvas-items";
import { type Briefs, normalizeBriefs } from "@/lib/draft/briefs";
import { cutAtWord } from "@/lib/text";
import { PROFILE_KEYS, VALUE_AREAS, VALUE_CANVAS_LIMITS, type ValueCanvases, normalizeValueCanvases } from "@/lib/value-canvas";
import { type TeamSafe, normalizeTeamSafe } from "@/lib/safe";
import { type Brand, normalizeBrand } from "@/lib/brand/record";
import { type InvestorPack, normalizeInvestorPack } from "@/lib/investor-pack";
import { type UpdateCadence, isUpdateCadence } from "@/lib/updates";
import { type GithubSync, normalizeGithubSync } from "@/lib/sync/github";
import { keccak256, stringToBytes } from "viem";

import { PROJECT_CHAIN_INFO, type ProjectChain, isProjectChain, projectChainOf } from "@/lib/chains";
import { type LaunchTarget, type PairVenue, isLaunchTarget, isPairVenue, pairVenueFits } from "@/lib/launch-targets";
import {
  kitsForSectors,
  normalizeProjectKit,
  type ProductShape,
  type ProjectKit,
  validateProjectKit,
} from "@/lib/kits";
import { type JourneyMilestone, sortValue, validateMilestones } from "@/lib/journey";
import { isStoredImageUrl } from "@/lib/image-url";
import {
  LEGACY_SECTOR_MAP,
  SECTOR_SUBSECTORS,
  SECTOR_VALUES,
  SUBSECTOR_VALUES,
  type Sector,
  type Subsector,
  docSectors,
  sectorOfSubsector,
  withSectors } from "@/lib/sectors";
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
export const UPGRADEABILITY_VALUES: readonly Upgradeability[] = ["immutable", "upgradeable_proxy", "partially", "undecided"];

export type WorstCase = "lose_funds" | "lock_funds" | "misprice" | "nothing_serious";
export const WORST_CASE_VALUES: readonly WorstCase[] = ["lose_funds", "lock_funds", "misprice", "nothing_serious"];

export type Payer = "user" | "third_party";

export type OracleUse = "none" | "uses";
export const ORACLE_USE_VALUES: readonly OracleUse[] = ["none", "uses"];

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
  /** Values of the rows the team picked that this table does not hold natively (M187), keyed by detail key. */
  extra?: Record<string, string>;
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
  /** Values of the rows the team picked that this table does not hold natively (M187), keyed by detail key. */
  extra?: Record<string, string>;
}

/**
 * The details a persona row can record (M187): every column of both tables,
 * so a B2C project may record an industry and a B2B one what they hold, plus
 * up to five of the team's own, keyed custom.<n>. A row's pick applies to
 * every persona of the table.
 */
export const PERSONA_DETAIL_KEYS = ["teamSize", "geography", "industry", "primaryContact", "revenueRange", "ageRange", "cryptoExperience", "howTheyFindYou", "holdings"] as const;
export type PersonaDetailKey = (typeof PERSONA_DETAIL_KEYS)[number];
export const CUSTOM_PERSONA_KEY = /^custom\.[1-9]$/;

/** One row of the persona table: the detail it records and the name the team gave it. */
export interface PersonaField {
  key: string;
  label: string;
}

export function isPersonaFieldKey(key: string): boolean {
  return (PERSONA_DETAIL_KEYS as readonly string[]).includes(key) || CUSTOM_PERSONA_KEY.test(key);
}

const NATIVE: Record<Audience, readonly string[]> = {
  b2b: ["teamSize", "geography", "industry", "primaryContact", "revenueRange"],
  b2c: ["ageRange", "geography", "cryptoExperience", "howTheyFindYou", "holdings"],
};

/** A persona's value for a row's detail (M187): its own column, else the extra map. */
export function personaCell(p: object, key: string): string {
  const own = (p as Record<string, unknown>)[key];
  if (key !== "extra" && typeof own === "string") return own;
  return (p as { extra?: Record<string, string> }).extra?.[key] ?? "";
}

/** The persona with one row's value written (M187), to its own column when the table has one. */
export function withPersonaCell<T extends object>(p: T, key: string, value: string, audience: Audience): T {
  if (NATIVE[audience].includes(key)) return { ...p, [key]: value };
  const extra = { ...((p as { extra?: Record<string, string> }).extra ?? {}) };
  if (value) extra[key] = value;
  else delete extra[key];
  const { extra: _e, ...rest } = p as T & { extra?: unknown };
  return (Object.keys(extra).length ? { ...rest, extra } : rest) as T;
}

const extraFilled = (p: { extra?: Record<string, string> }) => Object.values(p.extra ?? {}).some((v) => v.trim());

export function emptyConsumerPersona(): ConsumerPersona {
  return { ageRange: "", geography: "", cryptoExperience: "", howTheyFindYou: "", holdings: "" };
}

export function isEmptyConsumerPersona(p: ConsumerPersona): boolean {
  return !(
    extraFilled(p) ||
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
    extraFilled(p) ||
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

/** One contract the project has or plans, with why it exists (M153, F11). */
export interface ContractEntry {
  name: string;
  why: string;
}

/** A subsector the team adds itself (M182), id "csub.<n>". `closest` is one of ours under the same sector. */
export interface CustomSubsector {
  id: string;
  sector: Sector;
  title: string;
  detail: string;
  closest?: Subsector;
}

/** One admin function with why it exists (M154, F12), the contract it lives on and who can call it. */
export interface AdminFunctionEntry extends ContractEntry {
  /** The name of a contracts row it lives on, optional. */
  contract?: string;
  /** Who can call it, free text such as "Team Safe 2 of 3" or "Timelock, 1 day". */
  holder?: string;
}

/**
 * Rows of name and why (M153): trimmed, cut at a word, a row without a name
 * or a why drops, capped. A string (the answer from before M153) is not
 * parsed; the caller keeps it as the legacy text. Pure.
 */
export function normalizeWhyEntries<T extends ContractEntry>(raw: unknown, max: number, keep?: (row: T, o: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(raw)) return [];
  const L = PROJECT_LIMITS;
  const out: T[] = [];
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const name = typeof o.name === "string" ? cutAtWord(o.name.trim(), L.whyEntryName.max) : "";
    const why = typeof o.why === "string" ? cutAtWord(o.why.trim(), L.whyEntryWhy.max) : "";
    if (!name && !why) continue;
    let row = { name, why } as T;
    if (keep) row = keep(row, o);
    out.push(row);
    if (out.length >= max) break;
  }
  return out;
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
  /** A handle that justifies a claim, an REA evidence id, a test name, a commit (M83). */
  evidence?: string;
}

/** True when a reference points at the web rather than a local path. */
export function referenceIsLink(r: Pick<ProjectReference, "location">): boolean {
  return /^https?:\/\/\S+$/.test(r.location.trim());
}

/**
 * The agent's account of the project (M104): what is built and what is
 * being built, a few lines each, written over MCP with set_summary and
 * read on the Overview. Stays on the draft and out of the published
 * snapshot, like references.
 */
export interface ProjectSummary {
  built: string[];
  building: string[];
  /** ISO time of the last write. */
  updatedAt: string;
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
  /** What the team wants each picked sector to be (M182), one short line per sector. Optional, never injected. */
  sectorNotes?: Partial<Record<Sector, string>>;
  /**
   * Subsectors the team adds itself (M182), each under a sector, with the
   * closest of ours, whose contract templates and modules it borrows.
   * Optional, never injected.
   */
  customSubsectors?: CustomSubsector[];
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
   * The rows of the persona table per audience (M187): which detail each of
   * the five rows records and the name the team gave it. Absent means the
   * audience's default rows. Optional, never injected.
   */
  personaFields?: Partial<Record<Audience, PersonaField[]>>;
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
    /** One row per contract with why it exists (M153). */
    contracts: ContractEntry[];
    /** The honest "None yet" (M153), like externalDepsNone. */
    contractsNone: boolean;
    /** The free text answer from before M153, kept readable until the team or its agent splits it into rows. Optional, never injected. */
    contractsLegacy?: string;
    /** External dependencies, one entry per contract/protocol, each linkable. */
    externalDeps: ExternalDep[];
    /** Explicit "no external dependencies" is a first-class answer. */
    externalDepsNone: boolean;
    /** Gate: oracles text is required only when "uses". Optional field. */
    oracleUse: OracleUse | "";
    /** The oracles as text, one line per oracle; kept in step with oracleRows (M182) for older readers. */
    oracles: string;
    /** One row per oracle and what it prices (M182). Optional, never injected. */
    oracleRows?: ContractEntry[];
    /** One row per admin function with why it exists (M154). */
    adminFunctions: AdminFunctionEntry[];
    /** The explicit choice that the contracts are immutable and have no admin functions (M154), a strength on the public page. */
    adminFunctionsNone: boolean;
    /** The free text answer from before M154, kept readable until split into rows. Optional, never injected. */
    adminFunctionsLegacy?: string;
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
  /** Where the first hundred users come from. */
  firstHundredUsers: string;
  /**
   * Recommended fields the team marked not applicable, with the reason
   * (M130). Optional and never injected; published as plain text. A stated
   * value wins over a waiver. Read with fieldState() in lib/project-fields.
   */
  waived?: Partial<Record<WaivableField, string>>;
  githubRepo?: string;
  /** The product's website, https only (M78). Shown on the public page. */
  website?: string;
  /**
   * Testnet contracts, lowercase hex with an optional label (M83). Older
   * docs hold plain strings; read them with testnetContractRows(). Feed the
   * verify signals.
   */
  testnetContracts?: Array<TestnetContract | string>;
  /** Where the full address book lives, https only (M83). A file in the repo, an explorer list. */
  addressBook?: string;
  /** The project's logo on CanHav's image store (M90). Optional, never injected. */
  logo?: string;
  /** The agent's summary (M104). Optional, never injected, never published. */
  summary?: ProjectSummary;
  /** The Business Model Canvas (M113, Studio+). Optional, never injected, published with the record. */
  canvas?: Canvas;
  /** Ideal customer profiles (M114, Studio+), one or two. Optional, never injected, published with the record. */
  icp?: Icp[];
  /** The competitor line and the map's state (M115, Studio+). Optional, never injected; only the line is published. */
  competitors?: Competitors;
  /** The brand kit (M118, Studio+). Optional, never injected, published with the record. */
  brand?: Brand;
  /** The Value Proposition Canvas per ideal customer profile (M157, Studio+ under icp). Optional, never injected. */
  valueCanvas?: ValueCanvases;
  /** The assets the idea depends on (M162, Studio+ under viability), the base of the dependency check. Optional, never injected, published with the record. */
  assets?: AssetEntry[];
  /** The unit economics scenarios (M166, Studio+ under viability). Optional, never injected, stripped at publish. */
  economics?: Economics;
  /** Experiments (M170, Studio+ under viability). Optional, never injected; the finished ones publish with the record. */
  experiments?: Experiment[];
  /** The last reachable wallets read per ideal customer profile (M168, Studio+ under icp). Optional, never injected, stripped at publish. */
  reach?: Reach;
  /** Protocol contracts the team or its agent adds to the reach parameters (M168). Optional, never injected, stripped at publish. */
  reachProtocols?: ReachProtocol[];
  /** The investor and grant pack (M126, Studio+). Optional, never injected, stripped at publish. */
  investorPack?: InvestorPack;
  /** How often the team posts an update (Studio+). Optional, never injected, stripped at publish; weekly when absent. */
  updateCadence?: UpdateCadence;
  /** The last GitHub sync (M120). Optional, never injected, never published. */
  githubSync?: GithubSync;
  /** Draft requests waiting for the agent (M117). Optional, never injected, never published. */
  draftRequests?: DraftRequest[];
  /** Requests for the agent that are not drafts (M151): make the deployer key, work a build step. Optional, never injected, never published. */
  agentRequests?: AgentRequest[];
  /** Who drafted each Studio+ field (M117). Optional, never injected, never published. */
  drafted?: Drafted;
  /** The team's answers before each draft (M142), per kind. Owner written, optional, never injected, never published. */
  briefs?: Briefs;
  /** Declared team wallet (unproven — labeled "declared by team" in UI). */
  verifyWallet?: string;
  /** The team Safe (M160, Studio+ teams), owners and threshold read onchain. Optional, never injected, written by the studio only. Published. */
  teamSafe?: TeamSafe;
  /**
   * The throwaway deployer key's address, lowercase hex (M102). The private
   * key never reaches CanHav; it lives in the repository's env file. Optional
   * and never injected. One address serves both testnets.
   */
  deployer?: string;
  /** Who recorded the deployer address (M151): the agent over MCP or the owner in the studio. Optional, never injected. */
  deployerBy?: "agent" | "owner";
  /**
   * Where the deployer key lives in the repository (M138), relative to its
   * root, for example packages/contracts/.env. Optional and never injected;
   * absent reads as .env at the contracts root. Stripped at publish.
   */
  deployerEnvFile?: string;
  /**
   * The mainnet deployment beside the testnet launch and the Pons pairing
   * (M70). Optional and never injected; a project without one hashes as
   * before. Published with the record, unlike `references`.
   */
  mainnet?: MainnetRecord;
}

/** Who recorded a testnet contract (M150): the team's agent over MCP, the owner in the studio, or the GitHub sync. */
export const CONTRACT_RECORDED_BY = ["agent", "owner", "sync"] as const;
export type ContractRecordedBy = (typeof CONTRACT_RECORDED_BY)[number];

/** One testnet contract, labelled by the team or its agent (M83). CanHav deploys none of them. */
export interface TestnetContract {
  /** Lowercase hex. */
  address: string;
  label?: string;
  /** Provenance (M150), set by the server on the path that recorded the row, never accepted from outside. */
  recordedBy?: ContractRecordedBy;
  /** ISO time the row was first recorded (M150). */
  recordedAt?: string;
}

function isRecordedBy(v: unknown): v is ContractRecordedBy {
  return typeof v === "string" && (CONTRACT_RECORDED_BY as readonly string[]).includes(v);
}

/**
 * Stamp incoming contract rows with their provenance (M150): a row whose
 * address is already stored keeps the stamp it has, including none (it was
 * recorded before stamps existed, by someone else), and only a new address
 * is stamped with `by` and now. Pure; the agent apply, the studio and the
 * sync call it. Stamps sent from outside are dropped.
 */
export function stampContracts(stored: readonly TestnetContract[], incoming: readonly TestnetContract[], by: ContractRecordedBy, now = new Date().toISOString()): TestnetContract[] {
  const known = new Map(stored.map((r) => [r.address.toLowerCase(), r] as const));
  return incoming.map((r) => {
    const { recordedBy: _b, recordedAt: _a, ...rest } = r;
    const cur = known.get(r.address.toLowerCase());
    if (cur) return { ...rest, ...(cur.recordedBy ? { recordedBy: cur.recordedBy } : {}), ...(cur.recordedAt ? { recordedAt: cur.recordedAt } : {}) };
    return { ...rest, recordedBy: by, recordedAt: now };
  });
}

/** The testnet contracts as rows, whether the doc stores strings or rows. */
/** The summary's lines as stored, each trimmed and capped, or null when nothing survives. */
export function normalizeProjectSummary(raw: unknown): ProjectSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const L = PROJECT_LIMITS.summary;
  const lines = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.trim().slice(0, L.textMax))
          .filter((x) => x.length >= L.textMin)
          .slice(0, L.lines)
      : [];
  const r = raw as { built?: unknown; building?: unknown; updatedAt?: unknown };
  const built = lines(r.built);
  const building = lines(r.building);
  if (!built.length && !building.length) return null;
  const updatedAt = typeof r.updatedAt === "string" && !Number.isNaN(Date.parse(r.updatedAt)) ? r.updatedAt : new Date().toISOString();
  return { built, building, updatedAt };
}

export function testnetContractRows(doc: Pick<ProjectDoc, "testnetContracts">): TestnetContract[] {
  return (doc.testnetContracts ?? []).map((c) => {
    if (typeof c === "string") return { address: c };
    const row: TestnetContract = c.label?.trim() ? { address: c.address, label: c.label.trim() } : { address: c.address };
    if (isRecordedBy(c.recordedBy)) row.recordedBy = c.recordedBy;
    if (typeof c.recordedAt === "string" && c.recordedAt) row.recordedAt = c.recordedAt;
    return row;
  });
}

/** One deployed contract on the mainnet, labelled by the team. */
export interface MainnetContract {
  label: string;
  /** Lowercase hex. */
  address: string;
}

export interface MainnetRecord {
  /** The mainnet chain id, always the one the project's chain stands in for (4663 or 42161). */
  chainId: number;
  contracts: MainnetContract[];
  /** The accepted template with a Pons fit the companion contract is built from, a catalog id. */
  companionTemplate?: string;
  /** The Pons launch paired with the companion, Robinhood Chain mainnet only. */
  pons?: {
    tokenAddress: string;
    feeRecipient: string;
  };
  /** An external trading pair the team recorded (M78). */
  pair?: MainnetPair;
}

/**
 * Where the token trades outside CanHav (M78): a Pons market, a Pools or
 * Uniswap pool, or another venue. The pair lives on the mainnet the record's
 * chain id names. Shown on the token page, the project page and the launch
 * panel, with the trade link.
 */
export interface MainnetPair {
  venue: PairVenue;
  /** A symbol (1 to 12 characters) or a lowercase hex token address. */
  quoteAsset: string;
  /** The pair or pool contract, lowercase hex. Optional. */
  pairAddress?: string;
  /** Where to trade it, https only. */
  url: string;
}

export const PROJECT_LIMITS = {
  name: { min: 3, max: 60 },
  sectorOther: { max: 60 },
  /** A picked sector's note and the subsectors a team adds (M182). */
  sectorNote: { max: 200 },
  customSubsectors: { max: 12, titleMin: 3, titleMax: 60, detailMax: 200 },
  sectors: { min: 1, max: SECTOR_VALUES.length },
  /** Per sector that asks for them. */
  subsectors: { min: 1, max: 3 },
  whatItDoes: { min: 80, max: 1200 },
  /** Optional answers, so no minimum. */
  userIs: { max: 400 },
  whoPays: { max: 400 },
  whyThisChain: { max: 800 },
  personas: { min: 1, max: 3 },
  /** The persona table's rows (M187): five, each named by the team. */
  personaFields: { count: 5, labelMax: 40 },
  personaText: { max: 80 },
  personaTeamSize: { max: 12 },
  personaAgeRange: { max: 12 },
  architectureField: { min: 4, max: 800 },
  externalDeps: { max: 12 },
  /** Contracts and admin functions as rows (M153, M154). */
  whyEntries: { max: 30 },
  whyEntryName: { min: 2, max: 80 },
  whyEntryWhy: { min: 10, max: 300 },
  /** The holder of an admin function (M154). */
  adminHolder: { max: 80 },
  externalDepName: { min: 2, max: 80 },
  externalDepUrl: { max: 200 },
  firstHundredUsers: { min: 40, max: 600 },
  website: { max: 200 },
  testnetContracts: { max: 100 },
  addressBook: { max: 200 },
  /** The agent's summary (M104), lines per list and characters per line. */
  summary: { lines: 12, textMin: 3, textMax: 160 },
  pairQuoteAsset: { min: 1, max: 12 },
  pairUrl: { max: 200 },
  mainnetContracts: { max: 20 },
  mainnetLabel: { min: 1, max: 60 },
  references: { max: 40 },
  referenceTitle: { min: 2, max: 80 },
  referenceLocation: { min: 1, max: 300 },
  referenceNote: { max: 200 },
  referenceEvidence: { max: 120 },
  /** The reason a recommended field does not apply (M130). */
  waiver: { min: 3, max: 200 },
  /** The deployer key's env file path (M138). */
  deployerEnvFile: { max: 200 },
} as const;

/**
 * The recommended fields (M130): everything that blocked publishing before
 * M130 except the name, the sector, what it does, the stage and the
 * Robinhood acknowledgement. Each can be waived with a short reason.
 */
export const WAIVABLE_FIELDS = [
  "subsectors",
  "sectorOther",
  "contracts",
  "externalDeps",
  "oracles",
  "adminFunctions",
  "upgradeability",
  "worstCase",
  "audit",
  "bugBounty",
  "monitoring",
  "incidentResponse",
  "keyCustody",
  "firstHundredUsers",
] as const;

export type WaivableField = (typeof WAIVABLE_FIELDS)[number];

export function isWaivableField(value: unknown): value is WaivableField {
  return typeof value === "string" && (WAIVABLE_FIELDS as readonly string[]).includes(value);
}

/**
 * Bring a stored ProjectDoc (possibly written by an older client) up to the
 * current shape. Idempotent; applied at every read choke point in
 * lib/ideation-db.ts and before publish stamping.
 */
/** The oracle rows as text, one line per oracle (M182), for readers from before the rows. */
export function oracleRowsText(rows: readonly ContractEntry[]): string {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => (r.why.trim() ? `${r.name.trim()}, ${r.why.trim()}` : r.name.trim()))
    .join("\n");
}

/** The oracle rows to edit (M182): the stored rows, else one row per line of an older text answer. */
export function oracleRowsOf(a: Pick<ProjectDoc["architecture"], "oracles" | "oracleRows">): ContractEntry[] {
  if (a.oracleRows?.length) return a.oracleRows;
  return a.oracles
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((name) => ({ name: name.slice(0, PROJECT_LIMITS.whyEntryName.max), why: "" }));
}

/** Sector notes and custom subsectors, cleaned (M182). Unknown sectors and a closest outside its sector are dropped. */
function sectorExtrasOf(doc: Record<string, unknown>): Pick<ProjectDoc, "sectorNotes" | "customSubsectors"> {
  const out: Pick<ProjectDoc, "sectorNotes" | "customSubsectors"> = {};
  // Only the sectors the project is in keep a note or own subsectors, as unticking a sector drops its subsectors.
  const picked = new Set(docSectors(doc as { sector: Sector | ""; sectors?: Sector[] }));
  if (doc.sectorNotes && typeof doc.sectorNotes === "object" && !Array.isArray(doc.sectorNotes)) {
    const notes: Partial<Record<Sector, string>> = {};
    for (const [k, v] of Object.entries(doc.sectorNotes as Record<string, unknown>))
      if (picked.has(k as Sector) && typeof v === "string" && v.trim()) notes[k as Sector] = v.trim().slice(0, PROJECT_LIMITS.sectorNote.max);
    if (Object.keys(notes).length) out.sectorNotes = notes;
  }
  if (Array.isArray(doc.customSubsectors)) {
    const L = PROJECT_LIMITS.customSubsectors;
    const list: CustomSubsector[] = [];
    for (const raw of doc.customSubsectors as unknown[]) {
      if (!raw || typeof raw !== "object") continue;
      const c = raw as Record<string, unknown>;
      if (typeof c.id !== "string" || !/^csub\.[0-9]{1,4}$/.test(c.id) || list.some((x) => x.id === c.id)) continue;
      if (!picked.has(c.sector as Sector) || typeof c.title !== "string" || c.title.trim().length < L.titleMin) continue;
      if (list.length >= L.max) break;
      const sector = c.sector as Sector;
      const closest = typeof c.closest === "string" && SECTOR_SUBSECTORS[sector].includes(c.closest as Subsector) ? (c.closest as Subsector) : undefined;
      list.push({ id: c.id, sector, title: c.title.trim().slice(0, L.titleMax), detail: typeof c.detail === "string" ? c.detail.trim().slice(0, L.detailMax) : "", ...(closest ? { closest } : {}) });
    }
    if (list.length) out.customSubsectors = list;
  }
  return out;
}

/** Add a subsector of the team's own under a sector (M182). */
export function addCustomSubsector(doc: Pick<ProjectDoc, "customSubsectors">, input: { sector: Sector; title: string; detail?: string; closest?: Subsector }): Pick<ProjectDoc, "customSubsectors"> {
  const L = PROJECT_LIMITS.customSubsectors;
  const list = doc.customSubsectors ?? [];
  if (list.length >= L.max) return { customSubsectors: list };
  const n = list.map((c) => Number(c.id.slice(5)) || 0).reduce((a, b) => Math.max(a, b), 0) + 1;
  const closest = input.closest && SECTOR_SUBSECTORS[input.sector].includes(input.closest) ? input.closest : undefined;
  return {
    customSubsectors: [...list, { id: `csub.${n}`, sector: input.sector, title: input.title.trim().slice(0, L.titleMax), detail: (input.detail ?? "").trim().slice(0, L.detailMax), ...(closest ? { closest } : {}) }],
  };
}

/** A stored persona's extra map (M187): known detail keys the table does not hold natively, short strings. */
function extraOf(v: Record<string, unknown>, audience: Audience): Pick<Persona, "extra"> {
  if (!v.extra || typeof v.extra !== "object" || Array.isArray(v.extra)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v.extra as Record<string, unknown>))
    if (isPersonaFieldKey(k) && !NATIVE[audience].includes(k) && typeof val === "string" && val.trim()) out[k] = val.slice(0, PROJECT_LIMITS.personaText.max);
  return Object.keys(out).length ? { extra: out } : {};
}

/** The stored persona rows (M187), cleaned; absent or empty drops the key. */
function personaFieldsOf(raw: unknown): Pick<ProjectDoc, "personaFields"> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Partial<Record<Audience, PersonaField[]>> = {};
  for (const a of AUDIENCE_VALUES) {
    const list = (raw as Record<string, unknown>)[a];
    if (!Array.isArray(list)) continue;
    const seen = new Set<string>();
    const rows: PersonaField[] = [];
    for (const f of list) {
      if (!f || typeof f !== "object") continue;
      const { key, label } = f as Record<string, unknown>;
      if (typeof key !== "string" || !isPersonaFieldKey(key) || seen.has(key) || typeof label !== "string" || !label.trim()) continue;
      seen.add(key);
      rows.push({ key, label: label.trim().slice(0, PROJECT_LIMITS.personaFields.labelMax) });
      if (rows.length >= PROJECT_LIMITS.personaFields.count) break;
    }
    if (rows.length) out[a] = rows;
  }
  return Object.keys(out).length ? { personaFields: out } : {};
}

export function normalizeProjectDoc(raw: ProjectDoc): ProjectDoc {
  const doc = raw as ProjectDoc & {
    architecture: ProjectDoc["architecture"] & { externalDeps: ExternalDep[] | string; contracts: ContractEntry[] | string; adminFunctions: AdminFunctionEntry[] | string };
  };
  const a = doc.architecture ?? ({} as (typeof doc)["architecture"]);

  // Contracts (M153): rows of name and why. A stored string is the answer
  // from before M153; it is kept as the legacy text, never parsed.
  const rawArchContracts = a.contracts;
  const contractsLegacy =
    typeof rawArchContracts === "string" && rawArchContracts.trim()
      ? cutAtWord(rawArchContracts.trim(), PROJECT_LIMITS.architectureField.max)
      : typeof a.contractsLegacy === "string" && a.contractsLegacy.trim()
        ? cutAtWord(a.contractsLegacy.trim(), PROJECT_LIMITS.architectureField.max)
        : undefined;
  const contracts = normalizeWhyEntries<ContractEntry>(rawArchContracts, PROJECT_LIMITS.whyEntries.max);
  const contractsNone = a.contractsNone === true && contracts.length === 0;

  // Admin functions (M154): the same shape, plus the contract it lives on and who holds it.
  const rawAdmin = a.adminFunctions;
  const adminFunctionsLegacy =
    typeof rawAdmin === "string" && rawAdmin.trim()
      ? cutAtWord(rawAdmin.trim(), PROJECT_LIMITS.architectureField.max)
      : typeof a.adminFunctionsLegacy === "string" && a.adminFunctionsLegacy.trim()
        ? cutAtWord(a.adminFunctionsLegacy.trim(), PROJECT_LIMITS.architectureField.max)
        : undefined;
  const adminFunctions = normalizeWhyEntries<AdminFunctionEntry>(rawAdmin, PROJECT_LIMITS.whyEntries.max, (row, o) => {
    const contract = typeof o.contract === "string" && o.contract.trim() ? o.contract.trim().slice(0, PROJECT_LIMITS.whyEntryName.max) : undefined;
    const holder = typeof o.holder === "string" && o.holder.trim() ? o.holder.trim().slice(0, PROJECT_LIMITS.adminHolder.max) : undefined;
    return { ...row, ...(contract ? { contract } : {}), ...(holder ? { holder } : {}) };
  });
  const adminFunctionsNone = a.adminFunctionsNone === true && adminFunctions.length === 0;

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

  // Oracles as rows (M182); the text follows the rows when there are any.
  const oracleRows: ContractEntry[] = Array.isArray(a.oracleRows)
    ? (a.oracleRows as unknown[])
        .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
        .map((r) => ({ name: typeof r.name === "string" ? r.name.slice(0, PROJECT_LIMITS.whyEntryName.max) : "", why: typeof r.why === "string" ? r.why.slice(0, PROJECT_LIMITS.whyEntryWhy.max) : "" }))
        .filter((r) => r.name.trim() || r.why.trim())
        .slice(0, PROJECT_LIMITS.whyEntries.max)
    : [];
  const oracles = oracleRows.length ? oracleRowsText(oracleRows) : typeof a.oracles === "string" ? a.oracles : "";
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
          ...extraOf(v, "b2b"),
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
          ...extraOf(v, "b2c"),
        })),
    };
  }
  // The persona rows (M187): known detail keys only, each once, names cut, five at most per audience.
  const fieldsPatch = personaFieldsOf((doc as { personaFields?: unknown }).personaFields);
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
      const evidence = typeof r.evidence === "string" && r.evidence.trim() ? r.evidence.trim().slice(0, L.referenceEvidence.max) : undefined;
      refs.push({
        title: r.title.slice(0, L.referenceTitle.max),
        location: r.location.slice(0, L.referenceLocation.max),
        note: typeof r.note === "string" ? r.note.slice(0, L.referenceNote.max) : "",
        ...(evidence ? { evidence } : {}),
      });
    }
    (rest as { references?: ProjectReference[] }).references = refs;
  }
  // Testnet contracts (M83): strings lift to rows, garbage drops, the key is never invented.
  const rawContracts = (rest as { testnetContracts?: unknown }).testnetContracts;
  if (rawContracts !== undefined) {
    const L = PROJECT_LIMITS;
    const rows: TestnetContract[] = [];
    for (const v of Array.isArray(rawContracts) ? (rawContracts as unknown[]) : []) {
      if (rows.length >= L.testnetContracts.max) break;
      if (typeof v === "string") {
        if (v.trim()) rows.push({ address: v.trim().toLowerCase() });
        continue;
      }
      if (!v || typeof v !== "object") continue;
      const c = v as Record<string, unknown>;
      if (typeof c.address !== "string" || !c.address.trim()) continue;
      const label = typeof c.label === "string" && c.label.trim() ? c.label.trim().slice(0, L.mainnetLabel.max) : undefined;
      // Provenance (M150): a known author and a parseable time survive, anything else drops.
      const recordedBy = isRecordedBy(c.recordedBy) ? c.recordedBy : undefined;
      const recordedAt = typeof c.recordedAt === "string" && c.recordedAt.length <= 40 && !Number.isNaN(Date.parse(c.recordedAt)) ? c.recordedAt : undefined;
      rows.push({ address: c.address.trim().toLowerCase(), ...(label ? { label } : {}), ...(recordedBy ? { recordedBy } : {}), ...(recordedAt ? { recordedAt } : {}) });
    }
    if (rows.length) (rest as { testnetContracts?: TestnetContract[] }).testnetContracts = rows;
    else delete (rest as { testnetContracts?: unknown }).testnetContracts;
  }
  if ("logo" in rest) {
    const v = (rest as { logo?: unknown }).logo;
    if (typeof v === "string" && isStoredImageUrl(v.trim())) (rest as { logo?: string }).logo = v.trim();
    else delete (rest as { logo?: unknown }).logo;
  }
  if ("addressBook" in rest) {
    const v = (rest as { addressBook?: unknown }).addressBook;
    if (typeof v === "string" && v.trim()) (rest as { addressBook?: string }).addressBook = v.trim().slice(0, PROJECT_LIMITS.addressBook.max);
    else delete (rest as { addressBook?: unknown }).addressBook;
  }
  // Summary (M104): lines cleaned and capped, dropped when nothing is left, never invented.
  if ("summary" in rest) {
    const clean = normalizeProjectSummary((rest as { summary?: unknown }).summary);
    if (clean) (rest as { summary?: ProjectSummary }).summary = clean;
    else delete (rest as { summary?: unknown }).summary;
  }
  // GitHub sync (M120): the last run, cleaned, dropped when malformed.
  if ("githubSync" in rest) {
    const clean = normalizeGithubSync((rest as { githubSync?: unknown }).githubSync);
    if (clean) (rest as { githubSync?: GithubSync }).githubSync = clean;
    else delete (rest as { githubSync?: unknown }).githubSync;
  }
  // Brand (M118): hexes checked, fonts and tone words capped, dropped when empty.
  if ("brand" in rest) {
    const clean = normalizeBrand((rest as { brand?: unknown }).brand);
    if (clean) (rest as { brand?: Brand }).brand = clean;
    else delete (rest as { brand?: unknown }).brand;
  }
  // Update cadence: one of the four values, dropped otherwise.
  if ("updateCadence" in rest) {
    const v = (rest as { updateCadence?: unknown }).updateCadence;
    if (isUpdateCadence(v)) (rest as { updateCadence?: UpdateCadence }).updateCadence = v;
    else delete (rest as { updateCadence?: unknown }).updateCadence;
  }
  // Investor pack (M126): texts capped, programmes and questions checked, dropped when empty.
  if ("investorPack" in rest) {
    const clean = normalizeInvestorPack((rest as { investorPack?: unknown }).investorPack);
    if (clean) (rest as { investorPack?: InvestorPack }).investorPack = clean;
    else delete (rest as { investorPack?: unknown }).investorPack;
  }
  // Draft requests and drafted marks (M117): cleaned, dropped when empty, never invented.
  if ("valueCanvas" in rest) {
    const clean = normalizeValueCanvases((rest as { valueCanvas?: unknown }).valueCanvas);
    if (clean) (rest as { valueCanvas?: ValueCanvases }).valueCanvas = clean;
    else delete (rest as { valueCanvas?: unknown }).valueCanvas;
  }
  if ("draftRequests" in rest) {
    const clean = normalizeDraftRequests((rest as { draftRequests?: unknown }).draftRequests);
    if (clean) (rest as { draftRequests?: DraftRequest[] }).draftRequests = clean;
    else delete (rest as { draftRequests?: unknown }).draftRequests;
  }
  if ("agentRequests" in rest) {
    const clean = normalizeAgentRequests((rest as { agentRequests?: unknown }).agentRequests);
    if (clean) (rest as { agentRequests?: AgentRequest[] }).agentRequests = clean;
    else delete (rest as { agentRequests?: unknown }).agentRequests;
  }
  // Experiments (M170) read the canvases, so they normalize after them.
  if ("experiments" in rest) {
    const clean = normalizeExperiments((rest as { experiments?: unknown }).experiments, rest as { canvas?: Canvas; valueCanvas?: ValueCanvases });
    if (clean.length) (rest as { experiments?: Experiment[] }).experiments = clean;
    else delete (rest as { experiments?: unknown }).experiments;
  }
  if ("reach" in rest) {
    const clean = normalizeReach((rest as { reach?: unknown }).reach);
    if (clean) (rest as { reach?: Reach }).reach = clean;
    else delete (rest as { reach?: unknown }).reach;
  }
  if ("reachProtocols" in rest) {
    const clean = normalizeReachProtocols((rest as { reachProtocols?: unknown }).reachProtocols);
    if (clean.length) (rest as { reachProtocols?: ReachProtocol[] }).reachProtocols = clean;
    else delete (rest as { reachProtocols?: unknown }).reachProtocols;
  }
  if ("economics" in rest) {
    const clean = normalizeEconomics((rest as { economics?: unknown }).economics);
    if (clean) (rest as { economics?: Economics }).economics = clean;
    else delete (rest as { economics?: unknown }).economics;
  }
  if ("assets" in rest) {
    const clean = normalizeAssets((rest as { assets?: unknown }).assets);
    if (clean.length) (rest as { assets?: AssetEntry[] }).assets = clean;
    else delete (rest as { assets?: unknown }).assets;
  }
  if ("teamSafe" in rest) {
    const clean = normalizeTeamSafe((rest as { teamSafe?: unknown }).teamSafe);
    if (clean) (rest as { teamSafe?: TeamSafe }).teamSafe = clean;
    else delete (rest as { teamSafe?: unknown }).teamSafe;
  }
  if ("deployerBy" in rest) {
    const v = (rest as { deployerBy?: unknown }).deployerBy;
    if (v !== "agent" && v !== "owner") delete (rest as { deployerBy?: unknown }).deployerBy;
  }
  if ("drafted" in rest) {
    const clean = normalizeDrafted((rest as { drafted?: unknown }).drafted);
    if (clean) (rest as { drafted?: Drafted }).drafted = clean;
    else delete (rest as { drafted?: unknown }).drafted;
  }
  // Briefs (M142): known questions only, answers capped, dropped when empty.
  if ("briefs" in rest) {
    const clean = normalizeBriefs((rest as { briefs?: unknown }).briefs);
    if (clean) (rest as { briefs?: Briefs }).briefs = clean;
    else delete (rest as { briefs?: unknown }).briefs;
  }
  // Competitors (M115): the line capped, the map state checked, dropped when empty.
  if ("competitors" in rest) {
    const clean = normalizeCompetitors((rest as { competitors?: unknown }).competitors);
    if (clean) (rest as { competitors?: Competitors }).competitors = clean;
    else delete (rest as { competitors?: unknown }).competitors;
  }
  // ICP (M114): profiles cleaned and capped, dropped when empty, never invented.
  if ("icp" in rest) {
    const clean = normalizeIcp((rest as { icp?: unknown }).icp);
    if (clean) (rest as { icp?: Icp[] }).icp = clean;
    else delete (rest as { icp?: unknown }).icp;
  }
  // Canvas (M113): blocks trimmed and capped, dropped when empty, never invented.
  if ("canvas" in rest) {
    const clean = normalizeCanvas((rest as { canvas?: unknown }).canvas);
    if (clean) (rest as { canvas?: Canvas }).canvas = clean;
    else delete (rest as { canvas?: unknown }).canvas;
  }
  // Deployer address (M102): lowercased when it is an address, dropped otherwise, never invented.
  if ("deployer" in rest) {
    const v = (rest as { deployer?: unknown }).deployer;
    const clean = typeof v === "string" ? v.trim().toLowerCase() : "";
    if (ADDRESS.test(clean)) (rest as { deployer?: string }).deployer = clean;
    else delete (rest as { deployer?: unknown }).deployer;
  }
  // Waivers (M130): known fields with a trimmed reason, dropped when empty, never invented.
  if ("waived" in rest) {
    const raw = (rest as { waived?: unknown }).waived;
    const clean: Partial<Record<WaivableField, string>> = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw))
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!isWaivableField(k) || typeof v !== "string") continue;
        const reason = v.trim().slice(0, PROJECT_LIMITS.waiver.max);
        if (reason) clean[k] = reason;
      }
    if (Object.keys(clean).length) (rest as { waived?: unknown }).waived = clean;
    else delete (rest as { waived?: unknown }).waived;
  }
  // Deployer env file (M138): a relative path, trimmed, dropped when empty or climbing out of the repository.
  if ("deployerEnvFile" in rest) {
    const v = (rest as { deployerEnvFile?: unknown }).deployerEnvFile;
    const clean = typeof v === "string" ? v.trim().replace(/^\/+/, "").slice(0, PROJECT_LIMITS.deployerEnvFile.max) : "";
    if (clean && !clean.split("/").includes("..")) (rest as { deployerEnvFile?: string }).deployerEnvFile = clean;
    else delete (rest as { deployerEnvFile?: unknown }).deployerEnvFile;
  }
  // Chain (M52): kept when it is a known chain, dropped when it is garbage, never invented.
  if ("chain" in rest && !isProjectChain((rest as { chain?: unknown }).chain))
    delete (rest as { chain?: unknown }).chain;
  // Mainnet record (M70): cleaned when the key exists, never invented.
  if ("mainnet" in rest) {
    const clean = normalizeMainnetRecord((rest as { mainnet?: unknown }).mainnet);
    if (clean) (rest as { mainnet?: MainnetRecord }).mainnet = clean;
    else delete (rest as { mainnet?: unknown }).mainnet;
  }

  const out: ProjectDoc = {
    ...(rest as ProjectDoc),
    ...(kit ? { kit } : {}),
    sector,
    ...sectorsPatch,
    ...(sectorOther !== undefined ? { sectorOther } : {}),
    ...subsectorPatch,
    ...personasPatch,
    ...consumerPatch,
    ...fieldsPatch,
    ...audiencePatch,
    payer,
    whoPays,
    architecture: {
      ...a,
      contracts,
      contractsNone,
      ...(contractsLegacy ? { contractsLegacy } : {}),
      adminFunctions,
      adminFunctionsNone,
      ...(adminFunctionsLegacy ? { adminFunctionsLegacy } : {}),
      externalDeps,
      externalDepsNone: a.externalDepsNone === true,
      oracleUse,
      oracles,
      ...(oracleRows.length ? { oracleRows } : {}),
    },
    ...sectorExtrasOf(doc as unknown as Record<string, unknown>),
  };
  if (!oracleRows.length) delete (out.architecture as { oracleRows?: ContractEntry[] }).oracleRows;
  if (!out.sectorNotes) delete (out as { sectorNotes?: unknown }).sectorNotes;
  if (!out.customSubsectors) delete (out as { customSubsectors?: unknown }).customSubsectors;
  // A string answer became rows and legacy text (M153); the key must not linger.
  if (!contractsLegacy) delete (out.architecture as { contractsLegacy?: string }).contractsLegacy;
  if (!adminFunctionsLegacy) delete (out.architecture as { adminFunctionsLegacy?: string }).adminFunctionsLegacy;
  return out;
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
  /** The token's logo on CanHav's image store (M90), the launch form's default image. Optional, never injected. */
  logo?: string;
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
    /**
     * The venue the token is ideated for (M69). Optional and never injected,
     * so a design from before the field hashes the same on republish.
     */
    launchTarget?: LaunchTarget;
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
  /** Evidence per ticked build step, a file, a test, a tx, an REA evidence id (M83). */
  stepEvidence?: Record<string, string>;
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
  /** Evidence lines per build step (M83). */
  evidence: { max: 200, textMax: 200 },
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
/** Evidence lines keyed by step id, trimmed and capped; nothing when empty (M83). */
export function normalizeEvidence(raw: unknown, limits: { max: number; textMax: number }): Record<string, string> | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!k || typeof v !== "string" || !v.trim()) continue;
    if (n >= limits.max) break;
    out[k] = v.trim().slice(0, limits.textMax);
    n += 1;
  }
  return n ? out : undefined;
}

export function normalizeTokenDesignDoc(raw: TokenDesignDoc): TokenDesignDoc {
  const { checklist, stepEvidence, ...rest } = raw as TokenDesignDoc & { checklist?: unknown; stepEvidence?: unknown };
  if ("logo" in rest) {
    const v = (rest as { logo?: unknown }).logo;
    if (typeof v === "string" && isStoredImageUrl(v.trim())) (rest as { logo?: string }).logo = v.trim();
    else delete (rest as { logo?: unknown }).logo;
  }
  const clean = normalizeTokenChecklist(checklist);
  const evidence = normalizeEvidence(stepEvidence, TOKEN_DESIGN_LIMITS.evidence);
  let doc: TokenDesignDoc = {
    ...(rest as TokenDesignDoc),
    ...(clean ? { checklist: clean } : {}),
    ...(evidence ? { stepEvidence: evidence } : {}),
  };
  // An unknown launch venue is dropped, a missing one is never added (M69).
  if (doc.market && "launchTarget" in doc.market && !isLaunchTarget(doc.market.launchTarget)) {
    const { launchTarget: _drop, ...market } = doc.market;
    doc = { ...doc, market };
  }
  return doc;
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
/** A quote asset written as a ticker symbol (ETH, USDC, USDG). */
const QUOTE_SYMBOL = /^[A-Za-z0-9.]{1,12}$/;

/**
 * The first problem with a link, or null. `https` demands the scheme the
 * public page will follow; `http` also accepts plain http (dependency docs).
 */
export function urlProblem(label: string, value: string, max: number, scheme: "https" | "http"): string | null {
  const re = scheme === "https" ? /^https:\/\/\S+$/ : /^https?:\/\/\S+$/;
  if (!re.test(value)) return scheme === "https" ? `${label} must be an https URL.` : `${label} must be an http(s) URL.`;
  if (value.length > max) return `${label} is over ${max} characters.`;
  return null;
}

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
  // An empty status is "not stated" since M130; a value has to be one of the four.
  if (decl.status && !valid.includes(decl.status)) return `${label} has an unknown status.`;
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
  const subsectors = doc.subsectors ?? [];
  if (sectors.includes("other")) {
    // Other may describe itself or pick a subsector (M62). A doc folded from a
    // retired sector id carries the old label in sectorOther and stays valid.
    // Describing the sector or picking a subsector is recommended since M130, not required.
    if ((doc.sectorOther?.length ?? 0) > L.sectorOther.max)
      return `Sector description is over ${L.sectorOther.max} characters.`;
  }
  if (subsectors.some((v) => !SUBSECTOR_VALUES.includes(v))) return "Unknown subsector.";
  for (const sub of subsectors)
    if (!sectors.includes(sectorOfSubsector(sub))) return "A subsector belongs to a sector that is not chosen.";
  for (const sector of sectors) {
    const own = SECTOR_SUBSECTORS[sector];
    if (own.length === 0) continue;
    // A subsector per sector is recommended since M130; only the maximum is checked here.
    const n = subsectors.filter((v) => own.includes(v)).length;
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

  // The contract and security fields are recommended since M130 (see
  // lib/project-fields.ts); only their bounds and shapes are checked here.
  const a = doc.architecture;
  if (a.contracts.length > L.whyEntries.max) return `At most ${L.whyEntries.max} contracts.`;
  for (const row of a.contracts) {
    p = checkText("Contract name", row.name, L.whyEntryName);
    if (p) return p;
    p = checkText("Contract why", row.why, { max: L.whyEntryWhy.max });
    if (p) return p;
  }
  if (a.contractsLegacy !== undefined) {
    p = checkText("Contracts", a.contractsLegacy, { max: L.architectureField.max });
    if (p) return p;
  }
  if (a.externalDeps.length > L.externalDeps.max)
    return `At most ${L.externalDeps.max} external dependencies.`;
  for (const dep of a.externalDeps) {
    p = checkText("Dependency name", dep.name, L.externalDepName);
    if (p) return p;
    if (dep.url) {
      p = urlProblem("Dependency link", dep.url, L.externalDepUrl.max, "http");
      if (p) return p;
    }
  }
  if (a.oracleUse && !ORACLE_USE_VALUES.includes(a.oracleUse)) return "Unknown oracle answer.";
  p = checkText("Oracles", a.oracles, { max: L.architectureField.max });
  if (p) return p;
  if (a.adminFunctions.length > L.whyEntries.max) return `At most ${L.whyEntries.max} admin functions.`;
  for (const row of a.adminFunctions) {
    p = checkText("Admin function name", row.name, L.whyEntryName);
    if (p) return p;
    p = checkText("Admin function why", row.why, { max: L.whyEntryWhy.max });
    if (p) return p;
    if (row.contract && row.contract.length > L.whyEntryName.max) return `An admin function's contract name is over ${L.whyEntryName.max} characters.`;
    if (row.holder && row.holder.length > L.adminHolder.max) return `An admin function's holder is over ${L.adminHolder.max} characters.`;
  }
  if (a.adminFunctionsLegacy !== undefined) {
    p = checkText("Admin functions", a.adminFunctionsLegacy, { max: L.architectureField.max });
    if (p) return p;
  }
  if (a.upgradeability && !UPGRADEABILITY_VALUES.includes(a.upgradeability)) return "Unknown upgradeability answer.";
  if (doc.worstCase && !WORST_CASE_VALUES.includes(doc.worstCase)) return "Unknown worst-case answer.";

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
  p = checkText("First hundred users", doc.firstHundredUsers, { max: L.firstHundredUsers.max });
  if (p) return p;
  if (doc.waived !== undefined) {
    if (!doc.waived || typeof doc.waived !== "object" || Array.isArray(doc.waived)) return "Waivers must be a map of field to reason.";
    for (const [k, v] of Object.entries(doc.waived)) {
      if (!isWaivableField(k)) return `${k} is not a field that can be marked not applicable.`;
      if (typeof v !== "string" || v.trim().length < L.waiver.min) return `The reason ${k} does not apply needs at least ${L.waiver.min} characters.`;
      if (v.length > L.waiver.max) return `The reason ${k} does not apply is over ${L.waiver.max} characters.`;
    }
  }

  if (doc.githubRepo && !/^[\w.-]+\/[\w.-]+$/.test(doc.githubRepo))
    return "GitHub repo must be owner/name.";
  if (doc.website) {
    p = urlProblem("Website", doc.website, L.website.max, "https");
    if (p) return p;
  }
  if (doc.testnetContracts) {
    if (doc.testnetContracts.length > L.testnetContracts.max)
      return `At most ${L.testnetContracts.max} testnet contracts.`;
    for (const c of testnetContractRows(doc)) {
      if (!ADDRESS.test(c.address)) return "Testnet contract addresses must be lowercase hex.";
      if (c.label && c.label.length > L.mainnetLabel.max) return `A testnet contract label is over ${L.mainnetLabel.max} characters.`;
      if (c.recordedBy !== undefined && !isRecordedBy(c.recordedBy)) return "A testnet contract's recordedBy is not agent, owner or sync.";
      if (c.recordedAt !== undefined && (typeof c.recordedAt !== "string" || Number.isNaN(Date.parse(c.recordedAt)))) return "A testnet contract's recordedAt is not a date.";
    }
  }
  if (doc.addressBook) {
    p = urlProblem("Address book", doc.addressBook, L.addressBook.max, "https");
    if (p) return p;
  }
  if (doc.logo && !isStoredImageUrl(doc.logo)) return "Logo must be an image uploaded to CanHav.";
  if (doc.verifyWallet && !ADDRESS.test(doc.verifyWallet))
    return "Team wallet must be a lowercase hex address.";
  if (doc.teamSafe && !normalizeTeamSafe(doc.teamSafe)) return "The team Safe record is malformed.";
  if (doc.economics && !normalizeEconomics(doc.economics)) return "The unit economics record is malformed.";
  if (doc.experiments) {
    if (!Array.isArray(doc.experiments) || doc.experiments.length > EXPERIMENT_LIMITS.max) return `At most ${EXPERIMENT_LIMITS.max} experiments.`;
    for (const e of doc.experiments) {
      if (!isItemId(e?.id)) return "An experiment is missing its id.";
      if (typeof e.hypothesis !== "string" || e.hypothesis.length > EXPERIMENT_LIMITS.text) return `An experiment's hypothesis is over ${EXPERIMENT_LIMITS.text} characters.`;
      if ((e.evidence?.length ?? 0) > EXPERIMENT_LIMITS.evidence.max) return `An experiment holds at most ${EXPERIMENT_LIMITS.evidence.max} pieces of evidence.`;
    }
  }
  if (doc.assets) {
    if (!Array.isArray(doc.assets) || doc.assets.length > ASSET_LIMITS.max) return `At most ${ASSET_LIMITS.max} assets.`;
    for (const a of doc.assets) {
      if (!isItemId(a?.id)) return "An asset is missing its id.";
      if (cleanSymbol(a.symbol) !== a.symbol) return "An asset symbol is not an upper case ticker of at most 12 characters.";
      if (!isAssetRole(a.role)) return "An asset role is not collateral, borrow, quote, underlying or reward.";
      if (a.address !== undefined && !ADDRESS.test(a.address)) return "An asset address must be lowercase hex.";
    }
  }
  if (doc.deployer && !ADDRESS.test(doc.deployer)) return "Deployer address must be a lowercase hex address.";
  if (doc.deployerEnvFile !== undefined && (typeof doc.deployerEnvFile !== "string" || doc.deployerEnvFile.length > L.deployerEnvFile.max || doc.deployerEnvFile.startsWith("/") || doc.deployerEnvFile.split("/").includes("..")))
    return `The deployer env file is a relative path of at most ${L.deployerEnvFile.max} characters.`;
  if (doc.icp && !icpListSchema.safeParse(doc.icp).success) return "An ideal customer profile is over its limits.";
  if (doc.canvas) {
    for (const b of CANVAS_BLOCKS) {
      const v = doc.canvas[b];
      if (v === undefined) continue;
      if (!Array.isArray(v) || v.length > CANVAS_LIMITS.items.max) return `A canvas block holds at most ${CANVAS_LIMITS.items.max} items.`;
      for (const item of v) if (typeof item?.text !== "string" || item.text.length > CANVAS_LIMITS.item.max) return `A canvas item is at most ${CANVAS_LIMITS.item.max} characters.`;
    }
  }
  if (doc.valueCanvas) {
    for (const key of PROFILE_KEYS) {
      const c = doc.valueCanvas[key];
      if (!c) continue;
      for (const area of VALUE_AREAS) {
        const items = c[area];
        if (!Array.isArray(items) || items.length > VALUE_CANVAS_LIMITS.items.max) return `A value canvas area holds at most ${VALUE_CANVAS_LIMITS.items.max} items.`;
        for (const item of items) if (typeof item?.text !== "string" || item.text.length > VALUE_CANVAS_LIMITS.item.max) return `A value canvas item is at most ${VALUE_CANVAS_LIMITS.item.max} characters.`;
      }
    }
  }
  if (doc.summary) {
    const S = PROJECT_LIMITS.summary;
    for (const list of [doc.summary.built, doc.summary.building]) {
      if (list.length > S.lines) return `At most ${S.lines} summary lines per list.`;
      if (list.some((l) => l.length > S.textMax)) return `A summary line is at most ${S.textMax} characters.`;
    }
  }
  if (doc.mainnet) {
    p = validateMainnetRecord(doc, doc.mainnet);
    if (p) return p;
  }
  return null;
}

/** A stored mainnet record read back defensively (M70). Null when nothing usable is there. */
export function normalizeMainnetRecord(raw: unknown): MainnetRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const L = PROJECT_LIMITS;
  const contracts: MainnetContract[] = [];
  for (const v of Array.isArray(r.contracts) ? (r.contracts as unknown[]) : []) {
    if (!v || typeof v !== "object" || contracts.length >= L.mainnetContracts.max) continue;
    const c = v as Record<string, unknown>;
    if (typeof c.address !== "string") continue;
    contracts.push({
      label: typeof c.label === "string" ? c.label.slice(0, L.mainnetLabel.max) : "",
      address: c.address.trim().toLowerCase(),
    });
  }
  const out: MainnetRecord = { chainId: typeof r.chainId === "number" ? r.chainId : 0, contracts };
  if (typeof r.companionTemplate === "string" && r.companionTemplate) out.companionTemplate = r.companionTemplate;
  if (r.pons && typeof r.pons === "object") {
    const pn = r.pons as Record<string, unknown>;
    if (typeof pn.tokenAddress === "string" || typeof pn.feeRecipient === "string")
      out.pons = {
        tokenAddress: typeof pn.tokenAddress === "string" ? pn.tokenAddress.trim().toLowerCase() : "",
        feeRecipient: typeof pn.feeRecipient === "string" ? pn.feeRecipient.trim().toLowerCase() : "",
      };
  }
  const pair = normalizeMainnetPair(r.pair);
  if (pair) out.pair = pair;
  return mainnetRecordEmpty(out) ? null : out;
}

/** A stored pair read back defensively (M78). Null without a known venue. */
export function normalizeMainnetPair(raw: unknown): MainnetPair | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (!isPairVenue(p.venue)) return null;
  const L = PROJECT_LIMITS;
  const quote = typeof p.quoteAsset === "string" ? p.quoteAsset.trim() : "";
  const out: MainnetPair = {
    venue: p.venue,
    quoteAsset: quote.startsWith("0x") ? quote.toLowerCase().slice(0, 42) : quote.slice(0, L.pairQuoteAsset.max),
    url: typeof p.url === "string" ? p.url.trim().slice(0, L.pairUrl.max) : "",
  };
  const addr = typeof p.pairAddress === "string" ? p.pairAddress.trim().toLowerCase() : "";
  if (addr) out.pairAddress = addr;
  return out;
}

/** True when the record carries nothing worth storing, so the key is left out. */
export function mainnetRecordEmpty(m: MainnetRecord | undefined | null): boolean {
  return !m || (m.contracts.length === 0 && !m.companionTemplate && !m.pons && !m.pair);
}

/** The first problem with a mainnet record for this project, or null (M70). */
export function validateMainnetRecord(doc: Pick<ProjectDoc, "chain" | "kit">, m: MainnetRecord): string | null {
  const L = PROJECT_LIMITS;
  const chain = projectChainOf(doc);
  const info = PROJECT_CHAIN_INFO[chain];
  if (m.chainId !== info.mainnetChainId)
    return `Mainnet contracts must be on ${info.mainnetName} (chain id ${info.mainnetChainId}), the mainnet this project's chain stands in for.`;
  if (m.contracts.length > L.mainnetContracts.max) return `At most ${L.mainnetContracts.max} mainnet contracts.`;
  const seen = new Set<string>();
  for (const c of m.contracts) {
    if (c.label.trim().length < L.mainnetLabel.min) return "Every mainnet contract needs a label.";
    if (c.label.length > L.mainnetLabel.max) return `A mainnet contract label is over ${L.mainnetLabel.max} characters.`;
    if (!ADDRESS.test(c.address)) return "Mainnet contract addresses must be lowercase hex.";
    if (seen.has(c.address)) return "A mainnet contract address is listed twice.";
    seen.add(c.address);
  }
  if (m.companionTemplate !== undefined) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(m.companionTemplate)) return "Unknown companion contract template.";
    if (doc.kit?.templates?.[m.companionTemplate] !== "accepted")
      return "The companion contract must be a template accepted on the Build step.";
  }
  if (m.pons) {
    if (chain !== "robinhood_testnet")
      return `Pons runs on Robinhood Chain mainnet. A project on ${info.name} has no Pons pairing to record.`;
    if (!ADDRESS.test(m.pons.tokenAddress)) return "The Pons token address must be lowercase hex.";
    if (!ADDRESS.test(m.pons.feeRecipient)) return "The Pons creator fee recipient must be lowercase hex.";
  }
  if (m.pair) {
    const p = validateMainnetPair(doc, m.pair);
    if (p) return p;
  }
  return null;
}

/** The first problem with an external trading pair for this project, or null (M78). */
export function validateMainnetPair(doc: Pick<ProjectDoc, "chain">, pair: MainnetPair): string | null {
  const L = PROJECT_LIMITS;
  const chain = projectChainOf(doc);
  const info = PROJECT_CHAIN_INFO[chain];
  if (!isPairVenue(pair.venue)) return "Unknown trading pair venue.";
  if (!pairVenueFits(pair.venue, chain)) {
    const label = pair.venue === "pons" ? "Pons" : "Pools";
    return `${label} runs on Robinhood Chain mainnet. A project on ${info.name} has no ${label} pair to record.`;
  }
  if (!ADDRESS.test(pair.quoteAsset) && !QUOTE_SYMBOL.test(pair.quoteAsset))
    return `The quote asset must be a symbol of ${L.pairQuoteAsset.min} to ${L.pairQuoteAsset.max} characters or a lowercase hex address.`;
  if (pair.pairAddress !== undefined && !ADDRESS.test(pair.pairAddress))
    return "The pair address must be lowercase hex.";
  return urlProblem("The trade link", pair.url, L.pairUrl.max, "https");
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
  if (doc.logo && !isStoredImageUrl(doc.logo)) return "Logo must be an image uploaded to CanHav.";

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
  if (doc.market.launchTarget !== undefined && !isLaunchTarget(doc.market.launchTarget))
    return "Unknown launch venue.";
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
      contracts: [],
      contractsNone: false,
      externalDeps: [],
      externalDepsNone: false,
      oracleUse: "",
      oracles: "",
      adminFunctions: [],
      adminFunctionsNone: false,
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
  /** The mainnet deployment and the Pons pairing the project records (M70), null when none. */
  mainnet?: MainnetRecord | null;
  /** The product's website (M78), null when none. Seeds the launch form. */
  website?: string | null;
}
