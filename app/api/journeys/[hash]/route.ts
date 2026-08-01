import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/** Public verification endpoint: fetch the document behind a journeyHash and
 *  recompute the hash yourself — it must equal the TokenLaunched event's. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ hash: string }> },
) {
  const { hash } = await params;
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    return NextResponse.json({ error: "Invalid hash." }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const rows = await db`
    select journey_hash, creator_address, doc, canonical, created_at
    from launchpad.journeys where journey_hash = ${hash.toLowerCase()}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Unknown journey hash." }, { status: 404 });
  }

  const row = rows[0];
  return NextResponse.json({
    journeyHash: row.journey_hash,
    creator: row.creator_address,
    doc: row.doc,
    canonical: row.canonical,
    createdAt: row.created_at,
  });
}
