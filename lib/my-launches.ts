import "server-only";

import { getMyTokenDesigns } from "@/lib/ideation-db";
import { getToken, type IndexedToken } from "@/lib/indexer";
import { getLaunchesByOwner } from "@/lib/launches-db";

/**
 * One account's launches, from two sources: tokens launched while signed in
 * (launchpad.launches) and tokens attached to the account's token designs.
 * Shared by the studio Launches section and the MCP get_my_launches tool so
 * both list exactly the same set.
 */

export type LaunchSource = "launch" | "design" | "both";

export interface MyLaunch {
  /** Lowercase token address. */
  address: string;
  source: LaunchSource;
  /** ISO timestamp of the record, newest first in the result. */
  launchedAt: string | null;
  creatorWallet: string | null;
  launchTxHash: string | null;
  design: { id: string; slug: string | null; status: string; name: string } | null;
  /** Live indexer record, or null when the indexer is unreachable. */
  launch: IndexedToken | null;
}

/** Null only when storage is unconfigured. Indexer outages leave `launch` null per row. */
export async function getMyLaunches(userId: string): Promise<MyLaunch[] | null> {
  const [designs, recorded] = await Promise.all([
    getMyTokenDesigns(userId),
    getLaunchesByOwner(userId),
  ]);
  if (designs === null || recorded === null) return null;

  const byAddress = new Map<string, Omit<MyLaunch, "launch">>();
  for (const r of recorded) {
    byAddress.set(r.token_address, {
      address: r.token_address,
      source: "launch",
      launchedAt: r.created_at,
      creatorWallet: r.creator_address,
      launchTxHash: r.tx_hash,
      design: null,
    });
  }
  for (const r of designs) {
    if (!r.deployed_token_address) continue;
    const address = r.deployed_token_address.toLowerCase();
    const design = { id: r.id, slug: r.slug, status: r.status, name: r.draft_doc.name };
    const existing = byAddress.get(address);
    if (existing) {
      existing.source = "both";
      existing.design = design;
    } else {
      byAddress.set(address, {
        address,
        source: "design",
        launchedAt: r.deployed_at,
        creatorWallet: r.deployed_by_wallet,
        launchTxHash: null,
        design,
      });
    }
  }

  const launches = await Promise.all(
    [...byAddress.values()].map(async (entry) => ({
      ...entry,
      launch: await getToken(entry.address),
    })),
  );
  launches.sort((a, b) => (b.launchedAt ?? "").localeCompare(a.launchedAt ?? ""));
  return launches;
}
