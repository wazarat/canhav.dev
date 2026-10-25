import "server-only";

import { DEFAULT_PROJECT_CHAIN, type ProjectChain, chainByChainId, chainInfo } from "@/lib/chains";
import { getDb } from "@/lib/db";
import type { JourneyDoc } from "@/lib/journey";
import { type Owner, ownedBy } from "@/lib/owner";
import { publishedCompetitors } from "@/lib/competitors/record";
import { publishedExperiments } from "@/lib/experiments";
import { recordRevision } from "@/lib/revisions-db";
import { revisionAuthor } from "@/lib/revisions";
import {
  type IdeationDoc,
  type ProjectDoc,
  type TokenDesignDoc,
  canonicalizeIdeationDoc,
  hashIdeationDoc,
  normalizeProjectDoc,
  normalizeTokenDesignDoc,
  validateIdeationDoc,
} from "@/lib/ideation";

/**
 * Neon queries for the ideation tracks. Every function returns null (or an
 * error result) instead of throwing on missing config, matching lib/db.ts.
 * Ownership is enforced here — every scoped query admits the account that
 * made the record or a member of the team it was moved to (M107).
 */

// The ownership predicate is written out in every query because the neon
// tagged template does not compose fragments:
//   (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
// An empty orgIds array matches nothing, so a personal session reads as before.

export interface ProjectRow {
  id: string;
  owner_id: string;
  /** The team the record was moved to (M107). Null or absent means personal. */
  org_id?: string | null;
  /** Private keeps a published project off the listings (M109). Absent reads as public. */
  visibility?: "public" | "private";
  /** The share link token of a private project, minted at its first private publish (M109). */
  share_token?: string | null;
  /** The custom host that serves the public page (M127, Studio+). */
  custom_domain?: string | null;
  slug: string | null;
  status: "draft" | "published";
  draft_doc: ProjectDoc;
  published_hash: string | null;
  verify_wallet: string | null;
  github_repo: string | null;
  /** Absent on rows read before scripts/db-setup.mjs added the columns (M39). */
  agent_write_mode?: "off" | "propose" | "direct";
  agent_rev?: number;
  created_at: string;
  updated_at: string;
}

export interface TokenDesignRow {
  id: string;
  owner_id: string;
  /** The team the record was moved to (M107). Null or absent means personal. */
  org_id?: string | null;
  slug: string | null;
  status: "draft" | "published";
  draft_doc: TokenDesignDoc;
  published_hash: string | null;
  verify_wallet: string | null;
  deployed_token_address: string | null;
  deployed_by_wallet: string | null;
  deployed_snapshot_hash: string | null;
  deployed_at: string | null;
  /** The chain the design's token is on (M54). Null or absent reads as Robinhood. */
  deployed_chain_id?: number | null;
  /** Absent on rows read before scripts/db-setup.mjs added the column (M39). */
  agent_rev?: number;
  created_at: string;
  updated_at: string;
}

export interface SnapshotRow {
  snapshot_hash: string;
  entity_type: "project" | "token_design";
  entity_id: string;
  version: number;
  doc: IdeationDoc;
  canonical: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Projects

/** Read choke point: every project row leaves this module current-shape. */
function mapProjectRow(row: ProjectRow | undefined): ProjectRow | null {
  if (!row) return null;
  return { ...row, draft_doc: normalizeProjectDoc(row.draft_doc) };
}

/** The read choke point for token designs (M46). Only the build step ticks are normalised. */
function mapTokenDesignRow(row: TokenDesignRow | undefined): TokenDesignRow | null {
  if (!row) return null;
  return { ...row, draft_doc: normalizeTokenDesignDoc(row.draft_doc) };
}

export async function createProject(ownerId: string, doc: ProjectDoc, orgId: string | null = null): Promise<ProjectRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    insert into launchpad.projects (owner_id, org_id, draft_doc)
    values (${ownerId}, ${orgId}, ${JSON.stringify(doc)})
    returning *
  `;
  return (rows[0] as ProjectRow) ?? null;
}

export async function getMyProjects(owner: Owner): Promise<ProjectRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.projects
    where (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
    order by updated_at desc
  `;
  return (rows as ProjectRow[]).map((r) => mapProjectRow(r) as ProjectRow);
}

