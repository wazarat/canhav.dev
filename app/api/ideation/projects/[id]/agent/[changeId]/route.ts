import { NextResponse } from "next/server";

import { getAgentChange, resolveAgentChange } from "@/lib/agent-writes-db";
import { writeChange } from "@/lib/agent-writes-server";
import { authGate } from "@/lib/ideation-api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; changeId: string }> };

/**
 * Accept or reject one proposal. A project change accepted from the open
 * editor is merged into the editor's own copy and saved by its autosave, so
 * `appliedInEditor` tells this route to record the decision and leave the
 * draft alone. Everything else is written here.
 */
export async function POST(req: Request, { params }: Ctx) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  const { id, changeId } = await params;

  let body: { action?: unknown; appliedInEditor?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (body.action !== "accept" && body.action !== "reject")
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const change = await getAgentChange(changeId, id, gate.id);
  if (!change) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (change.status !== "proposed")
    return NextResponse.json({ error: "This change was already decided." }, { status: 409 });

  if (body.action === "accept") {
    const inEditor = change.target === "project" && body.appliedInEditor === true;
    if (!inEditor) {
      const written = await writeChange(id, gate.id, change.target, change.kind, change.patch);
      if (!written.ok) return NextResponse.json({ error: written.message }, { status: 409 });
    }
  }

  const ok = await resolveAgentChange(
    changeId,
    id,
    gate.id,
    body.action === "accept" ? "accepted" : "rejected",
  );
  if (!ok) return NextResponse.json({ error: "This change was already decided." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
