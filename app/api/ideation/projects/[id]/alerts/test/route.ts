import { NextResponse } from "next/server";

import { lastTestAt, recordTestEvent } from "@/lib/alerts/db";
import { ALERT_LIMITS, testMessage } from "@/lib/alerts/kinds";
import { deliverToChannels } from "@/lib/alerts/send";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";

/**
 * Send a test alert (M128): one synthetic line through every channel, from
 * here rather than the worker so the answer is immediate, recorded as an
 * event of kind test so Last events shows it. One a minute per project.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "monitoring");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (Date.now() - (await lastTestAt(id)) < ALERT_LIMITS.testEveryMs) return NextResponse.json({ error: "One test alert a minute. Try again shortly." }, { status: 429 });
  const message = testMessage(project.draft_doc.name);
  const delivered = await deliverToChannels(id, message.subject, message.text);
  if (Object.keys(delivered).length === 0) return NextResponse.json({ error: "Add a channel first." }, { status: 400 });
  const eventId = await recordTestEvent(id, chainInfo(projectChainOf(project.draft_doc)).chainId, message.text, delivered);
  return NextResponse.json({ id: eventId, delivered });
}
