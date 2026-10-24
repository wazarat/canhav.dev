import { NextResponse } from "next/server";

import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { revokeKey } from "@/lib/project-keys";

export const runtime = "nodejs";

/** Revoke a key (M111). The row stays, marked revoked, so the history reads. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; keyId: string }> }) {
  const { id, keyId } = await params;
  const gate = await projectPlusGate(id, "project_keys");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const ok = await revokeKey(id, keyId);
  if (!ok) return NextResponse.json({ error: "Not found, or already revoked." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
