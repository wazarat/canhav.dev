import { NextResponse } from "next/server";

import { projectChainOf } from "@/lib/chains";
import { familyOf, isEconomicsFamily } from "@/lib/economics";
import { marketFill } from "@/lib/economics-market";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { effectiveSubsectors, kitShapes } from "@/lib/kits";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Fill from market (M167): rates from the pools snapshot for the project's family and subsectors, Studio+ under viability. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "viability");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const doc = project.draft_doc;
  const asked = new URL(req.url).searchParams.get("family");
  const family = isEconomicsFamily(asked) ? asked : (doc.economics?.family ?? familyOf(kitShapes(doc.kit)));
  if (!family) return NextResponse.json({ error: "No family." }, { status: 400 });
  const fill = await marketFill(family, effectiveSubsectors(doc.kit, doc), projectChainOf(doc));
  return NextResponse.json({ fill });
}
