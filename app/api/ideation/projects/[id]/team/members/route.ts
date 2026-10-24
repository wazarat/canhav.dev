import { NextResponse } from "next/server";

import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { orgMembersWithWallets } from "@/lib/org-members";

export const runtime = "nodejs";

/** The project's team members with their account wallets (M160), for the team Safe's owners. Studio+ team projects only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id);
  if (gate instanceof NextResponse) return gate;
  const row = await getProject(id, gate.owner);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!row.org_id) return NextResponse.json({ error: "Personal project." }, { status: 404 });
  return NextResponse.json({ members: await orgMembersWithWallets(row.org_id) });
}
