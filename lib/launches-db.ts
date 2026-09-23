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
  created_at: string;
}

export type RecordLaunchResult = "recorded" | "exists" | null;

/** Insert once per token. Returns "exists" when the address is already recorded. */
export async function recordLaunch(input: {
  tokenAddress: string;
  ownerId: string;
  creatorAddress: string;
  txHash: string | null;
}): Promise<RecordLaunchResult> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    insert into launchpad.launches (token_address, owner_id, creator_address, tx_hash)
    values (
      ${input.tokenAddress.toLowerCase()},
      ${input.ownerId},
      ${input.creatorAddress.toLowerCase()},
      ${input.txHash}
    )
    on conflict (token_address) do nothing
    returning token_address
  `;
  return rows.length > 0 ? "recorded" : "exists";
}

/** Launches recorded for one account, newest first. */
export async function getLaunchesByOwner(ownerId: string): Promise<LaunchRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select token_address, owner_id, creator_address, tx_hash, created_at
    from launchpad.launches
    where owner_id = ${ownerId}
    order by created_at desc
  `;
  return rows as LaunchRow[];
}
