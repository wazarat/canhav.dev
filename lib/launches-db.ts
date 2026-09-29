import "server-only";

import { getDb } from "@/lib/db";

/**
 * Ownership records for quick launches. A row links a deployed token to the
 * Clerk account that was signed in when it was launched, so get_my_launches
 * can list launches that have no design record. The creator address always
 * comes from the indexed TokenLaunched event, never from the client.
 */

export interface LaunchRow {
  token_address: string;
  owner_id: string;
  creator_address: string;
  tx_hash: string | null;
  /** The studio project the launch was started from, when there was one. */
  project_id: string | null;
  created_at: string;
}

export type RecordLaunchResult = "recorded" | "exists" | null;

/**
 * Insert once per token. A second POST by the same owner may fill in a
 * project the first one lacked (the success screen retries), never change
 * one. Returns "exists" when another account already recorded the address.
 */
export async function recordLaunch(input: {
  tokenAddress: string;
  ownerId: string;
  creatorAddress: string;
  txHash: string | null;
  projectId: string | null;
}): Promise<RecordLaunchResult> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    insert into launchpad.launches (token_address, owner_id, creator_address, tx_hash, project_id)
    values (
      ${input.tokenAddress.toLowerCase()},
      ${input.ownerId},
      ${input.creatorAddress.toLowerCase()},
      ${input.txHash},
      ${input.projectId}
    )
    on conflict (token_address) do update
      set project_id = coalesce(launchpad.launches.project_id, excluded.project_id)
      where launchpad.launches.owner_id = excluded.owner_id
    returning token_address
  `;
  return rows.length > 0 ? "recorded" : "exists";
}

/** Launches recorded for one account, newest first. */
export async function getLaunchesByOwner(ownerId: string): Promise<LaunchRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      select token_address, owner_id, creator_address, tx_hash, project_id, created_at
      from launchpad.launches
      where owner_id = ${ownerId}
      order by created_at desc
    `;
    return rows as LaunchRow[];
  } catch (err) {
    // A read before the launches migration has run must not take the page down.
    console.warn("launches read failed", err);
    return null;
  }
}

/** Launches started from one project, newest first. */
export async function getLaunchesByProject(projectId: string): Promise<LaunchRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      select token_address, owner_id, creator_address, tx_hash, project_id, created_at
      from launchpad.launches
      where project_id = ${projectId}
      order by created_at desc
    `;
    return rows as LaunchRow[];
  } catch (err) {
    // A read before the launches migration has run must not take the page down.
    console.warn("launches read failed", err);
    return null;
  }
}

/** The ownership record for one token, or null. */
export async function getLaunchByToken(tokenAddress: string): Promise<LaunchRow | null> {
  const sql = getDb();
  if (!sql) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  try {
    const rows = await sql`
      select token_address, owner_id, creator_address, tx_hash, project_id, created_at
      from launchpad.launches
      where token_address = ${tokenAddress.toLowerCase()}
    `;
    return (rows[0] as LaunchRow) ?? null;
  } catch (err) {
    // A read before the launches migration has run must not take the page down.
    console.warn("launches read failed", err);
    return null;
  }
}
