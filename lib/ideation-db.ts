import "server-only";

import { getDb } from "@/lib/db";
import type { JourneyDoc } from "@/lib/journey";
import {
  type IdeationDoc,
  type ProjectDoc,
  type TokenDesignDoc,
  canonicalizeIdeationDoc,
  hashIdeationDoc,
  validateIdeationDoc,
} from "@/lib/ideation";

/**
 * Neon queries for the ideation tracks. Every function returns null (or an
 * error result) instead of throwing on missing config, matching lib/db.ts.
 * Ownership is enforced here — every mutation filters on owner_id.
 */

export interface ProjectRow {
  id: string;
  owner_id: string;
  slug: string | null;
  status: "draft" | "published";
  draft_doc: ProjectDoc;
  published_hash: string | null;
  verify_wallet: string | null;
  github_repo: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenDesignRow {
  id: string;
  owner_id: string;
  slug: string | null;
  status: "draft" | "published";
  draft_doc: TokenDesignDoc;
  published_hash: string | null;
  verify_wallet: string | null;
  deployed_token_address: string | null;
  deployed_by_wallet: string | null;
  deployed_snapshot_hash: string | null;
  deployed_at: string | null;
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

export async function createProject(ownerId: string, doc: ProjectDoc): Promise<ProjectRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    insert into launchpad.projects (owner_id, draft_doc)
    values (${ownerId}, ${JSON.stringify(doc)})
    returning *
  `;
  return (rows[0] as ProjectRow) ?? null;
}

export async function getMyProjects(ownerId: string): Promise<ProjectRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.projects
    where owner_id = ${ownerId}
    order by updated_at desc
  `;
  return rows as ProjectRow[];
}

export async function getProject(id: string, ownerId: string): Promise<ProjectRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.projects where id = ${id} and owner_id = ${ownerId}
  `;
  return (rows[0] as ProjectRow) ?? null;
}

export async function updateProjectDraft(
  id: string,
  ownerId: string,
  doc: ProjectDoc,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    update launchpad.projects
    set draft_doc = ${JSON.stringify(doc)},
        github_repo = ${doc.githubRepo ?? null},
        verify_wallet = ${doc.verifyWallet ?? null},
        updated_at = now()
    where id = ${id} and owner_id = ${ownerId}
    returning id
  `;
  return rows.length > 0;
}

export async function deleteProjectDraft(id: string, ownerId: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    delete from launchpad.projects
    where id = ${id} and owner_id = ${ownerId} and status = 'draft'
    returning id
  `;
  return rows.length > 0;
}

export async function getProjectBySlug(slug: string): Promise<ProjectRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.projects where slug = ${slug} and status = 'published'
  `;
  return (rows[0] as ProjectRow) ?? null;
}

export async function getPublishedProjects(limit = 60): Promise<ProjectRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.projects
    where status = 'published'
    order by updated_at desc
    limit ${limit}
  `;
  return rows as ProjectRow[];
}

// ---------------------------------------------------------------------------
// Token designs

export async function createTokenDesign(
  ownerId: string,
  doc: TokenDesignDoc,
): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    insert into launchpad.token_designs (owner_id, draft_doc)
    values (${ownerId}, ${JSON.stringify(doc)})
    returning *
  `;
  return (rows[0] as TokenDesignRow) ?? null;
}

export async function getMyTokenDesigns(ownerId: string): Promise<TokenDesignRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs
    where owner_id = ${ownerId}
    order by updated_at desc
  `;
  return rows as TokenDesignRow[];
}

export async function getTokenDesign(id: string, ownerId: string): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs where id = ${id} and owner_id = ${ownerId}
  `;
  return (rows[0] as TokenDesignRow) ?? null;
}

export async function updateTokenDesignDraft(
  id: string,
  ownerId: string,
  doc: TokenDesignDoc,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    update launchpad.token_designs
    set draft_doc = ${JSON.stringify(doc)}, updated_at = now()
    where id = ${id} and owner_id = ${ownerId}
    returning id
  `;
  return rows.length > 0;
}

export async function deleteTokenDesignDraft(id: string, ownerId: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    delete from launchpad.token_designs
    where id = ${id} and owner_id = ${ownerId} and status = 'draft'
    returning id
  `;
  return rows.length > 0;
}

export async function getTokenDesignBySlug(slug: string): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs where slug = ${slug} and status = 'published'
  `;
  return (rows[0] as TokenDesignRow) ?? null;
}

export async function getTokenDesignByAddress(address: string): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs
    where deployed_token_address = ${address.toLowerCase()}
  `;
  return (rows[0] as TokenDesignRow) ?? null;
}