/**
 * A project by id with no owner scope. Only lib/launch-project.ts calls it,
 * to resolve the project a launch was started from; the caller decides what
 * of it a viewer may see.
 */
export async function getProjectById(id: string): Promise<ProjectRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`select * from launchpad.projects where id = ${id}`;
  return mapProjectRow(rows[0] as ProjectRow | undefined);
}

export async function getProject(id: string, owner: Owner): Promise<ProjectRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.projects where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
  `;
  return mapProjectRow(rows[0] as ProjectRow | undefined);
}

/** What a draft save came to. "stale" means an agent write landed after the editor loaded. */
export type DraftSaveResult = "saved" | "stale" | "missing";

/**
 * Autosave from the editor. `rev` is the agent_rev the editor loaded with;
 * when given, the save is refused if an agent write has landed since, so the
 * editor's older copy cannot overwrite it. Omitted by editors that loaded a
 * row from before the agent_rev column existed.
 */
export async function updateProjectDraft(
  id: string,
  owner: Owner,
  doc: ProjectDoc,
  rev?: number,
): Promise<DraftSaveResult> {
  const sql = getDb();
  if (!sql) return "missing";
  const rows =
    rev === undefined
      ? await sql`
          update launchpad.projects
          set draft_doc = ${JSON.stringify(doc)},
              github_repo = ${doc.githubRepo ?? null},
              verify_wallet = ${doc.verifyWallet ?? null},
              updated_at = now()
          where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
          returning id, owner_id
        `
      : await sql`
          update launchpad.projects
          set draft_doc = ${JSON.stringify(doc)},
              github_repo = ${doc.githubRepo ?? null},
              verify_wallet = ${doc.verifyWallet ?? null},
              updated_at = now()
          where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) and agent_rev = ${rev}
          returning id, owner_id
        `;
  if (rows.length > 0) {
    // Version history (M110): one row per save, by the owner or a teammate.
    const saver = (rows[0] as { owner_id: string }).owner_id === owner.userId ? revisionAuthor("owner") : revisionAuthor("owner", owner.userId);
    await recordRevision("project", id, doc, saver);
    return "saved";
  }
  if (rev === undefined) return "missing";
  return (await getProject(id, owner)) ? "stale" : "missing";
}

export async function deleteProjectDraft(id: string, owner: Owner): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    delete from launchpad.projects
    where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) and status = 'draft'
    returning id
  `;
  if (rows.length === 0) return false;
  await deleteEntityLinks(sql, "project", id);
  return true;
}

/**
 * entity_links has no foreign keys, so a deleted draft must take its link
 * rows with it or the partial unique indexes keep the other side from ever
 * linking again. Snapshots are left alone; a hash stays resolvable.
 */
async function deleteEntityLinks(
  sql: NonNullable<ReturnType<typeof getDb>>,
  type: "project" | "token_design",
  id: string,
): Promise<void> {
  await sql`
    delete from launchpad.entity_links
    where (a_type = ${type} and a_id = ${id}) or (b_type = ${type} and b_id = ${id})
  `;
}

export async function getProjectBySlug(slug: string): Promise<ProjectRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.projects where slug = ${slug} and status = 'published'
  `;
  return mapProjectRow(rows[0] as ProjectRow | undefined);
}

/** Store or clear the custom domain of a project the owner holds (M127). */
export async function setCustomDomain(id: string, owner: Owner, domain: string | null): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const rows = await sql`
      update launchpad.projects set custom_domain = ${domain}, updated_at = now()
      where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
      returning id
    `;
    return rows.length > 0;
  } catch (err) {
    console.error("[ideation] custom domain failed", err);
    return false;
  }
}

export async function getPublishedProjects(limit = 60): Promise<ProjectRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.projects
    where status = 'published' and visibility = 'public'
    order by updated_at desc
    limit ${limit}
  `;
  return (rows as ProjectRow[]).map((r) => mapProjectRow(r) as ProjectRow);
}

