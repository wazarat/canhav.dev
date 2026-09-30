import { NextResponse } from "next/server";

import {
  type BuildStepsPatch,
  buildStepsNarrow,
  buildStepsPatchSchema,
  firstIssue,
  patchNarrows,
  projectPatchSchema,
  tokenDesignPatchSchema,
} from "@/lib/agent-writes";
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
 *
 * Since M44 an accept may carry `patch`, the proposal narrowed to the lines
 * the owner kept with their edits. It must be non-empty, every leaf must
 * exist in the stored proposal, and it must pass the same schema the agent's
 * input passed. Without `patch` the whole proposal is applied, as before.
 */
const ADDED_FIELDS = "The decision adds fields the agent did not propose.";
export async function POST(req: Request, { params }: Ctx) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  const { id, changeId } = await params;

  let body: { action?: unknown; appliedInEditor?: unknown; patch?: unknown };
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

  let applied: unknown = change.patch;
  if (body.action === "accept") {
    if (body.patch !== undefined) {
      if (change.kind === "build_steps") {
        const stored = buildStepsPatchSchema.safeParse(change.patch);
        const decided = buildStepsPatchSchema.safeParse(body.patch);
        if (!decided.success) return NextResponse.json({ error: firstIssue(decided.error) }, { status: 400 });
        if (!stored.success || !buildStepsNarrow(stored.data as BuildStepsPatch, decided.data as BuildStepsPatch))
          return NextResponse.json({ error: ADDED_FIELDS }, { status: 400 });
        applied = decided.data;
      } else {
        if (!patchNarrows(change.patch, body.patch))
          return NextResponse.json({ error: ADDED_FIELDS }, { status: 400 });
        const schema = change.target === "project" ? projectPatchSchema : tokenDesignPatchSchema;
        const decided = schema.safeParse(body.patch);
        if (!decided.success) return NextResponse.json({ error: firstIssue(decided.error) }, { status: 400 });
        applied = decided.data;
      }
    }
    const inEditor = change.target === "project" && body.appliedInEditor === true;
    if (!inEditor) {
      const written = await writeChange(id, gate.id, change.target, change.kind, applied);
      if (!written.ok) return NextResponse.json({ error: written.message }, { status: 409 });
    }
  }

  const ok = await resolveAgentChange(
    changeId,
    id,
    gate.id,
    body.action === "accept" ? "accepted" : "rejected",
    body.action === "accept" ? applied : null,
  );
  if (!ok) return NextResponse.json({ error: "This change was already decided." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
