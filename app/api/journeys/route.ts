import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { hashJourney, validateJourney, canonicalizeJourney, type JourneyDoc } from "@/lib/journey";

export const runtime = "nodejs";

/**
 * Publish a journey document. The server re-canonicalizes and re-hashes —
 * the client's hash must match, otherwise the client would commit a hash
 * on-chain that this store can't serve. Content-addressed: identical docs
 * are a no-op upsert, nothing is ever overwritten.
 */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  let body: { doc?: JourneyDoc; clientHash?: string; creator?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { doc, clientHash, creator } = body;
  if (!doc || typeof clientHash !== "string" || typeof creator !== "string") {
    return NextResponse.json(
      { error: "Expected { doc, clientHash, creator }." },
      { status: 400 },
    );
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(creator)) {
    return NextResponse.json({ error: "Invalid creator address." }, { status: 400 });
  }

  const problem = validateJourney(doc);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const canonical = canonicalizeJourney(doc);
  const journeyHash = hashJourney(doc);
  if (journeyHash.toLowerCase() !== clientHash.toLowerCase()) {
    return NextResponse.json(
      { error: "Client hash does not match server canonicalization." },
      { status: 409 },
    );
  }

  await db`
    insert into launchpad.journeys (journey_hash, creator_address, doc, canonical)
    values (${journeyHash}, ${creator.toLowerCase()}, ${JSON.stringify(doc)}::jsonb, ${canonical})
    on conflict (journey_hash) do nothing
  `;

  return NextResponse.json({ journeyHash });
}