/**
 * The published public projects on a chain (M164), for the gap map, with
 * how many tokens each launched. Reads the draft document like the public
 * page does; the chain is read from the document, absent reads as
 * Robinhood.
 */
export async function getPublishedProjectsOnChain(chain: string): Promise<Array<{ row: ProjectRow; launches: number }> | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select p.*, (select count(*)::int from launchpad.launches l where l.project_id = p.id) as launches
    from launchpad.projects p
    where p.status = 'published' and p.visibility = 'public'
      and coalesce(p.draft_doc->>'chain', 'robinhood_testnet') = ${chain}
    order by p.updated_at desc
    limit 500
  `;
  return (rows as Array<ProjectRow & { launches: number }>).map(({ launches, ...r }) => ({ row: mapProjectRow(r) as ProjectRow, launches }));
}

/** The owner's published private projects other than one (M109), for the free allowance. */
export async function countPrivateProjects(owner: Owner, excludeId: string): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;
  const rows = await sql`
    select count(*)::int as n from launchpad.projects
    where status = 'published' and visibility = 'private' and id <> ${excludeId}
      and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
  `;
  return (rows[0] as { n: number } | undefined)?.n ?? 0;
}

/** Whether a viewer may open a private project's page (M109): the share token, or membership. */
export function projectVisibleTo(row: ProjectRow, share: string | null | undefined, owner: Owner | null | undefined): boolean {
  if ((row.visibility ?? "public") === "public") return true;
  if (share && row.share_token && share === row.share_token) return true;
  return ownedBy(row, owner);
}

/** The public page path of a project, with the share token when it is private (M109). */
export function projectPublicPath(row: Pick<ProjectRow, "slug" | "visibility" | "share_token">): string | null {
  if (!row.slug) return null;
  return row.visibility === "private" && row.share_token ? `/p/${row.slug}?s=${row.share_token}` : `/p/${row.slug}`;
}

/**
 * Move a personal project to a team (M107): the project, its linked token
 * design and the launches started from it take the organization id, so
 * every member sees the whole set. Only the account that made the project
 * may move it, and only once; a record on a team stays there.
 */
export async function moveProjectToTeam(projectId: string, userId: string, orgId: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    update launchpad.projects set org_id = ${orgId}, updated_at = now()
    where id = ${projectId} and owner_id = ${userId} and org_id is null
    returning id
  `;
  if (rows.length === 0) return false;
  await sql`
    update launchpad.token_designs set org_id = ${orgId}, updated_at = now()
    where org_id is null and id in (
      select b_id from launchpad.entity_links
      where a_type = 'project' and a_id = ${projectId} and b_type = 'token_design'
    )
  `;
  await sql`update launchpad.launches set org_id = ${orgId} where project_id = ${projectId}`;
  return true;
}

// ---------------------------------------------------------------------------
// Token designs

export async function createTokenDesign(
  ownerId: string,
  doc: TokenDesignDoc,
  orgId: string | null = null,
): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    insert into launchpad.token_designs (owner_id, org_id, draft_doc)
    values (${ownerId}, ${orgId}, ${JSON.stringify(doc)})
    returning *
  `;
  return (rows[0] as TokenDesignRow) ?? null;
}

export async function getMyTokenDesigns(owner: Owner): Promise<TokenDesignRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs
    where (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
    order by updated_at desc
  `;
  return (rows as TokenDesignRow[]).map((r) => mapTokenDesignRow(r) as TokenDesignRow);
}

