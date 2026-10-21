import { NextResponse } from "next/server";

import { createAlertChannel } from "@/lib/alerts/db";
import { deliver } from "@/lib/alerts/deliver";
import { testMessage } from "@/lib/alerts/kinds";
import { alertChannelInputSchema, validateTarget } from "@/lib/alerts/schema";
import { deliveryEnv } from "@/lib/alerts/send";
import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { maskSecret, sealSecret } from "@/lib/secrets";

export const runtime = "nodejs";

/**
 * Add a channel; the target is encrypted before it is stored (M123). A
 * Discord webhook gets a hello message first and is refused when the
 * webhook refuses it (M128), so a wrong paste never saves.
 */
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
  let hello = false;
  if (parsed.data.kind === "discord") {
    const name = project.draft_doc.name || "your project";
    const result = await deliver("discord", parsed.data.target, `CanHav connected to ${name}`, `Alerts for ${name} arrive here. ${testMessage(name).text}`, deliveryEnv());
    if (!result.ok) {
      const status = result.error?.slice(0, 3);
      const why = status === "401" || status === "404" ? "Discord does not know this webhook. Copy it again from the channel's Integrations settings." : `Discord refused the hello message (${result.error ?? "no answer"}).`;
      return NextResponse.json({ error: why }, { status: 400 });
    }
    hello = true;
  }
  const sealed = sealSecret(parsed.data.target);
  if (!sealed) return NextResponse.json({ error: "Alerts are not configured on this deployment yet." }, { status: 503 });
  const masked = parsed.data.kind === "email" ? parsed.data.target : maskSecret(parsed.data.target);
  const result = await createAlertChannel({ projectId: id, kind: parsed.data.kind, configEnc: sealed, masked, createdBy: gate.id });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ id: result.id, hello });
}
