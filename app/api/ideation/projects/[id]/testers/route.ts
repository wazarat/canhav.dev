import { NextResponse } from "next/server";

import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { inviteInputSchema } from "@/lib/tester";
import { createInvite, listFeedback, listInvites } from "@/lib/tester-db";

export const runtime = "nodejs";

/** The project's tester invites and feedback (M125), Studio+. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await plusGate("tester_kit");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const [invites, feedback] = await Promise.all([listInvites(id), listFeedback(id)]);
  return NextResponse.json({ invites, feedback });
}

/** Create an invite link. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await plusGate("tester_kit");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = inviteInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the invite." }, { status: 400 });
  const result = await createInvite({ projectId: id, ...parsed.data, createdBy: gate.id });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ invite: result.invite });
}
