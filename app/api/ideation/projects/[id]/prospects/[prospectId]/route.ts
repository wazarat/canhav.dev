import { NextResponse } from "next/server";

import { projectPlusGate } from "@/lib/ideation-api";
import { deleteProspect } from "@/lib/prospects-db";

export const runtime = "nodejs";

/** Remove one prospect (M158); the team only, never an agent. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; prospectId: string }> }) {
  const { id, prospectId } = await params;
  const gate = await projectPlusGate(id, "icp");
  if (gate instanceof NextResponse) return gate;
  const ok = await deleteProspect(id, prospectId);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}
