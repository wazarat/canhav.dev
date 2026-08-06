import "server-only";

import { LAUNCH_CHAIN } from "@/content/launch";
import { publicClient } from "@/lib/publicClient";

/**
 * Verify, don't ask: where the truth is readable, read it. Every fetcher
 * returns null on any failure (offline, rate-limited, unknown) — public
 * pages omit the signal rather than crash or guess. Deploy history comes
 * from lib/indexer.ts (getTokensByCreator); these cover the rest.
 */

export interface BlockscoutVerification {
  address: string;
  verified: boolean;
  name: string | null;
  /** Unix seconds of the contract's creation tx, when Blockscout knows it. */
  createdAt: number | null;
}

/** Blockscout REST: smart-contract verification + identity for one address. */
export async function getBlockscoutVerification(
  address: string,
): Promise<BlockscoutVerification | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  try {
    const res = await fetch(
      `${LAUNCH_CHAIN.explorerUrl}/api/v2/smart-contracts/${address}`,
      { next: { revalidate: 3600 } },
    );
    if (res.status === 404) {
      // Address exists but has no verified source (or isn't a contract).
      return { address, verified: false, name: null, createdAt: null };
    }
    if (!res.ok) return null;
    const json = (await res.json()) as {
      is_verified?: boolean;
      name?: string;
      verified_at?: string;
    };
    return {
      address,
      verified: Boolean(json.is_verified),
      name: json.name ?? null,
      createdAt: json.verified_at ? Math.floor(Date.parse(json.verified_at) / 1000) : null,
    };
  } catch {
    return null;
  }
}

/** Total transactions ever sent by a wallet (nonce) — activity depth. */
export async function getWalletTxCount(wallet: string): Promise<number | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return null;
  try {
    return await publicClient.getTransactionCount({ address: wallet as `0x${string}` });
  } catch {
    return null;
  }
}

export interface GithubActivity {
  repo: string;
  stars: number;
  /** ISO timestamps of the most recent commits (default branch). */
  recentCommits: string[];
  pushedAt: string | null;
}

/** Public GitHub activity for a linked repo. Unauthenticated — rate limits
 *  and private repos both degrade to null. */
export async function getGithubActivity(repo: string): Promise<GithubActivity | null> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  try {
    const headers = { accept: "application/vnd.github+json" };
    const meta = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!meta.ok) return null;
    const metaJson = (await meta.json()) as { stargazers_count?: number; pushed_at?: string };
    const commitsRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=30`, {
      headers,
      next: { revalidate: 3600 },
    });
    const commits = commitsRes.ok
      ? ((await commitsRes.json()) as Array<{ commit?: { author?: { date?: string } } }>)
      : [];
    return {
      repo,
      stars: metaJson.stargazers_count ?? 0,
      recentCommits: commits
        .map((c) => c.commit?.author?.date)
        .filter((d): d is string => Boolean(d)),
      pushedAt: metaJson.pushed_at ?? null,
    };
  } catch {
    return null;
  }
}