export async function getTokenDesign(id: string, owner: Owner): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
  `;
  return mapTokenDesignRow(rows[0] as TokenDesignRow | undefined);
}

export async function updateTokenDesignDraft(
  id: string,
  owner: Owner,
  doc: TokenDesignDoc,
  rev?: number,
): Promise<DraftSaveResult> {
  const sql = getDb();
  if (!sql) return "missing";
  const rows =
    rev === undefined
      ? await sql`
          update launchpad.token_designs
          set draft_doc = ${JSON.stringify(doc)}, updated_at = now()
          where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
          returning id, owner_id
        `
      : await sql`
          update launchpad.token_designs
          set draft_doc = ${JSON.stringify(doc)}, updated_at = now()
          where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) and agent_rev = ${rev}
          returning id, owner_id
        `;
  if (rows.length > 0) {
    const saver = (rows[0] as { owner_id: string }).owner_id === owner.userId ? revisionAuthor("owner") : revisionAuthor("owner", owner.userId);
    await recordRevision("token_design", id, doc, saver);
    return "saved";
  }
  if (rev === undefined) return "missing";
  return (await getTokenDesign(id, owner)) ? "stale" : "missing";
}

export async function deleteTokenDesignDraft(id: string, owner: Owner): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    delete from launchpad.token_designs
    where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) and status = 'draft'
      and deployed_token_address is null
    returning id
  `;
  if (rows.length === 0) return false;
  await deleteEntityLinks(sql, "token_design", id);
  return true;
}

export async function getTokenDesignBySlug(slug: string): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs where slug = ${slug} and status = 'published'
  `;
  return mapTokenDesignRow(rows[0] as TokenDesignRow | undefined);
}

export async function getTokenDesignByAddress(address: string): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs
    where deployed_token_address = ${address.toLowerCase()}
  `;
  return mapTokenDesignRow(rows[0] as TokenDesignRow | undefined);
}

/** Published design by id — public data, used to prefill the launch form. */
export async function getPublishedTokenDesignById(id: string): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs where id = ${id} and status = 'published'
  `;
  return mapTokenDesignRow(rows[0] as TokenDesignRow | undefined);
}

export async function getPublishedTokenDesigns(limit = 60): Promise<TokenDesignRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs
    where status = 'published'
    order by updated_at desc
    limit ${limit}
  `;
  return rows as TokenDesignRow[];
}

/**
 * Published designs sharing a name or ticker, for the design-form identity
 * check. Published only: matching other users' drafts would leak their
 * existence. Case-insensitive exact match.
 */
export async function findPublishedDesignsByNameOrTicker(
  name: string,
  ticker: string,
  excludeId?: string,
): Promise<Array<{ slug: string | null; name: string; ticker: string }> | null> {
  const sql = getDb();
  if (!sql) return null;
  const nameNorm = name.trim().toLowerCase();
  const tickerNorm = ticker.trim().toUpperCase();
  if (!nameNorm && !tickerNorm) return [];
  const rows = await sql`
    select slug,
           draft_doc->>'name' as name,
           draft_doc->>'ticker' as ticker
    from launchpad.token_designs
    where status = 'published'
      and id::text <> ${excludeId ?? ""}
      and (
        (${nameNorm} <> '' and lower(draft_doc->>'name') = ${nameNorm})
        or (${tickerNorm} <> '' and upper(draft_doc->>'ticker') = ${tickerNorm})
      )
    limit 5
  `;
  return rows as Array<{ slug: string | null; name: string; ticker: string }>;
}

