import { NextResponse } from "next/server";

import { COMPARABLES_NOTE, COMPARABLES_SOURCE, comparablesForSubsectors } from "@/lib/comparables";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { effectiveSubsectors } from "@/lib/kits";

export const runtime = "nodejs";

/** The comparables for a project's subsectors (M169, V5), Studio+ under competitors. The data itself is free and unchanged (M132). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "competitors");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const doc = project.draft_doc;
  const subsectors = effectiveSubsectors(doc.kit, doc);
  return NextResponse.json({ subsectors, note: COMPARABLES_NOTE, source: COMPARABLES_SOURCE, comparables: comparablesForSubsectors(subsectors) });
}
