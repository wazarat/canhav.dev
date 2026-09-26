import "server-only";

import { getDb } from "@/lib/db";
import { hashDescription } from "@/lib/journey";

/**
 * The launch fields the chain only carries as a hash. The description text is
 * stored before the launch transaction, keyed by the descriptionHash the
 * transaction will carry plus the creator, the same pattern as journeys. A
 * read only returns the text when its recomputed keccak256 matches the hash
 * in the TokenLaunched event, so no surface renders text the chain does not
 * vouch for. Telegram rides along and is not committed on-chain.
 */

export interface TokenMetadata {
  description: string;
  telegram: string | null;
}

/** null when the database is not configured or the write failed. */
export async function putTokenMetadata(input: {
  descriptionHash: `0x${string}`;
  creatorAddress: string;
  description: string;
  telegram: string | null;
}): Promise<"stored" | null> {
  const db = getDb();
  if (!db) return null;
  try {
    await db`
      insert into launchpad.token_metadata (description_hash, creator_address, description, telegram)
      values (
        ${input.descriptionHash.toLowerCase()},
        ${input.creatorAddress.toLowerCase()},
        ${input.description},
        ${input.telegram}
      )
      on conflict (description_hash, creator_address) do nothing
    `;
    return "stored";
  } catch {
    return null;
  }
}

/**
 * The stored text for an indexed token, only when keccak256(description)
 * equals the on-chain descriptionHash. An unverifiable row returns null.
 */
export async function getVerifiedTokenMetadata(
  descriptionHash: string,
  creator: string,
): Promise<TokenMetadata | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db`
      select description, telegram from launchpad.token_metadata
      where description_hash = ${descriptionHash.toLowerCase()}
        and creator_address = ${creator.toLowerCase()}
    `;
    if (rows.length === 0) return null;
    const description = rows[0].description as string;
    if (hashDescription(description).toLowerCase() !== descriptionHash.toLowerCase()) return null;
    return { description, telegram: (rows[0].telegram as string | null) ?? null };
  } catch {
    return null;
  }
}