export async function attachDeploy(
  id: string,
  owner: Owner,
  tokenAddress: string,
  deployedBy: string,
  snapshotHash: string,
  chain: ProjectChain = DEFAULT_PROJECT_CHAIN,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  // Robinhood leaves deployed_chain_id null, which reads as Robinhood, so
  // this also works before the M54 column exists. Another chain needs it.
  if (chain !== DEFAULT_PROJECT_CHAIN) {
    const rows = await sql`
      update launchpad.token_designs
      set deployed_token_address = ${tokenAddress.toLowerCase()},
          deployed_by_wallet = ${deployedBy.toLowerCase()},
          deployed_snapshot_hash = ${snapshotHash},
          deployed_chain_id = ${chainInfo(chain).chainId},
          deployed_at = now(),
          updated_at = now()
      where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) and deployed_token_address is null
      returning id
    `;
    return rows.length > 0;
  }
  const rows = await sql`
    update launchpad.token_designs
    set deployed_token_address = ${tokenAddress.toLowerCase()},
        deployed_by_wallet = ${deployedBy.toLowerCase()},
        deployed_snapshot_hash = ${snapshotHash},
        deployed_at = now(),
        updated_at = now()
    where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) and deployed_token_address is null
    returning id
  `;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Publishing — slug assignment + content-addressed snapshot

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return base.length >= 3 ? base : `idea-${base || "x"}`;
}

type EntityTable = "projects" | "token_designs";

