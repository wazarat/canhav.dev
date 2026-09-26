import "server-only";

import { LAUNCH_CHAIN } from "@/content/launch";
import { getTokenDesignByAddress } from "@/lib/ideation-db";
import {
  formatSupply,
  getEscrows,
  getPool,
  getSales,
  getTokenRead,
  getVesting,
  type IndexedEscrow,
  type IndexedSale,
  type IndexedToken,
} from "@/lib/indexer";
import { hasCommitment } from "@/lib/journey";
import { getVerifiedJourney, getVerifiedUpdates } from "@/lib/journey-db";
import { getVerifiedTokenMetadata } from "@/lib/token-metadata-db";

/**
 * Read-only views over a deployed launch, shared by the global MCP tools
 * (lib/mcp/launch-tools.ts, keyed by address) and the project-scoped ones
 * (lib/mcp/project-tools.ts, bound to one project's deployed token). Pure
 * shaping plus the indexer and journey reads a launch view needs.
 */

export const INDEXER_HINT =
  "The launch indexer is unreachable right now. Retry in a moment, or open the launch page on canhav.com.";

/** A view either resolves or carries the message a tool should return. */
export type View<T> = { ok: true; value: T } | { ok: false; message: string };

export function isoTime(unixSeconds: string | number): string {
  return new Date(Number(unixSeconds) * 1000).toISOString();
}

export function launchUrl(address: string): string {
  return `https://www.canhav.com/launch/t/${address}`;
}

export function explorerAddress(address: string): string {
  return `${LAUNCH_CHAIN.explorerUrl}/address/${address}`;
}

export function summarizeToken(t: IndexedToken) {
  return {
    address: t.address,
    name: t.name,
    symbol: t.symbol,
    creator: t.creator,
    totalSupply: formatSupply(t.totalSupply),
    totalSupplyWei: t.totalSupply,
    imageURI: t.imageURI || null,
    xHandle: t.xHandle || null,
    website: t.website || null,
    journeyHash: t.journeyHash,
    factoryVersion: t.version,
    launchedAt: isoTime(t.blockTimestamp),
    launchTxHash: t.txHash,
    chainId: LAUNCH_CHAIN.chainId,
    launchUrl: launchUrl(t.address),
    explorerUrl: explorerAddress(t.address),
  };
}

export type SalePhase = "upcoming" | "open" | "closed" | "reclaimed";

export function salePhase(s: IndexedSale, now: number): SalePhase {
  if (s.unsoldReclaimed) return "reclaimed";
  if (now < Number(s.startTime)) return "upcoming";
  if (now <= Number(s.endTime)) return "open";
  return "closed";
}

export function summarizeSale(s: IndexedSale, now: number) {
  return {
    saleId: s.saleId,
    phase: salePhase(s, now),
    priceWeiPerToken: s.price,
    allocationWei: s.allocation,
    soldWei: s.sold,
    raisedWei: s.raised,
    perWalletCapWei: s.perWalletCap,
    startsAt: isoTime(s.startTime),
    endsAt: isoTime(s.endTime),
    unsoldReclaimed: s.unsoldReclaimed,
    createdTxHash: s.txHash,
    proceedsTranches: s.tranches.map((t) => ({
      trancheIndex: t.trancheIndex,
      milestoneIndex: t.milestoneIndex,
      claimedAmountWei: t.claimedAmount,
      claimedTxHash: t.claimedTxHash,
    })),
  };
}

export function summarizeEscrow(e: IndexedEscrow) {
  return {
    escrowId: e.escrowId,
    creator: e.creator,
    tranches: e.tranches.map((t) => ({
      trancheIndex: t.trancheIndex,
      milestoneIndex: t.milestoneIndex,
      amountWei: t.amount,
      unlocksAt: isoTime(t.unlockTime),
      claimed: t.claimed,
      claimedAt: t.claimedAt ? isoTime(t.claimedAt) : null,
      claimedTxHash: t.claimedTxHash,
    })),
  };
}

export async function linkedDesign(address: string) {
  const row = await getTokenDesignByAddress(address);
  if (!row || row.status !== "published" || !row.slug) return null;
  return {
    slug: row.slug,
    designUrl: `https://www.canhav.com/t/${row.slug}`,
    snapshotHash: row.deployed_snapshot_hash,
  };
}

export async function journeyBlock(token: IndexedToken) {
  if (!hasCommitment(token.journeyHash)) {
    return {
      onChainHash: token.journeyHash,
      committed: false,
      stored: false,
      verified: false,
      doc: null,
      milestoneUpdates: [],
      note: "Launched without a commitment. No journey document, no milestones.",
    };
  }
  const [journey, updates] = await Promise.all([
    getVerifiedJourney(token.journeyHash),
    getVerifiedUpdates(token.address, token.creator),
  ]);
  return {
    onChainHash: token.journeyHash,
    committed: true,
    stored: journey !== null,
    verified: journey?.verified ?? false,
    doc: journey?.doc ?? null,
    milestoneUpdates: Object.entries(updates).map(([milestoneIndex, list]) => ({
      milestoneIndex: Number(milestoneIndex),
      updates: list.map((u) => ({
        body: u.body,
        postedAt: isoTime(u.postedAt),
        txHash: u.txHash,
      })),
    })),
  };
}

/**
 * Everything CanHav knows about one deployed token. The global get_launch tool
 * and a project-scoped server bound to that token both return exactly this.
 */
export async function launchView(address: string): Promise<View<unknown>> {
  // getTokenRead keeps "indexer down" apart from "no such token", so this no
  // longer needs a second getTokens() call purely as an offline probe.
  const read = await getTokenRead(address);
  if (read.status === "unavailable") return { ok: false, message: INDEXER_HINT };
  if (read.status === "empty")
    return { ok: false, message: `No CanHav launch at ${address}.` };
  const token = read.value;
  const now = Math.floor(Date.now() / 1000);
  const [journey, meta, vesting, escrows, sales, pool, design] = await Promise.all([
    journeyBlock(token),
    getVerifiedTokenMetadata(token.descriptionHash, token.creator),
    getVesting(token.address),
    getEscrows(token.address),
    getSales(token.address),
    getPool(token.address, token.creator),
    linkedDesign(token.address),
  ]);
  return {
    ok: true,
    value: {
      token: summarizeToken(token),
      // The description text only counts when it re-hashes to the on-chain
      // descriptionHash. Telegram is stored beside it and is not committed.
      metadata: {
        descriptionHash: token.descriptionHash,
        description: meta?.description ?? null,
        telegram: meta?.telegram ?? null,
        verified: meta !== null,
      },
      journey,
      vesting: vesting
        ? {
            walletAddress: vesting.walletAddress,
            amountWei: vesting.amount,
            startsAt: isoTime(vesting.startTimestamp),
            cliffSeconds: Number(vesting.cliffSeconds),
            durationSeconds: Number(vesting.durationSeconds),
            txHash: vesting.txHash,
          }
        : null,
      escrows: (escrows ?? []).map(summarizeEscrow),
      sales: (sales ?? []).map((s) => summarizeSale(s, now)),
      pool: pool
        ? {
            poolId: pool.poolId,
            ethReserveWei: pool.ethReserve,
            tokenReserveWei: pool.tokenReserve,
            totalShares: pool.totalShares,
            protocolFeeBps: pool.protocolFeeBps,
            txHash: pool.txHash,
          }
        : null,
      design,
    },
  };
}