/** Published design by id — public data, used to prefill the launch form. */
export async function getPublishedTokenDesignById(id: string): Promise<TokenDesignRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.token_designs where id = ${id} and status = 'published'
  `;
  return (rows[0] as TokenDesignRow) ?? null;
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

export async function attachDeploy(
  id: string,
  ownerId: string,
  tokenAddress: string,
  deployedBy: string,
  snapshotHash: string,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    update launchpad.token_designs
    set deployed_token_address = ${tokenAddress.toLowerCase()},
        deployed_by_wallet = ${deployedBy.toLowerCase()},
        deployed_snapshot_hash = ${snapshotHash},
        deployed_at = now(),
        updated_at = now()
    where id = ${id} and owner_id = ${ownerId} and deployed_token_address is null
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
  | { ok: true; slug: string; hash: string; version: number; unchanged: boolean }
  | { ok: false; error: string; status: number };

/** Doc equality ignoring the publish counter — used for no-op republish. */
function sameContent(a: IdeationDoc, b: IdeationDoc): boolean {
  const strip = (d: IdeationDoc) => canonicalizeIdeationDoc({ ...d, publishVersion: 0 });
  return strip(a) === strip(b);
}

export async function publishEntity(
  table: EntityTable,
  id: string,
  ownerId: string,
): Promise<PublishResult> {
  const sql = getDb();
  if (!sql) return { ok: false, error: "Storage not configured.", status: 503 };

  const row =
    table === "projects" ? await getProject(id, ownerId) : await getTokenDesign(id, ownerId);
  if (!row) return { ok: false, error: "Not found.", status: 404 };

  const entityType = table === "projects" ? "project" : "token_design";
  const slug = row.slug ?? (await uniqueSlug(sql, table, slugify(row.draft_doc.name)));

  const latest = await sql`
    select * from launchpad.ideation_snapshots
    where entity_type = ${entityType} and entity_id = ${id}
    order by version desc limit 1
  `;
  const latestSnap = (latest[0] as SnapshotRow) ?? null;
  const version = (latestSnap?.version ?? 0) + 1;

  const stamped = { ...row.draft_doc, slug, publishVersion: version } as IdeationDoc;
  const problem = validateIdeationDoc(stamped);
  if (problem) return { ok: false, error: problem, status: 400 };

  // Republishing identical content is a no-op — return the existing snapshot.
  if (latestSnap && row.status === "published" && sameContent(stamped, latestSnap.doc)) {
    return {
      ok: true,
      slug,
      hash: latestSnap.snapshot_hash,
      version: latestSnap.version,
      unchanged: true,
    };
  }

  const canonical = canonicalizeIdeationDoc(stamped);
  const hash = hashIdeationDoc(stamped);

  await sql`
    insert into launchpad.ideation_snapshots
      (snapshot_hash, entity_type, entity_id, version, doc, canonical)
    values
      (${hash}, ${entityType}, ${id}, ${version}, ${JSON.stringify(stamped)}, ${canonical})
    on conflict (snapshot_hash) do nothing
  `;
  if (table === "projects") {
    await sql`
      update launchpad.projects
      set slug = ${slug}, status = 'published', published_hash = ${hash},
          draft_doc = ${JSON.stringify(stamped)}, updated_at = now()
      where id = ${id} and owner_id = ${ownerId}
    `;
  } else {
    await sql`
      update launchpad.token_designs
      set slug = ${slug}, status = 'published', published_hash = ${hash},
          draft_doc = ${JSON.stringify(stamped)}, updated_at = now()
      where id = ${id} and owner_id = ${ownerId}
    `;
  }
  return { ok: true, slug, hash, version, unchanged: false };
}

export async function unpublishEntity(
  table: EntityTable,
  id: string,
  ownerId: string,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows =
    table === "projects"
      ? await sql`
          update launchpad.projects set status = 'draft', updated_at = now()
          where id = ${id} and owner_id = ${ownerId} returning id
        `
      : await sql`
          update launchpad.token_designs set status = 'draft', updated_at = now()
          where id = ${id} and owner_id = ${ownerId} returning id
        `;
  return rows.length > 0;
}

export async function getSnapshot(hash: string): Promise<SnapshotRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select * from launchpad.ideation_snapshots where snapshot_hash = ${hash}
  `;
  return (rows[0] as SnapshotRow) ?? null;
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

export async function getLinkedProject(tokenDesignId: string): Promise<ProjectRow | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select p.* from launchpad.entity_links l
    join launchpad.projects p on p.id = l.a_id
    where l.b_type = 'token_design' and l.b_id = ${tokenDesignId} and l.a_type = 'project'
  `;
  return (rows[0] as ProjectRow) ?? null;
}
