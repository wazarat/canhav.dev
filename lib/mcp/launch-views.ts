import "server-only";

import { LAUNCH_CHAIN } from "@/content/launch";
import { getTokenDesignByAddress } from "@/lib/ideation-db";
import {
  curveProgressPct,
  curveWindowOpen,
  formatSupply,
  getCurve,
  getEscrows,
  getLaunchPool,
  getSales,
  getTokenRead,
  getVesting,
  isCurveLaunch,
  type IndexedCurve,
  type IndexedEscrow,
  type IndexedPool,
  type IndexedSale,
  type IndexedToken,
} from "@/lib/indexer";
import { formatPriceEth } from "@/lib/format";
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
    // "curve" when the CurveLauncher emitted the launch, "factory" for the
    // TokenFactory versions. `launcher` is the emitting contract.
    launchedVia: isCurveLaunch(t) ? "curve" : "factory",
    launcher: t.factory,
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

export type CurveState = "live" | "window" | "graduated";

export function curveState(c: IndexedCurve, now: number): CurveState {
  if (c.graduated) return "graduated";
  return curveWindowOpen(c, now) ? "window" : "live";
}

/** The bonding curve behind a launch, in the shape every tool returns. */
export function summarizeCurve(c: IndexedCurve, now: number) {
  return {
    state: curveState(c, now),
    developer: c.developer,
    launcherContract: LAUNCH_CHAIN.curveAddress,
    supplyWei: c.supply,
    curveSupplyWei: c.curveSupply,
    poolSupplyWei: c.poolSupply,
    virtualEthReserveWei: c.virtualEthReserve,
    ethReserveWei: c.ethReserve,
    tokenReserveWei: c.tokenReserve,
    priceEthPerToken: formatPriceEth(BigInt(c.ethReserve), BigInt(c.tokenReserve)),
    raisedWei: c.raisedWei,
    thresholdWei: c.thresholdWei,
    progressPct: curveProgressPct(c),
    taxPotWei: c.taxPotWei,
    snipeTaxBps: c.snipeTaxBps,
    windowEndsAt: isoTime(c.windowEnd),
    windowOpen: curveWindowOpen(c, now),
    buyCount: c.buyCount,
    sellCount: c.sellCount,
    ethVolumeWei: c.ethVolume,
    graduated: c.graduated,
    poolId: c.poolId,
    ethSeededWei: c.ethSeeded,
    tokensSeededWei: c.tokensSeeded,
    sharesLocked: c.sharesLocked,
    graduatedAt: c.graduatedAt ? isoTime(c.graduatedAt) : null,
    graduationTxHash: c.graduationTxHash,
    createdTxHash: c.txHash,
  };
}

/** Pool block shared by launchView and get_pool_status. `lockedLiquidity` is
 *  true for a pool the curve launcher seeded: it holds the shares and has no
 *  path to remove them. */
export function summarizePool(pool: IndexedPool) {
  return {
    poolId: pool.poolId,
    creator: pool.creator,
    lockedLiquidity: pool.creator.toLowerCase() === LAUNCH_CHAIN.curveAddress.toLowerCase(),
    ethReserveWei: pool.ethReserve,
    tokenReserveWei: pool.tokenReserve,
    totalShares: pool.totalShares,
    protocolFeeBps: pool.protocolFeeBps,
    txHash: pool.txHash,
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
  const [journey, meta, vesting, escrows, sales, curve, design] = await Promise.all([
    journeyBlock(token),
    getVerifiedTokenMetadata(token.descriptionHash, token.creator),
    getVesting(token.address),
    getEscrows(token.address),
    getSales(token.address),
    getCurve(token.address),
    linkedDesign(token.address),
  ]);
  // A graduated curve's pool belongs to the launcher, so it is found by id.
  const pool = await getLaunchPool(token, curve);
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
      pool: pool ? summarizePool(pool) : null,
      // Null for factory launches. Fields are only ever added.
      curve: curve ? summarizeCurve(curve, now) : null,
      design,
    },
  };
}
