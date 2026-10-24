import { NextResponse } from "next/server";

import { projectChainOf } from "@/lib/chains";
import { projectPlusGate } from "@/lib/ideation-api";
import { getLinkedTokenDesign, getProject } from "@/lib/ideation-db";
import { getTokenAnalytics } from "@/lib/indexer";
import { getLaunchesByProject } from "@/lib/launches-db";

export const runtime = "nodejs";

/**
 * Token analytics for one of the project's tokens (M122), Studio+. The
 * token has to be launched from or linked to the project; the answer is
 * null while the indexer has no analytics tables yet.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "analytics");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const token = (new URL(req.url).searchParams.get("token") ?? "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(token)) return NextResponse.json({ error: "Pass the token address." }, { status: 400 });
  const [launches, design] = await Promise.all([getLaunchesByProject(id), getLinkedTokenDesign(id)]);
  const known = new Set([...(launches ?? []).map((l) => l.token_address.toLowerCase()), design?.deployed_token_address?.toLowerCase() ?? ""]);
  if (!known.has(token)) return NextResponse.json({ error: "That token is not linked to this project." }, { status: 404 });
  const analytics = await getTokenAnalytics(token, projectChainOf(project.draft_doc));
  return NextResponse.json({ analytics });
}
