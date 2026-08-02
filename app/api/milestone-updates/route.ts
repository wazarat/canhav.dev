import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import {
  canonicalizeMilestoneUpdate,
  hashMilestoneUpdate,
  validateMilestoneUpdate,
  type MilestoneUpdateDoc,
} from "@/lib/journey";

export const runtime = "nodejs";

/**
 * Store a milestone update document. Same contract as /api/journeys: the
 * server re-canonicalizes and re-hashes; the client's hash must match or the
 * on-chain anchor it is about to post could never be served from here.
 * Content-addressed — identical docs are a no-op.
 */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  let body: { doc?: MilestoneUpdateDoc; clientHash?: string; author?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { doc, clientHash, author } = body;
  if (!doc || typeof clientHash !== "string" || typeof author !== "string") {
    return NextResponse.json({ error: "Expected { doc, clientHash, author }." }, { status: 400 });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(author)) {
    return NextResponse.json({ error: "Invalid author address." }, { status: 400 });
  }

  const problem = validateMilestoneUpdate(doc);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const updateHash = hashMilestoneUpdate(doc);
  if (updateHash.toLowerCase() !== clientHash.toLowerCase()) {
    return NextResponse.json(
      { error: "Client hash does not match server canonicalization." },
      { status: 409 },
    );
  }

  await db`
    insert into launchpad.milestone_updates
      (update_hash, token_address, milestone_index, author_address, doc, canonical)
    values (
      ${updateHash},
      ${doc.token},
      ${doc.milestoneIndex},
      ${author.toLowerCase()},
      ${JSON.stringify(doc)}::jsonb,
      ${canonicalizeMilestoneUpdate(doc)}
    )
    on conflict (update_hash) do nothing
  `;

  return NextResponse.json({ updateHash });
}
