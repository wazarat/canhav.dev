import { NextResponse } from "next/server";

import { createAlertRule } from "@/lib/alerts/db";
import { alertRuleInputSchema, ethToWei } from "@/lib/alerts/schema";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";

/** Add or replace a rule for an address on the project's chain (M123). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await plusGate("monitoring");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = alertRuleInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the rule." }, { status: 400 });
  const input = parsed.data;
  if (input.kinds.includes("large_transfer") && !input.thresholdEth) return NextResponse.json({ error: "Large transfers need a threshold in ETH." }, { status: 400 });
  const result = await createAlertRule({
    projectId: id,
    chainId: chainInfo(projectChainOf(project.draft_doc)).chainId,
    address: input.address,
    label: input.label || null,
    kinds: input.kinds,
    thresholdWei: input.thresholdEth ? ethToWei(input.thresholdEth) : null,
    createdBy: gate.id,
  });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ id: result.id });
}
