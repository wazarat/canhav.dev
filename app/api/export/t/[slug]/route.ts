import { NextResponse } from "next/server";

import { tokenBuildRowsOf } from "@/content/token-steps";
import { getCurve } from "@/lib/indexer";

import { buildAgentsMd, buildTokenDesignMarkdown } from "@/lib/export-md";
import { gateExport, markdownResponse } from "@/lib/export-route";
import { getLinkedProject, getSnapshot, getTokenDesignBySlug } from "@/lib/ideation-db";

export const runtime = "nodejs";

/**
 * Export a published token design: `?file=agents` → AGENTS.md (merging the
 * linked project's published snapshot when linked), default →
 * canhav-[slug].md. Always the published snapshot, never the draft.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const gate = await gateExport(req);
  if (gate) return gate;

  const { slug } = await params;
  const row = await getTokenDesignBySlug(slug);
  if (!row?.published_hash) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const snapshot = await getSnapshot(row.published_hash);
  if (!snapshot || snapshot.doc.kind !== "token_design")
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const file = new URL(req.url).searchParams.get("file");
  if (file === "agents") {
    const linked = await getLinkedProject(row.id);
    const linkedSnap =
      linked?.status === "published" && linked.published_hash
        ? await getSnapshot(linked.published_hash)
        : null;
    return markdownResponse(
      "AGENTS.md",
      buildAgentsMd({
        project: linkedSnap?.doc.kind === "project" ? linkedSnap.doc : undefined,
        token: snapshot.doc,
        deployedAddress: row.deployed_token_address,
        curve: row.deployed_token_address ? await getCurve(row.deployed_token_address) : null,
      }),
    );
  }

  const publishedAt = new Date(snapshot.created_at).toISOString().slice(0, 10);
  // Build steps (M46). Ticks come from the draft, the launch rows from the row and the curve.
  const linkedForBuild = await getLinkedProject(row.id);
  const build = tokenBuildRowsOf(row.draft_doc, {
    published: true,
    linked: linkedForBuild !== null,
    deployedAddress: row.deployed_token_address ?? null,
    curve: row.deployed_token_address ? await getCurve(row.deployed_token_address) : null,
    now: Math.floor(Date.now() / 1000),
  });
  return markdownResponse(
    `canhav-${slug}.md`,
    buildTokenDesignMarkdown(snapshot.doc, publishedAt, build),
  );
}
