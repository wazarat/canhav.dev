import { NextResponse } from "next/server";

import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { publishUpdate } from "@/lib/updates-db";

export const runtime = "nodejs";

/** Publish a week's update to the public page (M124). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const { id, updateId } = await params;
  const gate = await projectPlusGate(id, "weekly_update");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const row = await publishUpdate(id, updateId);
  if (!row) return NextResponse.json({ error: "Could not publish the update." }, { status: 500 });
  return NextResponse.json({ update: row });
}
