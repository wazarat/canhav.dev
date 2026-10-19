import "server-only";

import {
  AGENT_CHANGE_LIMITS,
  type AgentChange,
  type AgentChangeKind,
  type AgentChangeStatus,
  type AgentChangeTarget,
  type AgentWriteMode,
  DEFAULT_AGENT_WRITE_MODE,
  isAgentWriteMode,
} from "@/lib/agent-writes";
import { getDb } from "@/lib/db";
import type { ProjectDoc, TokenDesignDoc } from "@/lib/ideation";
import type { Owner } from "@/lib/owner";
import { recordRevision } from "@/lib/revisions-db";
import { revisionAuthor } from "@/lib/revisions";

/**
 * Storage for agent writes. Like lib/ideation-db.ts, nothing here throws on
 * missing config. Change rows are keyed to the record's own owner_id (the
 * account that made the project), whoever on its team wrote them (M107);
 * the draft writes admit the team. The columns and the
 * table arrive with scripts/db-setup.mjs; until that has run, reads fall back
 * to the defaults and writes report failure.
 */

interface ChangeRow {
  id: string;
  target: AgentChangeTarget;
  kind: AgentChangeKind;
  patch: unknown;
  note: string | null;
  status: AgentChangeStatus;
  created_at: string;
  resolved_at: string | null;
  applied_patch?: unknown;
}

function mapChange(r: ChangeRow): AgentChange {
  return {
    id: r.id,
    target: r.target,
    kind: r.kind,
    patch: r.patch,
    note: r.note,
    status: r.status,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
    appliedPatch: r.applied_patch ?? null,
  };
}

/** The mode and revision off a project row, tolerant of a pre-migration row. */
export function agentStateOf(row: object): { mode: AgentWriteMode; rev: number | null } {
  const r = row as { agent_write_mode?: unknown; agent_rev?: unknown };
  return {
    mode: isAgentWriteMode(r.agent_write_mode) ? r.agent_write_mode : DEFAULT_AGENT_WRITE_MODE,
    rev: typeof r.agent_rev === "number" ? r.agent_rev : null,
  };
}

export async function setAgentWriteMode(
  projectId: string,
  owner: Owner,
  mode: AgentWriteMode,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const rows = await sql`
      update launchpad.projects set agent_write_mode = ${mode}
      where id = ${projectId} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds}))
      returning id
    `;
    return rows.length > 0;
  } catch (err) {
    console.error("[agent-writes] set mode failed", err);
    return false;
  }
}

export async function listAgentChanges(
  projectId: string,
  ownerId: string,
  limit = 60,
): Promise<AgentChange[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = await sql`
      select id, target, kind, patch, note, status, created_at, resolved_at, applied_patch
      from launchpad.agent_changes
      where project_id = ${projectId} and owner_id = ${ownerId}
      order by (status = 'proposed') desc, created_at desc
      limit ${limit}
    `;
    return (rows as ChangeRow[]).map(mapChange);
  } catch (err) {
    console.error("[agent-writes] list failed", err);
    return [];
  }
}

/** The proposals waiting on one project, oldest first, the order a projection applies them (M81). */
export async function listPendingChanges(projectId: string, ownerId: string): Promise<AgentChange[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = await sql`
      select id, target, kind, patch, note, status, created_at, resolved_at, applied_patch
      from launchpad.agent_changes
      where project_id = ${projectId} and owner_id = ${ownerId} and status = 'proposed'
      order by created_at asc
      limit ${AGENT_CHANGE_LIMITS.pending.max}
    `;
    return (rows as ChangeRow[]).map(mapChange);
  } catch (err) {
    console.error("[agent-writes] pending failed", err);
    return [];
  }
}

export async function countPendingChanges(projectId: string): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;
  try {
    const rows = await sql`
      select count(*)::int as n from launchpad.agent_changes
      where project_id = ${projectId} and status = 'proposed'
    `;
    return (rows[0] as { n: number } | undefined)?.n ?? 0;
  } catch {
    return 0;
  }
}

export async function getAgentChange(
  changeId: string,
  projectId: string,
  ownerId: string,
): Promise<(AgentChange & { targetId: string }) | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      select id, target, target_id, kind, patch, note, status, created_at, resolved_at, applied_patch
      from launchpad.agent_changes
      where id = ${changeId} and project_id = ${projectId} and owner_id = ${ownerId}
    `;
    const r = rows[0] as (ChangeRow & { target_id: string }) | undefined;
    return r ? { ...mapChange(r), targetId: r.target_id } : null;
  } catch {
    return null;
  }
}

export async function recordAgentChange(input: {
  projectId: string;
  ownerId: string;
  target: AgentChangeTarget;
  targetId: string;
  kind: AgentChangeKind;
  patch: unknown;
  note: string | null;
  status: "proposed" | "applied";
}): Promise<string | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      insert into launchpad.agent_changes
        (project_id, owner_id, target, target_id, kind, patch, note, status, resolved_at)
      values (
        ${input.projectId}, ${input.ownerId}, ${input.target}, ${input.targetId},
        ${input.kind}, ${JSON.stringify(input.patch)}, ${input.note}, ${input.status},
        ${input.status === "applied" ? new Date().toISOString() : null}
      )
      returning id
    `;
    return (rows[0] as { id: string } | undefined)?.id ?? null;
  } catch (err) {
    console.error("[agent-writes] record failed", err);
    return null;
  }
}

