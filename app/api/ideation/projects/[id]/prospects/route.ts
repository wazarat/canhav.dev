import { NextResponse } from "next/server";
import { z } from "zod";

import { firstIssue } from "@/lib/agent-writes";
import { projectPlusGate } from "@/lib/ideation-api";
import { PROSPECT_LIMITS, prospectInputSchema } from "@/lib/prospects";
import { listProspects, upsertProspects } from "@/lib/prospects-db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** The project's prospects (M158), Studio+ under icp, the team only. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "icp");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json({ prospects: await listProspects(id) });
}

const bodySchema = z.object({ rows: z.array(prospectInputSchema).min(1).max(PROSPECT_LIMITS.upsert.max) });

/** Add or update rows; a row with an id updates that row. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "icp");
  if (gate instanceof NextResponse) return gate;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const saved = await upsertProspects(id, gate.id, parsed.data.rows);
  if (!saved.ok) return NextResponse.json({ error: saved.message }, { status: 400 });
  return NextResponse.json({ prospects: saved.prospects });
}
