import { NextResponse } from "next/server";

import { listAlerts } from "@/lib/alerts/db";
import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { alertsSecret } from "@/lib/secrets";

export const runtime = "nodejs";

/** The project's alert rules, channels (masked) and last events (M123), Studio+. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await plusGate("monitoring");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const alerts = await listAlerts(id);
  return NextResponse.json({ ...alerts, configured: Boolean(alertsSecret()) });
}
