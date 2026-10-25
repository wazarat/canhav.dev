import { NextResponse } from "next/server";
import { z } from "zod";

import { assetInputSchema, normalizeAssets } from "@/lib/assets";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { dependencyCheck } from "@/lib/viability/check";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  /** Takes a new pools snapshot (Check again). */
  refresh: z.boolean().optional(),
  /** The assets as the editor shows them, so the check reads what is on screen before the autosave lands. */
  assets: z.array(assetInputSchema.extend({ id: z.string() })).max(20).optional(),
});

/** The dependency check of a project (M163), Studio+ under viability. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "viability");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const check = await dependencyCheck(project.draft_doc, {
    refresh: parsed.data.refresh,
    assets: parsed.data.assets ? normalizeAssets(parsed.data.assets) : undefined,
  });
  return NextResponse.json({ check });
}
