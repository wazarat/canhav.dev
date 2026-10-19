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
import { type LaunchRow, getLaunchByToken, getLaunchesByOwner, getLaunchesByProject, launchRowChain, setLaunchProject } from "@/lib/launches-db";
import { ownedLaunch } from "@/lib/launch-ownership";
import { findToken } from "@/lib/indexer";
import { LAUNCH_REF_HINT, type LaunchRef, matchLaunchRef, parseLaunchRef, shortAddress } from "@/lib/launch-ref";
import { type Owner, ownedBy } from "@/lib/owner";
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
    mainnet: doc.mainnet ?? null,
    website: doc.website ?? null,
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
  /** The team the project belongs to (M107), when the session is on one. */
  orgId: string | null = null,
): Promise<ProjectRow | null> {
  const doc = emptyProjectDoc(input.name.trim().slice(0, PROJECT_LIMITS.name.max));
  doc.chain = input.chain;
  doc.whatItDoes = (input.description ?? "").trim().slice(0, PROJECT_LIMITS.whatItDoes.max);
  return createProject(ownerId, doc, orgId);
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

// ---------------------------------------------------------------------------
// Linking a launch by reference (M89). One rule for the studio paste field
// and the MCP link tools: the account must own the launch (its row, or the
// creator wallet), a project must be the account's and on the launch's
// chain, and a short reference must name exactly one of the account's
// launches.

export type LinkLaunchResult =
  | { ok: true; address: string; name: string | null; project: { id: string; name: string } | null; previousProjectId: string | null }
  | { ok: false; message: string; code: "bad_ref" | "not_owned" | "ambiguous" | "not_yours" | "chain_mismatch" | "not_linked_here" | "storage" };

/** The launch a reference names, among what the account owns. */
export async function resolveOwnedLaunch(
  raw: string,
  owner: Owner,
): Promise<{ ok: true; launch: LaunchRow } | { ok: false; message: string; code: "bad_ref" | "not_owned" | "ambiguous" }> {
  const ref: LaunchRef | null = parseLaunchRef(raw);
  if (!ref) return { ok: false, code: "bad_ref", message: `${raw.trim() || "Nothing"} is not a token reference. Send ${LAUNCH_REF_HINT}.` };
  if (ref.kind === "address") {
    const launch = await ownedLaunch(ref.address, owner);
    if (!launch) return { ok: false, code: "not_owned", message: `${shortAddress(ref.address)} is not a launch this account owns. It has to be recorded to the account, or created by a wallet verified on it.` };
    return { ok: true, launch };
  }
  const mine = (await getLaunchesByOwner(owner)) ?? [];
  const match = matchLaunchRef(ref, mine);
  if (match.status === "one") return { ok: true, launch: match.launch };
  if (match.status === "many")
    return { ok: false, code: "ambiguous", message: `${raw.trim()} matches ${match.launches.length} of this account's launches (${match.launches.map((l) => shortAddress(l.token_address)).join(", ")}). Send the full address.` };
  return { ok: false, code: "not_owned", message: `${raw.trim()} matches none of this account's launches. Read get_my_launches on the shared server, or send the full address.` };
}

/**
 * Link a launch to a project, or unlink it (projectId null). `onlyFrom`
 * makes an unlink refuse when the launch is linked to another project, the
 * rule a project-scoped tool wants.
 */
export async function linkLaunch(
  raw: string,
  owner: Owner,
  projectId: string | null,
  opts: { onlyFrom?: string } = {},
): Promise<LinkLaunchResult> {
  const resolved = await resolveOwnedLaunch(raw, owner);
  if (!resolved.ok) return resolved;
  const launch = resolved.launch;
  const address = launch.token_address.toLowerCase();
  const chain = launchRowChain(launch);
  let project: { id: string; name: string } | null = null;
  let orgId: string | null = null;
  if (projectId) {
    const row = await getProjectById(projectId);
    if (!row || !ownedBy(row, owner)) return { ok: false, code: "not_yours", message: "That project is not yours." };
    orgId = row.org_id ?? null;
    if (projectChainOf(row.draft_doc) !== chain)
      return { ok: false, code: "chain_mismatch", message: chainMismatch(projectChainOf(row.draft_doc), chain) };
    project = { id: row.id, name: row.draft_doc.name };
  } else if (opts.onlyFrom && launch.project_id !== opts.onlyFrom) {
    return {
      ok: false,
      code: "not_linked_here",
      message: launch.project_id
        ? `${shortAddress(address)} is linked to another project, so this project's server cannot unlink it.`
        : `${shortAddress(address)} is not linked to any project.`,
    };
  }
  const ok = await setLaunchProject(address, owner, projectId, orgId);
  if (ok === null) return { ok: false, code: "storage", message: "Storage not configured." };
  if (!ok) return { ok: false, code: "not_owned", message: `${shortAddress(address)} is not a launch this account owns.` };
  const token = await findToken(address);
  return { ok: true, address, name: token?.name ?? null, project, previousProjectId: launch.project_id };
}
