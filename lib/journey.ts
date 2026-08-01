import { keccak256, stringToBytes } from "viem";

/**
 * The journey document: the off-chain thinking a creator commits to on-chain.
 * `journeyHash = keccak256(canonicalizeJourney(doc))` is emitted in the
 * TokenLaunched event, making the document tamper-evident forever.
 *
 * Isomorphic — used by the launch form (client, pre-launch hashing), the
 * journeys API (server, verification before storage), and the token page
 * (server, verification against the indexed event).
 *
 * IMPORTANT: the canonicalization below is a consensus rule for this app.
 * Changing it invalidates verification for every previously launched token —
 * bump `version` and keep the old path if the format ever has to evolve.
 */

export interface JourneyMilestone {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  title: string;
  description: string;
}

export interface JourneyDoc {
  version: 1;
  tokenName: string;
  ticker: string;
  /** What is this token and why does it exist. */
  why: string;
  /** Why this total supply and who gets it. */
  supplyRationale: string;
  /** 2–5 dated milestones. */
  milestones: JourneyMilestone[];
}

export const JOURNEY_LIMITS = {
  why: { min: 80, max: 2000 },
  supplyRationale: { min: 40, max: 1000 },
  milestones: { min: 2, max: 5, titleMax: 80, descriptionMax: 400 },
} as const;

/** Deterministic serialization: recursively sorted keys, no whitespace. */
function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortValue((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

export function canonicalizeJourney(doc: JourneyDoc): string {
  return JSON.stringify(sortValue(doc));
}

export function hashJourney(doc: JourneyDoc): `0x${string}` {
  return keccak256(stringToBytes(canonicalizeJourney(doc)));
}

/** The description commitment: keccak256 of the raw description string. */
export function hashDescription(description: string): `0x${string}` {
  return keccak256(stringToBytes(description));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns null when valid, otherwise the first human-readable problem. */
export function validateJourney(doc: JourneyDoc): string | null {
  const L = JOURNEY_LIMITS;
  if (doc.version !== 1) return "Unsupported journey version.";
  if (!doc.tokenName.trim()) return "Journey is missing the token name.";
  if (!doc.ticker.trim()) return "Journey is missing the ticker.";

  const why = doc.why.trim();
  if (why.length < L.why.min) return `"Why this token" needs at least ${L.why.min} characters.`;
  if (why.length > L.why.max) return `"Why this token" is over ${L.why.max} characters.`;

  const supply = doc.supplyRationale.trim();
  if (supply.length < L.supplyRationale.min)
    return `Supply rationale needs at least ${L.supplyRationale.min} characters.`;
  if (supply.length > L.supplyRationale.max)
    return `Supply rationale is over ${L.supplyRationale.max} characters.`;

  if (doc.milestones.length < L.milestones.min)
    return `At least ${L.milestones.min} milestones are required.`;
  if (doc.milestones.length > L.milestones.max)
    return `At most ${L.milestones.max} milestones are allowed.`;
  for (const [i, m] of doc.milestones.entries()) {
    const n = i + 1;
    if (!ISO_DATE.test(m.date)) return `Milestone ${n}: date must be YYYY-MM-DD.`;
    if (!m.title.trim()) return `Milestone ${n}: title is required.`;
    if (m.title.length > L.milestones.titleMax)
      return `Milestone ${n}: title is over ${L.milestones.titleMax} characters.`;
    if (m.description.length > L.milestones.descriptionMax)
      return `Milestone ${n}: description is over ${L.milestones.descriptionMax} characters.`;
  }
  return null;
}
