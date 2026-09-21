import "server-only";

import { getDb } from "@/lib/db";
import { getMilestoneUpdates } from "@/lib/indexer";
import {
  hashJourney,
  hashMilestoneUpdate,
  type JourneyDoc,
  type MilestoneUpdateDoc,
} from "@/lib/journey";

/**
 * Verified reads over the journey tables in Neon. Shared by the token launch
 * page and the MCP launch tools so both surfaces apply the same verification
 * rule: a stored document only counts when its recomputed hash matches the
 * hash anchored on-chain.
 */

export interface VerifiedJourney {
  doc: JourneyDoc;
  /** True when keccak256(canonical doc) equals the on-chain journeyHash. */
  verified: boolean;
}

export interface VerifiedMilestoneUpdate {
  body: string;
  /** Unix seconds of the anchoring block. */
  postedAt: number;
  txHash: string;
}

/** Fetch the stored journey doc and verify it against the on-chain hash. */
export async function getVerifiedJourney(journeyHash: string): Promise<VerifiedJourney | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db`
      select doc from launchpad.journeys where journey_hash = ${journeyHash.toLowerCase()}
    `;
    if (rows.length === 0) return null;
    const doc = rows[0].doc as JourneyDoc;
    return { doc, verified: hashJourney(doc).toLowerCase() === journeyHash.toLowerCase() };
  } catch {
    return null;
  }
}

/**
 * Resolve on-chain update anchors to verified update threads per milestone.
 * Keeps only anchors authored by the token's creator whose stored body's
 * recomputed hash matches the anchor. Returns an empty record when the
 * indexer or the database is unavailable.
 */
export async function getVerifiedUpdates(
  tokenAddress: string,
  creator: string,
): Promise<Record<number, VerifiedMilestoneUpdate[]>> {
  const anchors = await getMilestoneUpdates(tokenAddress);
  const db = getDb();
  if (!anchors || anchors.length === 0 || !db) return {};

  const fromCreator = anchors.filter(
    (a) => a.author.toLowerCase() === creator.toLowerCase(),
  );
  if (fromCreator.length === 0) return {};

  try {
    const hashes = fromCreator.map((a) => a.updateHash.toLowerCase());
    const rows = await db`
      select update_hash, doc from launchpad.milestone_updates
      where update_hash = any(${hashes})
    `;
    const docs = new Map(rows.map((r) => [r.update_hash as string, r.doc as MilestoneUpdateDoc]));

    const grouped: Record<number, VerifiedMilestoneUpdate[]> = {};
    for (const a of fromCreator) {
      const doc = docs.get(a.updateHash.toLowerCase());
      if (!doc) continue;
      if (hashMilestoneUpdate(doc).toLowerCase() !== a.updateHash.toLowerCase()) continue;
      (grouped[a.milestoneIndex] ??= []).push({
        body: doc.body,
        postedAt: Number(a.blockTimestamp),
        txHash: a.txHash,
      });
    }
    return grouped;
  } catch {
    return {};
  }
}
