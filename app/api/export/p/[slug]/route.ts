import { NextResponse } from "next/server";

import { buildAgentsMd, buildProjectMarkdown } from "@/lib/export-md";
import { gateExport, markdownResponse } from "@/lib/export-route";
import {
  getLinkedTokenDesign,
  getProjectBySlug,
  getSnapshot,
} from "@/lib/ideation-db";

export const runtime = "nodejs";

/**
 * Export a published project: `?file=agents` → AGENTS.md (merging the
 * linked token design's published snapshot when linked), default →
 * canhav-[slug].md. Always the published snapshot, never the draft.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const gate = await gateExport(req);
  if (gate) return gate;

  const { slug } = await params;
  const row = await getProjectBySlug(slug);
  if (!row?.published_hash) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const snapshot = await getSnapshot(row.published_hash);
  if (!snapshot || snapshot.doc.kind !== "project")
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const file = new URL(req.url).searchParams.get("file");
  if (file === "agents") {
    const linked = await getLinkedTokenDesign(row.id);
    const linkedSnap =
      linked?.status === "published" && linked.published_hash
        ? await getSnapshot(linked.published_hash)
        : null;
    return markdownResponse(
      "AGENTS.md",
      buildAgentsMd({
        project: snapshot.doc,
        token: linkedSnap?.doc.kind === "token_design" ? linkedSnap.doc : undefined,
        deployedAddress: linked?.deployed_token_address,
      }),
    );
  }

  const publishedAt = new Date(snapshot.created_at).toISOString().slice(0, 10);
  return markdownResponse(
    `canhav-${slug}.md`,
    buildProjectMarkdown(snapshot.doc, publishedAt),
  );
}
