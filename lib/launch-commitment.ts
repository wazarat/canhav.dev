import { type IdeationDoc, type TokenDesignDoc, hashIdeationDoc } from "@/lib/ideation";
import {
  type JourneyDoc,
  type JourneyMilestone,
  hasCommitment,
  hashJourney,
  validateMilestones,
} from "@/lib/journey";

/**
 * What a launch committed on chain (M48). The journeyHash of a token is
 * either a journey document's hash (the quick launch form) or a published
 * token design's snapshot hash (a launch from a design). Both are read back
 * and re-hashed, and both can carry milestones, so the token page, the
 * sales and escrow actions, the update composer and the MCP views all read
 * `milestones` from here. Isomorphic; the database reads live in
 * lib/journey-db.ts getLaunchCommitment.
 */

export type LaunchCommitment =
  | {
      source: "journey";
      doc: JourneyDoc;
      verified: boolean;
      milestones: JourneyMilestone[] | null;
    }
  | {
      source: "design";
      doc: TokenDesignDoc;
      version: number;
      slug: string;
      name: string;
      snapshotHash: string;
      verified: boolean;
      milestones: JourneyMilestone[] | null;
    }
  | null;

/** The milestones a design carries, when it has a valid list. */
export function designMilestones(doc: TokenDesignDoc): JourneyMilestone[] | null {
  const list = doc.postLaunch?.milestones;
  if (!list || list.length === 0) return null;
  return validateMilestones(list) === null ? list : null;
}

/**
 * Resolve the on-chain hash against what was found for it. A journey
 * counts when its recomputed hash matches; a design snapshot counts when
 * the snapshot document re-hashes to the on-chain value, the same rule.
 * Milestones are only reported for a verified document.
 */
export function resolveLaunchCommitment(
  journeyHash: string,
  journey: JourneyDoc | null,
  snapshot: { doc: IdeationDoc; version: number } | null,
): LaunchCommitment {
  if (!hasCommitment(journeyHash)) return null;
  const hash = journeyHash.toLowerCase();
  if (journey) {
    const verified = hashJourney(journey).toLowerCase() === hash;
    return { source: "journey", doc: journey, verified, milestones: verified ? journey.milestones : null };
  }
  if (snapshot && snapshot.doc.kind === "token_design") {
    const doc = snapshot.doc;
    const verified = hashIdeationDoc(doc).toLowerCase() === hash;
    return {
      source: "design",
      doc,
      version: snapshot.version,
      slug: doc.slug,
      name: doc.name,
      snapshotHash: hash,
      verified,
      milestones: verified ? designMilestones(doc) : null,
    };
  }
  return null;
}
