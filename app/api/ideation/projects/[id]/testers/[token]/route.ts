import { NextResponse } from "next/server";

import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { revokeInvite } from "@/lib/tester-db";

export const runtime = "nodejs";

/** Revoke an invite; its page closes and its feedback stays. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; token: string }> }) {
  const gate = await plusGate("tester_kit");
  if (gate instanceof NextResponse) return gate;
  const { id, token } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const ok = await revokeInvite(id, token);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not revoke the invite." }, { status: 500 });
}
