import "server-only";

import { sectorLabels, subsectorLabels } from "@/content/ideation";
import { shapeLabels } from "@/content/kits/copy";
import { type ProjectChain, chainInfo, projectChainOf } from "@/lib/chains";
import { PROJECT_LIMITS, type ProjectContext, emptyProjectDoc } from "@/lib/ideation";
import {
  createProject,
  getLinkedTokenDesign,
  getProjectById,
  type ProjectRow,
} from "@/lib/ideation-db";
import { kitShapes } from "@/lib/kits";
import { getLaunchByToken, getLaunchesByProject } from "@/lib/launches-db";
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
    chain: projectChainOf(doc),
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

/**
 * A draft project started from a launched token (M56). Named after the
 * token, on the token's chain, with the token description as the opening
 * answer to what it does. Everything else is left for the studio.
 */
export async function createProjectForToken(
  ownerId: string,
  input: { name: string; description?: string | null; chain: ProjectChain },
): Promise<ProjectRow | null> {
  const doc = emptyProjectDoc(input.name.trim().slice(0, PROJECT_LIMITS.name.max));
  doc.chain = input.chain;
  doc.whatItDoes = (input.description ?? "").trim().slice(0, PROJECT_LIMITS.whatItDoes.max);
  return createProject(ownerId, doc);
}

/** Shown when a launch and a project sit on different chains. */
export function chainMismatch(projectChain: ProjectChain, tokenChain: ProjectChain): string {
  return `This project builds on ${chainInfo(projectChain).name}, and this token launched on ${chainInfo(tokenChain).name}. A token is linked to a project on the same chain.`;
}

/** Shown when a change of chain is refused. */
export const CHAIN_LOCKED =
  "A token has launched from this project, so its chain is fixed.";

/**
 * True once a token exists for the project, a launch started from it or a
 * deployed linked design. From then on the project's chain cannot change,
 * because a token stays on the chain it launched on (M52).
 */
export async function projectChainLocked(projectId: string): Promise<boolean> {
  const [launches, design] = await Promise.all([
    getLaunchesByProject(projectId),
    getLinkedTokenDesign(projectId),
  ]);
  return (launches?.length ?? 0) > 0 || Boolean(design?.deployed_token_address);
}
