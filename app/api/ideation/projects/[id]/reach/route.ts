import { NextResponse } from "next/server";

import { projectChainOf } from "@/lib/chains";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { reachFor, reachSummaryOf } from "@/lib/reach-server";
import { type ProfileKey, PROFILE_KEYS } from "@/lib/value-canvas";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Reachable wallets for one ideal customer profile (M168), Studio+ under
 * icp. ?profile=0|1, ?refresh=1 runs the queries again (counted against
 * the team's monthly cap). Answers the read and the summary the studio
 * keeps on the draft.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "icp");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const url = new URL(req.url);
  const profile = (PROFILE_KEYS as readonly string[]).includes(url.searchParams.get("profile") ?? "") ? (url.searchParams.get("profile") as ProfileKey) : "0";
  const refresh = url.searchParams.get("refresh") === "1";
  const result = await reachFor(project.id, project.org_id ?? null, project.draft_doc, profile, projectChainOf(project.draft_doc), { refresh, requestedBy: gate.id });
  return NextResponse.json({ result, summary: result.kind === "ok" ? reachSummaryOf(result.read) : null, profile });
}