async function uniqueSlug(
  sql: NonNullable<ReturnType<typeof getDb>>,
  table: EntityTable,
  base: string,
): Promise<string> {
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const rows =
      table === "projects"
        ? await sql`select 1 from launchpad.projects where slug = ${candidate}`
        : await sql`select 1 from launchpad.token_designs where slug = ${candidate}`;
    if (rows.length === 0) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export type PublishResult =
  | { ok: true; slug: string; hash: string; version: number; unchanged: boolean; visibility: "public" | "private"; shareToken: string | null }
  | { ok: false; error: string; status: number };

/** 16 random bytes as base64url, the share link token (M109). */
function mintShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/** Doc equality ignoring the publish counter — used for no-op republish. */
function sameContent(a: IdeationDoc, b: IdeationDoc): boolean {
  const strip = (d: IdeationDoc) => canonicalizeIdeationDoc({ ...d, publishVersion: 0 });
  return strip(a) === strip(b);
}

export async function publishEntity(
  table: EntityTable,
  id: string,
  owner: Owner,
  /**
   * Projects only (M109): the visibility to publish with (the row's current
   * one when left out) and how many private projects the owner may have
   * besides this one (null for no cap). A token design is always public,
   * its snapshot hash is what a launch commits on chain.
   */
  opts: { visibility?: "public" | "private"; privateCap?: number | null; privateCapMessage?: string; plus?: boolean } = {},
): Promise<PublishResult> {
  const sql = getDb();
  if (!sql) return { ok: false, error: "Storage not configured.", status: 503 };

  const row =
    table === "projects" ? await getProject(id, owner) : await getTokenDesign(id, owner);
  if (!row) return { ok: false, error: "Not found.", status: 404 };

  const current = table === "projects" ? ((row as ProjectRow).visibility ?? "public") : "public";
  const visibility = table === "projects" ? (opts.visibility ?? current) : "public";
  if (visibility === "private" && opts.privateCap !== null && opts.privateCap !== undefined) {
    const used = await countPrivateProjects(owner, id);
    if (used >= opts.privateCap)
      return { ok: false, error: opts.privateCapMessage ?? "Private project allowance used.", status: 403 };
  }
  const shareToken =
    table === "projects"
      ? visibility === "private"
        ? ((row as ProjectRow).share_token ?? mintShareToken())
        : ((row as ProjectRow).share_token ?? null)
      : null;

  const entityType = table === "projects" ? "project" : "token_design";
  const slug = row.slug ?? (await uniqueSlug(sql, table, slugify(row.draft_doc.name)));

  const latest = await sql`
    select * from launchpad.ideation_snapshots
    where entity_type = ${entityType} and entity_id = ${id}
    order by version desc limit 1
  `;
  const latestSnap = (latest[0] as SnapshotRow) ?? null;
  const version = (latestSnap?.version ?? 0) + 1;

  // Token build step ticks (M46) stay on the draft and out of the snapshot,
  // so ticking after launch never changes the hash the launch committed.
  const { checklist: ticks, ...draftBody } = row.draft_doc as TokenDesignDoc & { checklist?: unknown };
  // A project's own files (M53) stay on the draft too. They may be paths on
  // the team's machine, which have no place on a public page.
  // The agent's summary (M104) stays on the draft as well.
  // Draft requests and drafted marks (M117) stay on the draft too.
  // The deployer env file (M138) is a path on the team's machine, so it stays on the draft too.
  // Agent requests (M151) stay on the draft too. The unit economics model (M166) too, a model is never a public claim.
  const { references: refs, summary: sum, draftRequests: dr, drafted: dm, briefs: br, githubSync: gs, investorPack: ip, updateCadence: uc, deployerEnvFile: def, agentRequests: ar, economics: ec, reach: rc, reachProtocols: rp, experiments: ex, ...projectBody } = row.draft_doc as ProjectDoc & { references?: unknown; summary?: unknown; draftRequests?: unknown; drafted?: unknown; briefs?: unknown; githubSync?: unknown; investorPack?: unknown; updateCadence?: unknown; deployerEnvFile?: unknown; agentRequests?: unknown; economics?: unknown; reach?: unknown; reachProtocols?: unknown; experiments?: unknown };
  // Competitors (M115): the public record keeps the line, not the map's state.
  const pc = publishedCompetitors((projectBody as ProjectDoc).competitors);
  if (table === "projects") {
    if (pc) (projectBody as ProjectDoc).competitors = pc;
    else delete (projectBody as { competitors?: unknown }).competitors;
    // Experiments (M170): the finished ones publish with their result; the draft keeps every one.
    const pe = publishedExperiments(ex as ProjectDoc["experiments"]);
    if (pe.length) (projectBody as ProjectDoc).experiments = pe;
  }
  const base = table === "projects" ? (projectBody as IdeationDoc) : (draftBody as IdeationDoc);
  const stamped = { ...base, slug, publishVersion: version } as IdeationDoc;
  // The Studio+ blocks publish only while the project's team is on the plan
  // (M134). The snapshot loses them; the draft keeps them, so a later plan
  // publishes them again.
  const published: IdeationDoc =
    table === "projects" && opts.plus === false
      ? (() => {
          const { canvas: _c, icp: _i, valueCanvas: _v, brand: _b, competitors: _k, assets: _s, experiments: _e, ...rest } = stamped as ProjectDoc;
          void _c; void _i; void _v; void _b; void _k; void _s; void _e;
          return rest as IdeationDoc;
        })()
      : stamped;
  const draftOut =
    table === "projects"
      ? { ...stamped, ...(refs === undefined ? {} : { references: refs }), ...(sum === undefined ? {} : { summary: sum }), ...(dr === undefined ? {} : { draftRequests: dr }), ...(dm === undefined ? {} : { drafted: dm }), ...(br === undefined ? {} : { briefs: br }), ...(gs === undefined ? {} : { githubSync: gs }), ...(ip === undefined ? {} : { investorPack: ip }), ...(uc === undefined ? {} : { updateCadence: uc }), ...(def === undefined ? {} : { deployerEnvFile: def }), ...(ar === undefined ? {} : { agentRequests: ar }), ...(ec === undefined ? {} : { economics: ec }), ...(rc === undefined ? {} : { reach: rc }), ...(rp === undefined ? {} : { reachProtocols: rp }), ...(ex === undefined ? {} : { experiments: ex }) }
      : ticks === undefined
        ? stamped
        : { ...stamped, checklist: ticks };
  const problem = validateIdeationDoc(published);
  if (problem) return { ok: false, error: problem, status: 400 };

  // Republishing identical content is a no-op — return the existing snapshot.
  // A change of visibility alone still updates the row (M109).
  if (latestSnap && row.status === "published" && sameContent(published, latestSnap.doc)) {
    if (table === "projects" && visibility !== current) {
      await sql`
        update launchpad.projects
        set visibility = ${visibility}, share_token = ${shareToken}, updated_at = now()
        where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
      `;
    }
    return {
      ok: true,
      slug,
      hash: latestSnap.snapshot_hash,
      version: latestSnap.version,
      unchanged: true,
      visibility,
      shareToken,
    };
  }

  const canonical = canonicalizeIdeationDoc(published);
  const hash = hashIdeationDoc(published);

  await sql`
    insert into launchpad.ideation_snapshots
      (snapshot_hash, entity_type, entity_id, version, doc, canonical)
    values
      (${hash}, ${entityType}, ${id}, ${version}, ${JSON.stringify(published)}, ${canonical})
    on conflict (snapshot_hash) do nothing
  `;
  if (table === "projects") {
    await sql`
      update launchpad.projects
      set slug = ${slug}, status = 'published', published_hash = ${hash},
          visibility = ${visibility}, share_token = ${shareToken},
          draft_doc = ${JSON.stringify(draftOut)}, updated_at = now()
      where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
    `;
    // One revision per publish (M116).
    await recordRevision("project", id, draftOut, revisionAuthor("publish"));
  } else {
    await sql`
      update launchpad.token_designs
      set slug = ${slug}, status = 'published', published_hash = ${hash},
          draft_doc = ${JSON.stringify(draftOut)}, updated_at = now()
      where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
    `;
  }
  return { ok: true, slug, hash, version, unchanged: false, visibility, shareToken };
}

export async function unpublishEntity(
  table: EntityTable,
  id: string,
  owner: Owner,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows =
    table === "projects"
      ? await sql`
          update launchpad.projects set status = 'draft', updated_at = now()
          where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) returning id
        `
      : await sql`
          update launchpad.token_designs set status = 'draft', updated_at = now()
          where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) returning id
        `;
  return rows.length > 0;
}

export async function getSnapshot(hash: string): Promise<SnapshotRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.ideation_snapshots where snapshot_hash = ${hash}
  `;
  const snap = (rows[0] as SnapshotRow) ?? null;
  if (snap && snap.doc.kind === "project") {
    return { ...snap, doc: normalizeProjectDoc(snap.doc) };
  }
  return snap;
}

export async function getSnapshotHistory(
  entityType: "project" | "token_design",
  entityId: string,
): Promise<SnapshotRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.ideation_snapshots
    where entity_type = ${entityType} and entity_id = ${entityId}
    order by version desc
  `;
  return rows as SnapshotRow[];
}

