import "server-only";

import { DEFAULT_PROJECT_CHAIN, type ProjectChain, chainByChainId, chainInfo } from "@/lib/chains";
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
  /** The chain the token launched on (M54). Absent before the column exists, which reads as Robinhood. */
  chain_id?: number;
}

/** The project chain a launch row is on. */
export function launchRowChain(row: Pick<LaunchRow, "chain_id"> | null | undefined): ProjectChain {
  return (row?.chain_id ? chainByChainId(row.chain_id) : null) ?? DEFAULT_PROJECT_CHAIN;
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
  /** The chain the token was indexed on. Robinhood when left out. */
  chain?: ProjectChain;
}): Promise<RecordLaunchResult> {
  const sql = getDb();
  if (!sql) return null;
  const chain = input.chain ?? DEFAULT_PROJECT_CHAIN;
  // A Robinhood row leans on the column default, so it also inserts before
  // the chain_id column exists. Any other chain needs the column (M54).
  const insert = async () => {
    if (chain === DEFAULT_PROJECT_CHAIN) {
      return sql`
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
    }
    return sql`
      insert into launchpad.launches (token_address, owner_id, creator_address, tx_hash, project_id, chain_id)
      values (
        ${input.tokenAddress.toLowerCase()},
        ${input.ownerId},
        ${input.creatorAddress.toLowerCase()},
        ${input.txHash},
        ${input.projectId},
        ${chainInfo(chain).chainId}
      )
      on conflict (token_address) do update
        set project_id = coalesce(launchpad.launches.project_id, excluded.project_id)
        where launchpad.launches.owner_id = excluded.owner_id
      returning token_address
    `;
  };
  const rows = await insert();
  return rows.length > 0 ? "recorded" : "exists";
}

/**
 * Link, move or unlink the project of a launch the account already owns
 * (M56). Null project unlinks. False when no row of that owner matched.
 */
export async function setLaunchProject(
  tokenAddress: string,
  ownerId: string,
  projectId: string | null,
): Promise<boolean | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    update launchpad.launches
    set project_id = ${projectId}
    where token_address = ${tokenAddress.toLowerCase()} and owner_id = ${ownerId}
    returning token_address
  `;
  return rows.length > 0;
}

/** Launches recorded for one account, newest first. */
export async function getLaunchesByOwner(ownerId: string): Promise<LaunchRow[] | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      select *
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
      select *
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
      select *
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
