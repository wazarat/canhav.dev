import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { authGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { projectChainOf } from "@/lib/chains";
import { findToken } from "@/lib/indexer";
import { chainMismatch, createProjectForToken } from "@/lib/launch-project";
import { getLaunchByToken, launchRowChain, setLaunchProject } from "@/lib/launches-db";

export const runtime = "nodejs";

/**
 * Link, move or unlink the project of a launch after the fact (M56). Only a
 * launch the account already recorded qualifies, so the freshness window on
 * POST /api/launches stays the one way to claim a token. The body carries
 * `projectId` (a uuid, or null to unlink) or `createProject: true`, which
 * starts a draft named after the token on the token's chain and links it.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;

  const address = (await ctx.params).address.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address))
    return NextResponse.json({ error: "Invalid token address." }, { status: 400 });

  let projectId: string | null = null;
  let create = false;
  try {
    const body = await req.json();
    if (body.createProject === true) create = true;
    else if (body.projectId === null) projectId = null;
    else if (typeof body.projectId === "string" && /^[0-9a-f-]{36}$/.test(body.projectId))
      projectId = body.projectId;
    else return NextResponse.json({ error: "Invalid project." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const launch = await getLaunchByToken(address);
  if (!launch || launch.owner_id !== gate.id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  const chain = launchRowChain(launch);

  let linked: { id: string; name: string } | null = null;
  if (create) {
    const token = await findToken(address);
    const row = await createProjectForToken(gate.id, { name: token?.name ?? "", chain });
    if (!row) return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
    projectId = row.id;
    linked = { id: row.id, name: row.draft_doc.name };
  } else if (projectId) {
    // A launch may only be attached to a project the same account owns.
    const project = await getProject(projectId, gate.id);
    if (!project)
      return NextResponse.json({ error: "That project is not yours." }, { status: 403 });
    // A token is linked to a project on the chain it launched on (M54).
    if (projectChainOf(project.draft_doc) !== chain)
      return NextResponse.json(
        { error: chainMismatch(projectChainOf(project.draft_doc), chain), code: "chain_mismatch" },
        { status: 409 },
      );
    linked = { id: project.id, name: project.draft_doc.name };
  }

  const ok = await setLaunchProject(address, gate.id, projectId);
  if (ok === null) return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });

  revalidatePath("/studio");
  revalidatePath(`/launch/t/${address}`);
  for (const id of [launch.project_id, projectId]) if (id) revalidatePath(`/studio/project/${id}`);
  return NextResponse.json({ ok: true, project: linked });
}