/**
 * The journeyHash discriminator: a hash committed by the factory resolves in
 * exactly one place. `journeys` ⇒ quick deploy (v1 JourneyDoc);
 * `ideation_snapshots` ⇒ deploy from a published design; neither ⇒ unknown.
 */
export type HashResolution =
  | { kind: "journey"; doc: JourneyDoc; creator: string }
  | { kind: "snapshot"; snapshot: SnapshotRow }
  | null;

export async function resolveHash(hash: string): Promise<HashResolution> {
  const sql = getDb();
  if (!sql) return null;
  const journeys = await sql`
    select doc, creator_address from launchpad.journeys where journey_hash = ${hash}
  `;
  if (journeys[0])
    return {
      kind: "journey",
      doc: journeys[0].doc as JourneyDoc,
      creator: journeys[0].creator_address as string,
    };
  const snap = await getSnapshot(hash);
  return snap ? { kind: "snapshot", snapshot: snap } : null;
}

// ---------------------------------------------------------------------------
// Links. For project ↔ token_design the canonical ordering ('project' <
// 'token_design') puts the project on the a-side, always.

export async function createProjectTokenLink(
  projectId: string,
  tokenDesignId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const sql = getDb();
  if (!sql) return { ok: false, error: "Storage not configured." };
  try {
    await sql`
      insert into launchpad.entity_links (a_type, a_id, b_type, b_id, created_by)
      values ('project', ${projectId}, 'token_design', ${tokenDesignId}, ${userId})
    `;
    return { ok: true };
  } catch {
    return { ok: false, error: "Already linked." };
  }
}

