import "server-only";

import { getVerifiedWallets } from "@/lib/auth";
import { DEFAULT_PROJECT_CHAIN } from "@/lib/chains";
import { findToken, getCreatorTokens } from "@/lib/indexer";
import { type LaunchRow, claimLaunch, getLaunchByToken } from "@/lib/launches-db";

/**
 * Who owns a launch (M57). The account on the launches row, or any account
 * that holds the token's creator wallet as a verified wallet. The second
 * case has no time limit and is recorded the moment it is seen, so a launch
 * whose link was missed is picked up once its wallet is on an account.
 */

/** The launch row when the account owns the token, claiming it by wallet if needed. Null otherwise. */
export async function ownedLaunch(tokenAddress: string, userId: string): Promise<LaunchRow | null> {
  const row = await getLaunchByToken(tokenAddress);
  if (row?.owner_id === userId) return row;
  const wallets = await getVerifiedWallets(userId);
  if (wallets.length === 0) return null;
  const token = await findToken(tokenAddress);
  if (!token || !wallets.includes(token.creator.toLowerCase())) return null;
  const ok = await claimLaunch({
    tokenAddress,
    ownerId: userId,
    creatorAddress: token.creator,
    txHash: token.txHash ?? null,
    chain: token.chain ?? DEFAULT_PROJECT_CHAIN,
  });
  return ok ? getLaunchByToken(tokenAddress) : null;
}

/**
 * Record every token launched by the account's verified wallets that it does
 * not own yet. `owned` is the set of addresses already on its rows. True when
 * anything was claimed, so the caller reads its rows again.
 */
export async function claimWalletLaunches(userId: string, owned: Set<string>): Promise<boolean> {
  const wallets = await getVerifiedWallets(userId);
  if (wallets.length === 0) return false;
  const tokens = (await Promise.all(wallets.map((w) => getCreatorTokens(w)))).flat();
  const missing = tokens.filter((t) => !owned.has(t.address.toLowerCase()));
  const results = await Promise.all(
    missing.map((t) =>
      claimLaunch({
        tokenAddress: t.address,
        ownerId: userId,
        creatorAddress: t.creator,
        txHash: t.txHash ?? null,
        chain: t.chain ?? DEFAULT_PROJECT_CHAIN,
      }),
    ),
  );
  return results.some(Boolean);
}
