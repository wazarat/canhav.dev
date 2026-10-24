import { NextResponse } from "next/server";

import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { deleteUpdate } from "@/lib/updates-db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const { id, updateId } = await params;
  const gate = await projectPlusGate(id, "weekly_update");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const ok = await deleteUpdate(id, updateId);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not remove the update." }, { status: 500 });
}
