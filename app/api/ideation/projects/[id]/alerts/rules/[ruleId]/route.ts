import { NextResponse } from "next/server";

import { deleteAlertRule } from "@/lib/alerts/db";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; ruleId: string }> }) {
  const { id, ruleId } = await params;
  const gate = await projectPlusGate(id, "monitoring");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const ok = await deleteAlertRule(id, ruleId);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not remove the rule." }, { status: 500 });
}
