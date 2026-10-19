import { NextResponse } from "next/server";

import { deleteAlertChannel } from "@/lib/alerts/db";
import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; channelId: string }> }) {
  const gate = await plusGate("monitoring");
  if (gate instanceof NextResponse) return gate;
  const { id, channelId } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const ok = await deleteAlertChannel(id, channelId);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not remove the channel." }, { status: 500 });
}
