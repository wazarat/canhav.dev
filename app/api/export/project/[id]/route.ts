import { NextResponse } from "next/server";

import { getCurve } from "@/lib/indexer";

import { getSessionUser } from "@/lib/auth";
import { buildAgentsMd, buildResourcesMd } from "@/lib/export-md";
import { gateExport, markdownResponse } from "@/lib/export-route";
import { getLinkedTokenDesign, getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Export a project the signed-in user owns, from its current draft. This is
 * where ideation happens, so unlike /api/export/p/[slug] it does not wait for
 * a publish. `?file=resources` returns RESOURCES.md, `?file=agents` returns
 * AGENTS.md built from the draft plus the linked design's draft. Anything
 * else is 404. Not the owner is 404 too, never 403, so ids stay unguessable.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateExport(req);
  if (gate) return gate;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const row = await getProject(id, user.id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const file = new URL(req.url).searchParams.get("file");
  if (file === "resources") return markdownResponse("RESOURCES.md", buildResourcesMd(row.draft_doc, true));
  if (file === "agents") {
    const linked = await getLinkedTokenDesign(row.id);
    return markdownResponse(
      "AGENTS.md",
      buildAgentsMd({
        project: row.draft_doc,
        token: linked?.draft_doc,
        deployedAddress: linked?.deployed_token_address,
        draft: true,
        curve: linked?.deployed_token_address ? await getCurve(linked?.deployed_token_address) : null,
      }),
    );
  }
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
