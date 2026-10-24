import { NextResponse } from "next/server";

import { BUILD_COPY } from "@/content/build";
import { projectChainOf } from "@/lib/chains";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { readSafe } from "@/lib/safe-server";

export const runtime = "nodejs";

/**
 * Verify a Safe on the project's chain (M160): the owners and threshold are
 * read onchain and answered as the record to store; the studio writes it
 * on the draft through its autosave. 400 when the address is not a Safe.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id);
  if (gate instanceof NextResponse) return gate;
  const row = await getProject(id, gate.owner);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: { address?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const safe = await readSafe(address, projectChainOf(row.draft_doc));
  if (!safe) return NextResponse.json({ error: BUILD_COPY.deployments.teamSafe.notASafe }, { status: 400 });
  return NextResponse.json({ teamSafe: safe });
}
