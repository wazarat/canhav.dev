import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getDb } from "@/lib/db";
import type { Owner } from "@/lib/owner";

/**
 * Project keys (M111). A key is `chk_` plus 32 random bytes as base64url,
 * shown once at creation; the table keeps its sha256 and a display prefix.
 * A read key opens every read tool of the project's MCP server and the
 * draft export; a write key also opens the write tools. The key speaks for
 * the account that made it and for the project's team.
 */
export const KEY_PREFIX = "chk_";
export const KEY_LIMITS = { name: { min: 1, max: 60 }, perProject: 20, touchMs: 5 * 60_000 } as const;
export type KeyScope = "read" | "write";

export interface ProjectKeyRow {
  id: string;
  project_id: string;
  name: string;
  scope: KeyScope;
  prefix: string;
  created_by: string;
  created_at: string | Date;
  last_used_at: string | Date | null;
  revoked_at: string | Date | null;
}

export interface VerifiedKey {
  keyId: string;
  projectId: string;
  scope: KeyScope;
  /** The account that made the key plus the project's team. */
  owner: Owner;
}

function hashKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isProjectKey(token: string | undefined | null): token is string {
  return typeof token === "string" && token.startsWith(KEY_PREFIX) && token.length >= 20 && token.length <= 80;
}

export async function createKey(projectId: string, createdBy: string, name: string, scope: KeyScope): Promise<{ key: string; row: ProjectKeyRow } | null> {
  const sql = getDb();
  if (!sql) return null;
  const key = KEY_PREFIX + randomBytes(32).toString("base64url");
  const prefix = key.slice(0, 12);
  try {
    const rows = await sql`
      insert into launchpad.project_keys (project_id, name, scope, key_hash, prefix, created_by)
      values (${projectId}, ${name.trim().slice(0, KEY_LIMITS.name.max)}, ${scope}, ${hashKey(key)}, ${prefix}, ${createdBy})
      returning id, project_id, name, scope, prefix, created_by, created_at, last_used_at, revoked_at
    `;
    const row = rows[0] as ProjectKeyRow | undefined;
    return row ? { key, row } : null;
  } catch (err) {
    console.error("[keys] create failed", err);
    return null;
  }
}

export async function listKeys(projectId: string): Promise<ProjectKeyRow[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = await sql`
      select id, project_id, name, scope, prefix, created_by, created_at, last_used_at, revoked_at
      from launchpad.project_keys where project_id = ${projectId}
      order by created_at desc
    `;
    return rows as ProjectKeyRow[];
  } catch {
    return [];
  }
}

export async function countActiveKeys(projectId: string): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;
  const rows = await sql`select count(*)::int as n from launchpad.project_keys where project_id = ${projectId} and revoked_at is null`;
  return (rows[0] as { n: number } | undefined)?.n ?? 0;
}

export async function revokeKey(projectId: string, keyId: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`
    update launchpad.project_keys set revoked_at = now()
    where id = ${keyId} and project_id = ${projectId} and revoked_at is null
    returning id
  `;
  return rows.length > 0;
}

/**
 * The key behind a bearer, or null. Looks the hash up, compares it in
 * constant time, refuses a revoked key, and touches last_used_at at most
 * every five minutes.
 */
export async function verifyKey(token: string): Promise<VerifiedKey | null> {
  if (!isProjectKey(token)) return null;
  const sql = getDb();
  if (!sql) return null;
  const hash = hashKey(token);
  try {
    const rows = await sql`
      select k.id, k.project_id, k.scope, k.key_hash, k.created_by, k.last_used_at, k.revoked_at, p.org_id
      from launchpad.project_keys k
      join launchpad.projects p on p.id = k.project_id
      where k.key_hash = ${hash}
    `;
    const row = rows[0] as
      | { id: string; project_id: string; scope: KeyScope; key_hash: string; created_by: string; last_used_at: string | Date | null; revoked_at: string | Date | null; org_id: string | null }
      | undefined;
    if (!row || row.revoked_at) return null;
    const a = Buffer.from(row.key_hash, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const last = row.last_used_at ? new Date(row.last_used_at).getTime() : 0;
    if (Date.now() - last > KEY_LIMITS.touchMs) {
      await sql`update launchpad.project_keys set last_used_at = now() where id = ${row.id}`;
    }
    return {
      keyId: row.id,
      projectId: row.project_id,
      scope: row.scope,
      owner: { userId: row.created_by, orgIds: row.org_id ? [row.org_id] : [] },
    };
  } catch (err) {
    console.error("[keys] verify failed", err);
    return null;
  }
}
