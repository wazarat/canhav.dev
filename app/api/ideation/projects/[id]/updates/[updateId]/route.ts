import { NextResponse } from "next/server";

import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { deleteUpdate } from "@/lib/updates-db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const gate = await plusGate("weekly_update");
  if (gate instanceof NextResponse) return gate;
  const { id, updateId } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const ok = await deleteUpdate(id, updateId);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not remove the update." }, { status: 500 });
}
