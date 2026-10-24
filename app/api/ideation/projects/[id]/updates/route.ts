import { NextResponse } from "next/server";

import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { DEFAULT_CADENCE, updateInputSchema } from "@/lib/updates";
import { listUpdates, upsertUpdate } from "@/lib/updates-db";

export const runtime = "nodejs";

/** The project's team updates, newest first (M124), Studio+. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "weekly_update");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ updates: await listUpdates(id) });
}

/** Write or replace a week's update as a draft. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "weekly_update");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = updateInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the update." }, { status: 400 });
  const row = await upsertUpdate({ projectId: id, weekOf: parsed.data.weekOf, cadence: project.draft_doc.updateCadence ?? DEFAULT_CADENCE, body: parsed.data.body, highlights: parsed.data.highlights, author: gate.id === project.owner_id ? "owner" : `member:${gate.id}` });
  if (!row) return NextResponse.json({ error: "Could not save the update." }, { status: 500 });
  return NextResponse.json({ update: row });
}
