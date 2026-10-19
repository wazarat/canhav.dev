import { NextResponse } from "next/server";

import { createAlertChannel } from "@/lib/alerts/db";
import { alertChannelInputSchema, validateTarget } from "@/lib/alerts/schema";
import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { maskSecret, sealSecret } from "@/lib/secrets";

export const runtime = "nodejs";

/** Add a channel; the target is encrypted before it is stored (M123). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await plusGate("monitoring");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = alertChannelInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the channel." }, { status: 400 });
  const invalid = validateTarget(parsed.data);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const sealed = sealSecret(parsed.data.target);
  if (!sealed) return NextResponse.json({ error: "Alerts are not configured on this deployment yet." }, { status: 503 });
  const masked = parsed.data.kind === "email" ? parsed.data.target : maskSecret(parsed.data.target);
  const result = await createAlertChannel({ projectId: id, kind: parsed.data.kind, configEnc: sealed, masked, createdBy: gate.id });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ id: result.id });
}
