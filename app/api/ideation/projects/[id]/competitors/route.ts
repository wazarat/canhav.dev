import { NextResponse } from "next/server";

import { landscapeFor } from "@/lib/competitors/landscape";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The competitor landscape of a project (M115), Studio+. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "competitors");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const landscape = await landscapeFor(project.draft_doc);
  return NextResponse.json({ landscape });
}
