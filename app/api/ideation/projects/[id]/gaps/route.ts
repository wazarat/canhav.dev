import { NextResponse } from "next/server";

import { isProjectChain, projectChainOf } from "@/lib/chains";
import { gapMap } from "@/lib/gaps";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The gap map for a project's chain, or the chain asked for (M164), Studio+ under viability. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "viability");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const asked = new URL(req.url).searchParams.get("chain");
  const chain = isProjectChain(asked) ? asked : projectChainOf(project.draft_doc);
  return NextResponse.json({ map: await gapMap(chain) });
}
