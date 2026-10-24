import { NextResponse } from "next/server";

import { agentStateOf, writeProjectDraftAsAgent } from "@/lib/agent-writes-db";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { normalizeProjectDoc } from "@/lib/ideation";
import { getRevision } from "@/lib/revisions-db";
import { revisionAuthor } from "@/lib/revisions";

export const runtime = "nodejs";

/**
 * Restore a revision (M110). The old document is written through the
 * agent write path, so agent_rev bumps and an editor open elsewhere sees
 * the stale notice; the restore itself is recorded as a revision.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; rev: string }> }) {
  const { id, rev: raw } = await params;
  const gate = await projectPlusGate(id, "version_history");
  if (gate instanceof NextResponse) return gate;
  const rev = Number(raw);
  if (!Number.isInteger(rev) || rev < 1) return NextResponse.json({ error: "Unknown revision." }, { status: 400 });
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const readRev = agentStateOf(project).rev;
  if (readRev === null) return NextResponse.json({ error: "The database has not been updated for agent writes." }, { status: 503 });
  const row = await getRevision("project", id, rev);
  if (!row || row.doc.kind !== "project") return NextResponse.json({ error: "Unknown revision." }, { status: 404 });
  const doc = normalizeProjectDoc(row.doc);
  // The chain stays fixed once a token launched; a restore keeps the current one.
  if (project.draft_doc.chain !== doc.chain) doc.chain = project.draft_doc.chain;
  const ok = await writeProjectDraftAsAgent(id, gate.owner, doc, readRev, revisionAuthor("restore", rev));
  if (!ok) return NextResponse.json({ error: "The draft changed while restoring. Reload and try again." }, { status: 409 });
  return NextResponse.json({ ok: true, rev });
}
