import "server-only";

import { launchChain } from "@/content/launch";
import { DEFAULT_PROJECT_CHAIN, type ProjectChain } from "@/lib/chains";
import { getTokenDesignByAddress } from "@/lib/ideation-db";
import {
  curveProgressPct,
  curveWindowOpen,
  formatSupply,
  getCurve,
  getCurveTrades,
  getEscrows,
  getLaunchPool,
  getRecentPurchases,
  getRecentSwaps,
  getSales,
  findToken,
  findTokenRead,
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
import { getLaunchCommitment, getVerifiedUpdates } from "@/lib/journey-db";
import { getLaunchProjectSummary } from "@/lib/launch-project";
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

export function explorerAddress(address: string, chain?: ProjectChain): string {
  return `${launchChain(chain).explorerUrl}/address/${address}`;
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
    // The chain the token lives on (M54). Every read for it goes there.
    chain: t.chain ?? DEFAULT_PROJECT_CHAIN,
    chainId: launchChain(t.chain).chainId,
    launchUrl: launchUrl(t.address),
    explorerUrl: explorerAddress(t.address, t.chain),
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
export function summarizeCurve(c: IndexedCurve, now: number, chain?: ProjectChain) {
  return {
    state: curveState(c, now),
    developer: c.developer,
    launcherContract: launchChain(chain).curveAddress,
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
export function summarizePool(pool: IndexedPool, chain?: ProjectChain) {
  return {
    poolId: pool.poolId,
    creator: pool.creator,
    lockedLiquidity: pool.creator.toLowerCase() === launchChain(chain).curveAddress.toLowerCase(),
    ethReserveWei: pool.ethReserve,
    tokenReserveWei: pool.tokenReserve,
    totalShares: pool.totalShares,
    protocolFeeBps: pool.protocolFeeBps,
    txHash: pool.txHash,
  };
}

/**
 * The studio project a launch was started from. Sectors, subsectors and
 * shapes are public; the id, name and URL only when the project is
 * published, or when the scoped (owner-only) server asks with
 * `includePrivate`.
 */
export async function projectBlock(address: string, includePrivate = false) {
  const summary = await getLaunchProjectSummary(address);
  if (!summary) return null;
  const p = summary.project;
  const visible = p.status === "published" || includePrivate;
  return {
    id: visible ? p.id : null,
    name: visible ? p.name : null,
    published: p.status === "published",
    publicUrl: p.publicUrl,
    sectors: p.sectors,
    sectorLabels: p.sectorLabels,
    subsectors: p.subsectors,
    subsectorLabels: p.subsectorLabels,
    shapes: p.shapes,
    shapeLabels: p.shapeLabels,
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
      source: null,
      doc: null,
      milestones: null,
      design: null,
      milestoneUpdates: [],
      note: "Launched without a commitment. No journey document, no milestones.",
    };
  }
  const [commitment, updates] = await Promise.all([
    getLaunchCommitment(token.journeyHash),
    getVerifiedUpdates(token.address, token.creator, token.chain),
  ]);
  return {
    onChainHash: token.journeyHash,
    committed: true,
    stored: commitment !== null,
    verified: commitment?.verified ?? false,
    // "journey" for the quick launch form, "design" for a launch that committed a published design (M48).
    source: commitment?.source ?? null,
    doc: commitment?.source === "journey" ? commitment.doc : null,
    // The milestones of either document, so sales, escrow and updates read the same list.
    milestones: commitment?.milestones ?? null,
    design:
      commitment?.source === "design"
        ? {
            slug: commitment.slug,
            name: commitment.name,
            version: commitment.version,
            snapshotHash: commitment.snapshotHash,
            designUrl: `https://www.canhav.com/t/${commitment.slug}`,
          }
        : null,
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
export async function launchView(
  address: string,
  opts: { includePrivateProject?: boolean } = {},
): Promise<View<unknown>> {
  // getTokenRead keeps "indexer down" apart from "no such token", so this no
  // longer needs a second getTokens() call purely as an offline probe.
  const read = await findTokenRead(address);
  if (read.status === "unavailable") return { ok: false, message: INDEXER_HINT };
  if (read.status === "empty")
    return { ok: false, message: `No CanHav launch at ${address}.` };
  const token = read.value;
  const now = Math.floor(Date.now() / 1000);
  const [journey, meta, vesting, escrows, sales, curve, design, project] = await Promise.all([
    journeyBlock(token),
    getVerifiedTokenMetadata(token.descriptionHash, token.creator),
    getVesting(token.address, token.chain),
    getEscrows(token.address, token.chain),
    getSales(token.address, token.chain),
    getCurve(token.address, token.chain),
    linkedDesign(token.address),
    projectBlock(token.address, opts.includePrivateProject),
  ]);
  // A graduated curve's pool belongs to the launcher, so it is found by id.
  const pool = await getLaunchPool(token, curve, token.chain);
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
      pool: pool ? summarizePool(pool, token.chain) : null,
      // Null for factory launches. Fields are only ever added.
      curve: curve ? summarizeCurve(curve, now, token.chain) : null,
      design,
      // The studio project the launch was started from (M19d), or null.
      project,
    },
  };
}

// ---------------------------------------------------------------------------
// The five activity views (M45). Address keyed, shared by the global tools
// and the project server, which binds them to the project's own token.

export function noLaunchMessage(address: string): string {
  return `No CanHav launch at ${address}, or the indexer is unreachable.`;
}

export async function journeyView(address: string): Promise<View<unknown>> {
  const token = await findToken(address);
  if (!token) return { ok: false, message: noLaunchMessage(address) };
  if (!hasCommitment(token.journeyHash)) {
    return {
      ok: true,
      value: {
        address: token.address,
        onChainHash: token.journeyHash,
        committed: false,
        stored: false,
        verified: false,
        doc: null,
        note: "This token was launched without a commitment.",
      },
    };
  }
  const commitment = await getLaunchCommitment(token.journeyHash);
  if (!commitment) {
    return {
      ok: true,
      value: {
        address: token.address,
        onChainHash: token.journeyHash,
        committed: true,
        stored: false,
        verified: false,
        source: null,
        doc: null,
        milestones: null,
        note: "Nothing on this site is stored for this hash, neither a journey document nor a published design snapshot.",
      },
    };
  }
  if (commitment.source === "design") {
    return {
      ok: true,
      value: {
        address: token.address,
        onChainHash: token.journeyHash,
        committed: true,
        stored: true,
        verified: commitment.verified,
        source: "design",
        doc: null,
        milestones: commitment.milestones,
        design: {
          slug: commitment.slug,
          name: commitment.name,
          version: commitment.version,
          snapshotHash: commitment.snapshotHash,
          designUrl: `https://www.canhav.com/t/${commitment.slug}`,
        },
        note: "This token committed a published design snapshot. Its milestones, when the design carries them, are the launch's milestones.",
      },
    };
  }
  return {
    ok: true,
    value: {
      address: token.address,
      onChainHash: token.journeyHash,
      committed: true,
      stored: true,
      verified: commitment.verified,
      source: "journey",
      doc: commitment.doc,
      milestones: commitment.milestones,
    },
  };
}

export async function milestoneUpdatesView(address: string): Promise<View<unknown>> {
  const token = await findToken(address);
  if (!token) return { ok: false, message: noLaunchMessage(address) };
  const block = await journeyBlock(token);
  return {
    ok: true,
    value: {
      address: token.address,
      creator: token.creator,
      milestones: block.milestones,
      milestoneUpdates: block.milestoneUpdates,
    },
  };
}

export async function saleStatusView(address: string, recentLimit = 10): Promise<View<unknown>> {
  // A sale is read from the chain its token lives on (M54). An unknown token reads as Robinhood.
  const chain = (await findToken(address))?.chain;
  const sales = await getSales(address, chain);
  if (sales === null) return { ok: false, message: INDEXER_HINT };
  const now = Math.floor(Date.now() / 1000);
  const withPurchases = await Promise.all(
    sales.map(async (s) => ({
      ...summarizeSale(s, now),
      recentPurchases: ((await getRecentPurchases(s.saleId, recentLimit, chain)) ?? []).map((p) => ({
        buyer: p.buyer,
        tokenAmountWei: p.tokenAmount,
        costWei: p.cost,
        at: isoTime(p.blockTimestamp),
        txHash: p.txHash,
      })),
    })),
  );
  return { ok: true, value: { address, saleContract: launchChain(chain).saleAddress, sales: withPurchases } };
}

export async function poolStatusView(address: string, recentLimit = 10): Promise<View<unknown>> {
  const token = await findToken(address);
  if (!token) return { ok: false, message: noLaunchMessage(address) };
  const pool = await getLaunchPool(token, await getCurve(token.address, token.chain), token.chain);
  if (!pool) {
    return { ok: true, value: { address: token.address, ammContract: launchChain(token.chain).ammAddress, pool: null } };
  }
  const swaps = await getRecentSwaps(pool.poolId, recentLimit, token.chain);
  return {
    ok: true,
    value: {
      address: token.address,
      ammContract: launchChain(token.chain).ammAddress,
      pool: {
        ...summarizePool(pool, token.chain),
        swapCount: swaps?.count ?? null,
        ethVolumeWei: swaps ? swaps.ethVolume.toString() : null,
        recentSwaps: (swaps?.swaps ?? []).map((x) => ({
          trader: x.trader,
          direction: x.ethToToken ? "eth_to_token" : "token_to_eth",
          amountInWei: x.amountIn,
          amountOutWei: x.amountOut,
          protocolFeePaidWei: x.protocolFeePaid,
          at: isoTime(x.blockTimestamp),
          txHash: x.txHash,
        })),
      },
    },
  };
}

export async function curveStatusView(address: string, recentLimit = 10): Promise<View<unknown>> {
  const token = await findToken(address);
  if (!token) return { ok: false, message: noLaunchMessage(address) };
  const curve = await getCurve(token.address, token.chain);
  if (!curve) {
    return {
      ok: true,
      value: { address: token.address, launcherContract: launchChain(token.chain).curveAddress, curve: null, recentTrades: [] },
    };
  }
  const trades = await getCurveTrades(token.address, recentLimit, token.chain);
  const now = Math.floor(Date.now() / 1000);
  return {
    ok: true,
    value: {
      address: token.address,
      launcherContract: launchChain(token.chain).curveAddress,
      curve: summarizeCurve(curve, now, token.chain),
      tradeCount: trades?.count ?? null,
      recentTrades: (trades?.trades ?? []).map((x) => ({
        trader: x.trader,
        side: x.side,
        ethWei: x.ethWei,
        taxWei: x.taxWei,
        tokensWei: x.tokensWei,
        developerBuy: x.side === "buy" && x.txHash.toLowerCase() === curve.txHash.toLowerCase(),
        at: isoTime(x.blockTimestamp),
        txHash: x.txHash,
      })),
    },
  };
}
