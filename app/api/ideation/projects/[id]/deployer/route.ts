import { NextResponse } from "next/server";

import { DEPLOYER_ADDRESS } from "@/lib/deployer";
import { getDeployerBalances } from "@/lib/deployer-server";
import { authGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/ideation/projects/[id]/deployer?address=0x… (M102): the native
 * balance of the project's deployer key on both testnets. The address is
 * the one on the draft, or the one just made in the browser before the
 * autosave landed. Owner only.
 */
export async function GET(req: Request, { params }: Ctx) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.id);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const asked = new URL(req.url).searchParams.get("address")?.trim().toLowerCase();
  const address = asked || project.draft_doc.deployer?.toLowerCase() || "";
  if (!DEPLOYER_ADDRESS.test(address))
    return NextResponse.json({ error: "No deployer address." }, { status: 400 });
  return NextResponse.json({ address, balances: await getDeployerBalances(address) });
}
