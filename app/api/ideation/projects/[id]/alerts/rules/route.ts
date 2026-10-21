import { NextResponse } from "next/server";
import { erc20Abi } from "viem";

import { createAlertRule } from "@/lib/alerts/db";
import { alertRuleInputSchema, toBaseUnits } from "@/lib/alerts/schema";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { publicClientFor } from "@/lib/publicClient";

export const runtime = "nodejs";

/**
 * Add or replace a rule for an address on the project's chain (M123). A
 * large transfer threshold is given in whole tokens and converted with the
 * token's own decimals, read from the chain (M128), eighteen when it does
 * not answer.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await plusGate("monitoring");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = alertRuleInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the rule." }, { status: 400 });
  const input = parsed.data;
  if (input.kinds.includes("large_transfer") && !input.thresholdEth) return NextResponse.json({ error: "Large transfers need a threshold in whole tokens." }, { status: 400 });
  const chain = projectChainOf(project.draft_doc);
  let decimals = 18;
  if (input.kinds.includes("large_transfer")) {
    decimals = Number(await publicClientFor(chain).readContract({ address: input.address as `0x${string}`, abi: erc20Abi, functionName: "decimals" }).catch(() => 18));
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) decimals = 18;
  }
  const result = await createAlertRule({
    projectId: id,
    chainId: chainInfo(chain).chainId,
    address: input.address,
    label: input.label || null,
    kinds: input.kinds,
    thresholdWei: input.thresholdEth ? toBaseUnits(input.thresholdEth, decimals) : null,
    decimals,
    createdBy: gate.id,
  });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ id: result.id });
}
