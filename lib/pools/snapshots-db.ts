import "server-only";

import type { ProjectChain } from "@/lib/chains";
import { getDb } from "@/lib/db";
import type { LlamaPool } from "@/lib/pools/llama";

/** The daily pools snapshot of a chain (M162), beside the competitor snapshots. */
export async function getPoolSnapshot(chain: ProjectChain, day: string | null): Promise<{ rows: LlamaPool[]; day: string; fetchedAt: string } | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = day
      ? await sql`select rows, day, fetched_at from launchpad.pool_snapshots where chain = ${chain} and day = ${day}`
      : await sql`select rows, day, fetched_at from launchpad.pool_snapshots where chain = ${chain} order by day desc limit 1`;
    const r = rows[0] as { rows: LlamaPool[]; day: string | Date; fetched_at: string | Date } | undefined;
    return r ? { rows: r.rows, day: new Date(r.day).toISOString().slice(0, 10), fetchedAt: new Date(r.fetched_at).toISOString() } : null;
  } catch {
    return null;
  }
}

/** `fetchedAt` is the read time the caller answers with, so a later read of the row gives the same time. */
export async function upsertPoolSnapshot(chain: ProjectChain, day: string, rows: LlamaPool[], fetchedAt: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    await sql`
      insert into launchpad.pool_snapshots (chain, day, rows, fetched_at)
      values (${chain}, ${day}, ${JSON.stringify(rows)}, ${fetchedAt})
      on conflict (chain, day) do update set rows = excluded.rows, fetched_at = excluded.fetched_at
    `;
    return true;
  } catch (err) {
    console.error("[pools] snapshot upsert failed", err);
    return false;
  }
}