/** Proposed to accepted or rejected. False when it was already resolved. */
export async function resolveAgentChange(
  changeId: string,
  projectId: string,
  ownerId: string,
  status: "accepted" | "rejected",
  /** What was applied on accept (M44). Stored as applied_patch, null on reject. */
  appliedPatch: unknown = null,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const applied = status === "accepted" && appliedPatch !== null ? JSON.stringify(appliedPatch) : null;
    const rows = await sql`
      update launchpad.agent_changes
      set status = ${status}, resolved_at = now(), applied_patch = ${applied}
      where id = ${changeId} and project_id = ${projectId} and owner_id = ${ownerId}
        and status = 'proposed'
      returning id
    `;
    return rows.length > 0;
  } catch (err) {
    console.error("[agent-writes] resolve failed", err);
    return false;
  }
}

/** Proposed to withdrawn, by the agent that filed it (M88). False when it was already decided. */
export async function withdrawAgentChange(changeId: string, projectId: string, ownerId: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const rows = await sql`
      update launchpad.agent_changes
      set status = 'withdrawn', resolved_at = now()
      where id = ${changeId} and project_id = ${projectId} and owner_id = ${ownerId}
        and status = 'proposed'
      returning id
    `;
    return rows.length > 0;
  } catch (err) {
    console.error("[agent-writes] withdraw failed", err);
    return false;
  }
}

/**
 * Write a draft from outside the open editor and bump agent_rev, so an
 * editor holding the older copy is refused on its next save. Guarded on the
 * revision the caller read, so two writers cannot silently cross.
 */
export async function writeProjectDraftAsAgent(
  id: string,
  owner: Owner,
  doc: ProjectDoc,
  readRev: number,
  /** The revision author (M110); a restore names the revision it brought back. */
  author: string = revisionAuthor("agent"),
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const rows = await sql`
      update launchpad.projects
      set draft_doc = ${JSON.stringify(doc)},
          github_repo = ${doc.githubRepo ?? null},
          verify_wallet = ${doc.verifyWallet ?? null},
          agent_rev = agent_rev + 1,
          updated_at = now()
      where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) and agent_rev = ${readRev}
      returning id
    `;
    if (rows.length > 0) await recordRevision("project", id, doc, author);
    return rows.length > 0;
  } catch (err) {
    console.error("[agent-writes] project write failed", err);
    return false;
  }
}

export async function writeTokenDesignDraftAsAgent(
  id: string,
  owner: Owner,
  doc: TokenDesignDoc,
  readRev: number,
): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const rows = await sql`
      update launchpad.token_designs
      set draft_doc = ${JSON.stringify(doc)},
          agent_rev = agent_rev + 1,
          updated_at = now()
      where id = ${id} and (owner_id = ${owner.userId} or org_id = any(${owner.orgIds})) and agent_rev = ${readRev}
      returning id
    `;
    if (rows.length > 0) await recordRevision("token_design", id, doc, revisionAuthor("agent"));
    return rows.length > 0;
  } catch (err) {
    console.error("[agent-writes] token design write failed", err);
    return false;
  }
}

/** Agent activity per project for the studio home rows (M79). By project since M107, so a team sees it. */
export interface ProjectAgentActivity {
  proposed: number;
  /** ISO time of the newest direct write, null when none. */
  lastWritten: string | null;
}

export async function agentActivityByProjects(projectIds: string[]): Promise<Map<string, ProjectAgentActivity>> {
  const out = new Map<string, ProjectAgentActivity>();
  const sql = getDb();
  if (!sql || projectIds.length === 0) return out;
  try {
    const rows = await sql`
      select project_id,
             count(*) filter (where status = 'proposed')::int as proposed,
             max(created_at) filter (where status = 'applied') as last_written
      from launchpad.agent_changes
      where project_id = any(${projectIds}::uuid[])
      group by project_id
    `;
    for (const r of rows as Array<{ project_id: string; proposed: number; last_written: string | Date | null }>) {
      const last = r.last_written ? new Date(r.last_written).toISOString() : null;
      if (r.proposed || last) out.set(r.project_id, { proposed: r.proposed, lastWritten: last });
    }
  } catch (err) {
    console.error("[agent-writes] activity failed", err);
  }
  return out;
}
