import { NextResponse } from "next/server";

import { projectChainOf } from "@/lib/chains";
import { DEPLOYER_ADDRESS } from "@/lib/deployer";
import { contractCreator } from "@/lib/explorer-server";
import { authGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { testnetContractRows } from "@/lib/ideation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** How many recorded contracts to ask the explorer about before giving up. */
const MAX_LOOKUPS = 5;

/**
 * GET /api/ideation/projects/[id]/deployer/creator (M149, P1): the address
 * that deployed one of the project's recorded testnet contracts, read from
 * the chain's explorer, so Deployments can offer it as the deployer when
 * none is recorded. Walks the recorded contracts in order until one
 * answers. Owner only. `{ address: null }` when nothing can be read.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const chain = projectChainOf(project.draft_doc);
  const rows = testnetContractRows(project.draft_doc)
    .filter((r) => DEPLOYER_ADDRESS.test(r.address.trim().toLowerCase()))
    .slice(0, MAX_LOOKUPS);
  for (const row of rows) {
    const address = await contractCreator(row.address.trim(), chain);
    if (address) return NextResponse.json({ address, contract: { label: row.label ?? null, address: row.address.trim().toLowerCase() } });
  }
  return NextResponse.json({ address: null });
}
