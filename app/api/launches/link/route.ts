import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { authGate } from "@/lib/ideation-api";
import { linkLaunch } from "@/lib/launch-project";

export const runtime = "nodejs";

/**
 * Link a launch to a project by reference (M89): a full address, the short
 * form the studio shows, or the token page link. The same rule the MCP
 * link_launch tool applies. Body: `ref` and `projectId` (null unlinks).
 */
export async function POST(req: Request) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  let ref = "";
  let projectId: string | null = null;
  try {
    const body = await req.json();
    if (typeof body.ref !== "string") throw new Error();
    ref = body.ref;
    if (body.projectId === null) projectId = null;
    else if (typeof body.projectId === "string" && /^[0-9a-f-]{36}$/.test(body.projectId)) projectId = body.projectId;
    else throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const result = await linkLaunch(ref, gate.owner, projectId);
  if (!result.ok) {
    const status = result.code === "storage" ? 503 : result.code === "not_yours" ? 403 : result.code === "chain_mismatch" ? 409 : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  revalidatePath("/studio");
  revalidatePath(`/launch/t/${result.address}`);
  for (const id of [result.previousProjectId, projectId]) if (id) revalidatePath(`/studio/project/${id}`);
  return NextResponse.json({ ok: true, address: result.address, project: result.project });
}
