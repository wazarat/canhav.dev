import { NextResponse } from "next/server";

import { listAlerts } from "@/lib/alerts/db";
import { telegramAvailable } from "@/lib/alerts/telegram";
import { syncWatch } from "@/lib/alerts/watch";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { alertsSecret } from "@/lib/secrets";

export const runtime = "nodejs";

/**
 * The project's alert rules, channels (masked), last events, the Watch
 * switch and the worker's heartbeat (M123, M128), Studio+. When the switch
 * is on the watch rules are brought in line with the record first, so a
 * contract recorded since is watched.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "monitoring");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await syncWatch(project, gate.id);
  const alerts = await listAlerts(id);
  return NextResponse.json({ ...alerts, telegram: { available: telegramAvailable() }, configured: Boolean(alertsSecret()) });
}
