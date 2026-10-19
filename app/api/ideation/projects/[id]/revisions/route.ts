import { NextResponse } from "next/server";

import { authGate } from "@/lib/ideation-api";
import { getProject, getSnapshotHistory } from "@/lib/ideation-db";
import { getPlan, hasPlusFeature } from "@/lib/plan";
import { listRevisions } from "@/lib/revisions-db";

export const runtime = "nodejs";

/**
 * The history panel's data (M110): the published versions for everyone,
 * the draft revisions for a Studio+ team.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const plan = await getPlan();
  const plus = plan.plan === "studio_plus" && (await hasPlusFeature("version_history"));
  const [snapshots, revisions] = await Promise.all([
    getSnapshotHistory("project", id),
    plus ? listRevisions("project", id) : Promise.resolve([]),
  ]);
  return NextResponse.json({
    plus,
    snapshots: (snapshots ?? []).map((s) => ({ version: s.version, hash: s.snapshot_hash, createdAt: new Date(s.created_at).toISOString() })),
    revisions,
  });
}
