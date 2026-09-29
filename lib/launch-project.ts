import "server-only";

import { sectorLabels, subsectorLabels } from "@/content/ideation";
import { shapeLabels } from "@/content/kits/copy";
import type { ProjectContext } from "@/lib/ideation";
import { getProjectById, type ProjectRow } from "@/lib/ideation-db";
import { kitShapes } from "@/lib/kits";
import { getLaunchByToken } from "@/lib/launches-db";
import { docSectors } from "@/lib/sectors";

/**
 * The project side of "launch from a project". A launch records the studio
 * project it was started from on its launches row; these builders turn that
 * row into the context the form, the token page, the studio and the MCP
 * views show. Visibility is the caller's decision: sectors, subsectors and
 * shapes are shown to everyone, the name and a link only when the project is
 * published or the viewer owns it.
 */
export function projectContext(row: ProjectRow): ProjectContext {
  const doc = row.draft_doc;
  return {
    id: row.id,
    name: doc.name || "Untitled",
    status: row.status,
    slug: row.slug,
    sectors: docSectors(doc),
    subsectors: doc.subsectors ?? [],
    shapes: kitShapes(doc.kit),
    sectorLabels: sectorLabels(doc),
    subsectorLabels: subsectorLabels(doc),
    shapeLabels: shapeLabels(doc.kit),
    publicUrl:
      row.status === "published" && row.slug ? `https://www.canhav.com/p/${row.slug}` : null,
  };
}

/** The project a token was launched from, with its owner, or null. */
export async function getLaunchProjectSummary(
  tokenAddress: string,
): Promise<{ ownerId: string; project: ProjectContext } | null> {
  const launch = await getLaunchByToken(tokenAddress);
  if (!launch?.project_id) return null;
  const row = await getProjectById(launch.project_id);
  if (!row) return null;
  return { ownerId: row.owner_id, project: projectContext(row) };
}
