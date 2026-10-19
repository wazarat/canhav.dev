import { NextResponse } from "next/server";

import { plusGate } from "@/lib/ideation-api";
import { getProject, moveProjectToTeam } from "@/lib/ideation-db";

export const runtime = "nodejs";

/**
 * Move a personal project to the session's active team (M107). Studio+
 * only. The caller must be the account that made the project, and the
 * session must have a team active; the project, its linked design and its
 * launches follow.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await plusGate();
  if (gate instanceof NextResponse) return gate;
  const orgId = gate.owner.orgIds[0];
  if (!orgId) return NextResponse.json({ error: "Switch to a team first." }, { status: 400 });
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (project.owner_id !== gate.id)
    return NextResponse.json({ error: "Only the account that made this project can move it." }, { status: 403 });
  if (project.org_id) return NextResponse.json({ error: "This project is already on a team." }, { status: 409 });
  const ok = await moveProjectToTeam(id, gate.id, orgId);
  if (!ok) return NextResponse.json({ error: "Could not move this project." }, { status: 409 });
  return NextResponse.json({ ok: true, orgId });
}
