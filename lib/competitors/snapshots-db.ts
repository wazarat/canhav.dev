import "server-only";

import type { LlamaProtocol } from "@/lib/competitors/llama";
import { getDb } from "@/lib/db";

/** The month a snapshot belongs to, as the first of the month. */
export function snapshotMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function getCompetitorSnapshot(category: string, chain: string, month: string): Promise<LlamaProtocol[] | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      select rows from launchpad.competitor_snapshots
      where category = ${category} and chain = ${chain} and month = ${month}
    `;
    return ((rows[0] as { rows: LlamaProtocol[] } | undefined)?.rows) ?? null;
  } catch {
    return null;
  }
}

/** The newest snapshot of a pair, whatever month, for a read when this month has none yet. */
export async function getLatestCompetitorSnapshot(category: string, chain: string): Promise<{ rows: LlamaProtocol[]; month: string } | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      select rows, month from launchpad.competitor_snapshots
      where category = ${category} and chain = ${chain}
      order by month desc limit 1
    `;
    const r = rows[0] as { rows: LlamaProtocol[]; month: string | Date } | undefined;
    return r ? { rows: r.rows, month: new Date(r.month).toISOString().slice(0, 10) } : null;
  } catch {
    return null;
  }
}

export async function upsertCompetitorSnapshot(category: string, chain: string, month: string, rows: LlamaProtocol[]): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    await sql`
      insert into launchpad.competitor_snapshots (category, chain, month, rows, fetched_at)
      values (${category}, ${chain}, ${month}, ${JSON.stringify(rows)}, now())
      on conflict (category, chain, month) do update set rows = excluded.rows, fetched_at = now()
    `;
    return true;
  } catch (err) {
    console.error("[competitors] snapshot upsert failed", err);
    return false;
  }
}
