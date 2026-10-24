import { NextResponse } from "next/server";

import { getCurve } from "@/lib/indexer";

import { brandFile, buildAgentsMd, buildResourcesMd } from "@/lib/export-md";
import { buildDeckMd, buildGrantsMd, buildOnepagerMd } from "@/lib/export-pack";
import { exportOwner, markdownResponse } from "@/lib/export-route";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { stripPlusFields } from "@/lib/plan-fields";
import { projectPlus } from "@/lib/plan-project";
import { getLinkedTokenDesign, getProject, designDeployChain } from "@/lib/ideation-db";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Export a project the signed-in user owns, from its current draft. This is
 * where ideation happens, so unlike /api/export/p/[slug] it does not wait for
 * a publish. `?file=resources` returns RESOURCES.md, `?file=agents` returns
 * AGENTS.md built from the draft plus the linked design's draft. Anything
 * else is 404. Not the owner is 404 too, never 403, so ids stay unguessable.
 * A project key (M111) in the Authorization header stands in for the session.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  // A project key or the session (M111).
  const owner = await exportOwner(req, id);
  if (owner instanceof NextResponse) return owner;
  const row = await getProject(id, owner);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const file = new URL(req.url).searchParams.get("file");
  // The Studio+ files answer only while the project's team is on the plan, and
  // the other files are built without the paid blocks (M134).
  const plus = await projectPlus(row);
  const draft = plus ? row.draft_doc : stripPlusFields(row.draft_doc);
  if (!plus && (file === "brand" || file === "onepager" || file === "deck" || file === "grants"))
    return NextResponse.json({ error: STUDIO_PLUS_COPY.gate.project, code: "plus_required" }, { status: 404 });
  if (file === "resources") return markdownResponse("RESOURCES.md", buildResourcesMd(draft, true));
  // The brand kit as one file (M118) that the agent and the public page both read.
  if (file === "brand") {
    const linked = await getLinkedTokenDesign(row.id);
    return new NextResponse(JSON.stringify(brandFile(row.draft_doc, linked?.draft_doc.ticker ?? null), null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="brand.json"', "Cache-Control": "no-store" },
    });
  }
  // The investor and grant pack (M126) as three markdown files.
  if (file === "onepager") return markdownResponse("ONEPAGER.md", buildOnepagerMd(row.draft_doc));
  if (file === "deck") return markdownResponse("DECK.md", buildDeckMd(row.draft_doc));
  if (file === "grants") return markdownResponse("GRANTS.md", buildGrantsMd(row.draft_doc));
  if (file === "agents") {
    const linked = await getLinkedTokenDesign(row.id);
    return markdownResponse(
      "AGENTS.md",
      buildAgentsMd({
        project: draft,
        token: linked?.draft_doc,
        deployedAddress: linked?.deployed_token_address,
        draft: true,
        curve: linked?.deployed_token_address ? await getCurve(linked.deployed_token_address, designDeployChain(linked)) : null,
      }),
    );
  }
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
