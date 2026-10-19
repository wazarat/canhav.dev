import "server-only";

import {
  type AgentSession,
  type ReportSessionInput,
  normalizePlan,
  sessionOpen,
} from "@/lib/agent-sessions";
import { getDb } from "@/lib/db";

/**
 * Storage for agent sessions (M86). Like lib/agent-writes-db.ts, nothing
 * here throws on missing config and every query is keyed to the project's
 * own owner_id, whoever on its team reports (M107). The
 * table arrives with scripts/db-setup.mjs; until then reads are null and
 * writes report failure.
 */

interface SessionRow {
  id: string;
  state: AgentSession["state"];
  title: string | null;
  message: string | null;
  plan: unknown;
  external_url: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function mapSession(r: SessionRow): AgentSession {
  return {
    id: r.id,
    state: r.state,
    title: r.title,
    message: r.message,
    plan: normalizePlan(r.plan),
    externalUrl: r.external_url,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

/** The newest session of a project, open or not, or null. */
export async function latestAgentSession(projectId: string, ownerId: string): Promise<AgentSession | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      select id, state, title, message, plan, external_url, created_at, updated_at
      from launchpad.agent_sessions
      where project_id = ${projectId} and owner_id = ${ownerId}
      order by updated_at desc
      limit 1
    `;
    const r = rows[0] as SessionRow | undefined;
    return r ? mapSession(r) : null;
  } catch (err) {
    console.error("[agent-sessions] latest failed", err);
    return null;
  }
}

/**
 * Record a report. Updates the newest session while it is open unless the
 * agent asked for a new one; otherwise starts a session. Fields left out of
 * a report keep their value, the plan is replaced whole when sent.
 */
export async function reportAgentSession(
  projectId: string,
  ownerId: string,
  input: ReportSessionInput,
): Promise<AgentSession | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const current = await latestAgentSession(projectId, ownerId);
    const reuse = current && sessionOpen(current) && !input.new;
    const plan = input.plan !== undefined ? JSON.stringify(input.plan) : null;
    if (reuse) {
      const rows = await sql`
        update launchpad.agent_sessions
        set state = ${input.state},
            title = coalesce(${input.title ?? null}, title),
            message = coalesce(${input.message ?? null}, message),
            plan = coalesce(${plan}::jsonb, plan),
            external_url = coalesce(${input.externalUrl ?? null}, external_url),
            updated_at = now()
        where id = ${current.id} and owner_id = ${ownerId}
        returning id, state, title, message, plan, external_url, created_at, updated_at
      `;
      const r = rows[0] as SessionRow | undefined;
      return r ? mapSession(r) : null;
    }
    const rows = await sql`
      insert into launchpad.agent_sessions (project_id, owner_id, state, title, message, plan, external_url)
      values (
        ${projectId}, ${ownerId}, ${input.state}, ${input.title ?? null}, ${input.message ?? null},
        ${plan ?? "[]"}::jsonb, ${input.externalUrl ?? null}
      )
      returning id, state, title, message, plan, external_url, created_at, updated_at
    `;
    const r = rows[0] as SessionRow | undefined;
    return r ? mapSession(r) : null;
  } catch (err) {
    console.error("[agent-sessions] report failed", err);
    return null;
  }
}

/** The newest session per project, for the studio rows (M86). By project since M107, so a team sees them. */
export async function latestSessionsByProjects(projectIds: string[]): Promise<Map<string, AgentSession>> {
  const out = new Map<string, AgentSession>();
  const sql = getDb();
  if (!sql || projectIds.length === 0) return out;
  try {
    const rows = await sql`
      select distinct on (project_id) project_id, id, state, title, message, plan, external_url, created_at, updated_at
      from launchpad.agent_sessions
      where project_id = any(${projectIds}::uuid[])
      order by project_id, updated_at desc
    `;
    for (const r of rows as Array<SessionRow & { project_id: string }>) out.set(r.project_id, mapSession(r));
  } catch (err) {
    console.error("[agent-sessions] by owner failed", err);
  }
  return out;
}