export async function deleteProjectTokenLink(
  projectId: string,
  tokenDesignId: string,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    delete from launchpad.entity_links
    where a_type = 'project' and a_id = ${projectId}
      and b_type = 'token_design' and b_id = ${tokenDesignId}
    returning id
  `;
  return rows.length > 0;
}

export async function getLinkedTokenDesign(projectId: string): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select t.* from launchpad.entity_links l
    join launchpad.token_designs t on t.id = l.b_id
    where l.a_type = 'project' and l.a_id = ${projectId} and l.b_type = 'token_design'
  `;
  return (rows[0] as TokenDesignRow) ?? null;
}

/**
 * Every project ↔ token-design link an owner has, in one query, keyed both
 * ways. The studio lists both tracks on one page, so per-row lookups would be
 * an N+1 against a table that is one-to-one anyway.
 */
export interface EntityLinkSummary {
  projectId: string;
  projectName: string;
  designId: string;
  designName: string;
  deployedTokenAddress: string | null;
}

export async function getEntityLinks(owner: Owner): Promise<{
  byProject: Map<string, EntityLinkSummary>;
  byDesign: Map<string, EntityLinkSummary>;
}> {
  const empty = { byProject: new Map(), byDesign: new Map() };
  const sql = getDb();
  if (!sql) return empty;
  const rows = (await sql`
    select
      l.a_id as project_id,
      l.b_id as design_id,
      p.draft_doc->>'name' as project_name,
      t.draft_doc->>'name' as design_name,
      t.deployed_token_address
    from launchpad.entity_links l
    join launchpad.projects p on p.id = l.a_id
    join launchpad.token_designs t on t.id = l.b_id
    where l.a_type = 'project' and l.b_type = 'token_design'
      and (p.owner_id = ${owner.userId} or p.org_id = any(${owner.orgIds}))
  `) as Array<{
    project_id: string;
    design_id: string;
    project_name: string | null;
    design_name: string | null;
    deployed_token_address: string | null;
  }>;

  const byProject = new Map<string, EntityLinkSummary>();
  const byDesign = new Map<string, EntityLinkSummary>();
  for (const r of rows) {
    const summary: EntityLinkSummary = {
      projectId: r.project_id,
      projectName: r.project_name || "Untitled",
      designId: r.design_id,
      designName: r.design_name || "Untitled",
      deployedTokenAddress: r.deployed_token_address,
    };
    byProject.set(r.project_id, summary);
    byDesign.set(r.design_id, summary);
  }
  return { byProject, byDesign };
}

export async function getLinkedProject(tokenDesignId: string): Promise<ProjectRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select p.* from launchpad.entity_links l
    join launchpad.projects p on p.id = l.a_id
    where l.b_type = 'token_design' and l.b_id = ${tokenDesignId} and l.a_type = 'project'
  `;
  return mapProjectRow(rows[0] as ProjectRow | undefined);
}

/** The chain a design's deployed token is on. Robinhood for every deploy from before M54. */
export function designDeployChain(row: Pick<TokenDesignRow, "deployed_chain_id">): ProjectChain {
  return (row.deployed_chain_id ? chainByChainId(row.deployed_chain_id) : null) ?? DEFAULT_PROJECT_CHAIN;
}

/** The team a project belongs to (M134), null for a personal project or an unknown id. One column, no owner check. */
export async function getProjectOrgId(id: string): Promise<string | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`select org_id from launchpad.projects where id = ${id}`;
  return (rows[0] as { org_id?: string | null } | undefined)?.org_id ?? null;
}
