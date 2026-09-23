import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { LAUNCH_CHAIN } from "@/content/launch";
import { getMyTokenDesigns, getTokenDesignByAddress } from "@/lib/ideation-db";
import {
  formatSupply,
  getActiveSaleTokens,
  getEscrows,
  getPool,
  getRecentPurchases,
  getRecentSwaps,
  getSales,
  getTimelockOperations,
  getToken,
  getTokens,
  getTokensByCreator,
  getVesting,
  type IndexedEscrow,
  type IndexedSale,
  type IndexedToken,
} from "@/lib/indexer";
import { hasCommitment } from "@/lib/journey";
import { getVerifiedJourney, getVerifiedUpdates } from "@/lib/journey-db";
import {
  errorResult,
  jsonResult,
  mcpUserId,
  registerMeteredTool,
} from "@/lib/mcp/register";

/**
 * MCP tools over deployed token launches on Robinhood Chain Testnet. Every
 * read comes from the launch indexer (lib/indexer.ts) or the journey tables
 * in Neon (lib/journey-db.ts), the same sources the /launch/t/[address] page
 * uses, so an agent sees exactly what a visitor sees. All tools are read
 * only. Nothing here signs, submits, or stores anything.
 */

const INDEXER_HINT =
  "The launch indexer is unreachable right now. Retry in a moment, or open the launch page on canhav.com.";
const AUTH_HINT =
  "Authorize this MCP server via OAuth (a free CanHav account) to list your own launches.";
const DB_HINT = "Storage not configured.";

const ADDRESS = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected a 0x address with 40 hex characters")
  .transform((v) => v.toLowerCase());

function isoTime(unixSeconds: string | number): string {
  return new Date(Number(unixSeconds) * 1000).toISOString();
}

function launchUrl(address: string): string {
  return `https://www.canhav.com/launch/t/${address}`;
}

function explorerAddress(address: string): string {
  return `${LAUNCH_CHAIN.explorerUrl}/address/${address}`;
}

function summarizeToken(t: IndexedToken) {
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

type SalePhase = "upcoming" | "open" | "closed" | "reclaimed";

function salePhase(s: IndexedSale, now: number): SalePhase {
  if (s.unsoldReclaimed) return "reclaimed";
  if (now < Number(s.startTime)) return "upcoming";
  if (now <= Number(s.endTime)) return "open";
  return "closed";
}

function summarizeSale(s: IndexedSale, now: number) {
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

function summarizeEscrow(e: IndexedEscrow) {
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

async function linkedDesign(address: string) {
  const row = await getTokenDesignByAddress(address);
  if (!row || row.status !== "published" || !row.slug) return null;
  return {
    slug: row.slug,
    designUrl: `https://www.canhav.com/t/${row.slug}`,
    snapshotHash: row.deployed_snapshot_hash,
  };
}

async function journeyBlock(token: IndexedToken) {
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

export function registerLaunchTools(server: McpServer): void {
  registerMeteredTool(
    server,
    "list_launches",
    {
      title: "List token launches",
      description:
        "Newest-first list of tokens launched through the CanHav factory on Robinhood Chain Testnet, with a flag for launches that have a sale open right now. Pass creator to see one wallet's launches.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional(),
        creator: ADDRESS.optional(),
      }),
    },
    async ({ limit, creator }) => {
      const max = limit ?? 25;
      if (creator) {
        const history = await getTokensByCreator(creator);
        if (!history) return errorResult(INDEXER_HINT);
        return jsonResult({
          creator,
          totalCount: history.totalCount,
          launches: history.items.slice(0, max).map((t) => ({
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            launchedAt: isoTime(t.blockTimestamp),
            launchUrl: launchUrl(t.address),
          })),
        });
      }
      const [tokens, active] = await Promise.all([getTokens(), getActiveSaleTokens()]);
      if (!tokens) return errorResult(INDEXER_HINT);
      return jsonResult({
        totalReturned: Math.min(tokens.length, max),
        launches: tokens.slice(0, max).map((t) => ({
          ...summarizeToken(t),
          saleOpen: active?.has(t.address.toLowerCase()) ?? null,
        })),
      });
    },
  );

  registerMeteredTool(
    server,
    "get_launch",
    {
      title: "Get a token launch",
      description:
        "Everything CanHav knows about one deployed token by address. Token metadata, the journey document verified against its on-chain hash, creator milestone updates, vesting, milestone escrow tranches, allocation sales, the creator's AMM pool, and the linked published design when one exists.",
      inputSchema: z.object({ address: ADDRESS }),
    },
    async ({ address }) => {
      const token = await getToken(address);
      if (token === null) {
        const probe = await getTokens();
        return errorResult(probe === null ? INDEXER_HINT : `No CanHav launch at ${address}.`);
      }
      const now = Math.floor(Date.now() / 1000);
      const [journey, vesting, escrows, sales, pool, design] = await Promise.all([
        journeyBlock(token),
        getVesting(token.address),
        getEscrows(token.address),
        getSales(token.address),
        getPool(token.address, token.creator),
        linkedDesign(token.address),
      ]);
      return jsonResult({
        token: summarizeToken(token),
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
      });
    },
  );

  registerMeteredTool(
    server,
    "get_launch_journey",
    {
      title: "Get a launch journey",
      description:
        "The journey document a creator committed to at launch (why the token exists, supply rationale, dated milestones) together with the on-chain hash, the recomputed hash, and whether they match.",
      inputSchema: z.object({ address: ADDRESS }),
    },
    async ({ address }) => {
      const token = await getToken(address);
      if (!token) return errorResult(`No CanHav launch at ${address}, or the indexer is unreachable.`);
      if (!hasCommitment(token.journeyHash)) {
        return jsonResult({
          address: token.address,
          onChainHash: token.journeyHash,
          committed: false,
          stored: false,
          verified: false,
          doc: null,
          note: "This token was launched without a commitment.",
        });
      }
      const journey = await getVerifiedJourney(token.journeyHash);
      if (!journey) {
        return jsonResult({
          address: token.address,
          onChainHash: token.journeyHash,
          committed: true,
          stored: false,
          verified: false,
          doc: null,
          note: "No journey document is stored for this hash. The launch may have been made from a published design snapshot rather than the quick launch form.",
        });
      }
      return jsonResult({
        address: token.address,
        onChainHash: token.journeyHash,
        committed: true,
        stored: true,
        verified: journey.verified,
        doc: journey.doc,
      });
    },
  );

  registerMeteredTool(
    server,
    "get_milestone_updates",
    {
      title: "Get milestone updates",
      description:
        "Progress updates the creator anchored on-chain for a launch, grouped by milestone index. Only creator-authored updates whose stored body matches the anchored hash are returned.",
      inputSchema: z.object({ address: ADDRESS }),
    },
    async ({ address }) => {
      const token = await getToken(address);
      if (!token) return errorResult(`No CanHav launch at ${address}, or the indexer is unreachable.`);
      const block = await journeyBlock(token);
      return jsonResult({
        address: token.address,
        creator: token.creator,
        milestones: block.doc?.milestones ?? null,
        milestoneUpdates: block.milestoneUpdates,
      });
    },
  );

  registerMeteredTool(
    server,
    "get_sale_status",
    {
      title: "Get sale status",
      description:
        "Allocation sales for a launch with their current phase (upcoming, open, closed, reclaimed), amounts sold and raised, proceeds tranches, and the most recent purchases.",
      inputSchema: z.object({
        address: ADDRESS,
        recentLimit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async ({ address, recentLimit }) => {
      const sales = await getSales(address);
      if (sales === null) return errorResult(INDEXER_HINT);
      const now = Math.floor(Date.now() / 1000);
      const withPurchases = await Promise.all(
        sales.map(async (s) => ({
          ...summarizeSale(s, now),
          recentPurchases: ((await getRecentPurchases(s.saleId, recentLimit ?? 10)) ?? []).map(
            (p) => ({
              buyer: p.buyer,
              tokenAmountWei: p.tokenAmount,
              costWei: p.cost,
              at: isoTime(p.blockTimestamp),
              txHash: p.txHash,
            }),
          ),
        })),
      );
      return jsonResult({ address, saleContract: LAUNCH_CHAIN.saleAddress, sales: withPurchases });
    },
  );

  registerMeteredTool(
    server,
    "get_pool_status",
    {
      title: "Get pool status",
      description:
        "The creator's AMM pool for a launch with reserves, LP shares, protocol fee, swap count, ETH volume, and the most recent swaps.",
      inputSchema: z.object({
        address: ADDRESS,
        recentLimit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async ({ address, recentLimit }) => {
      const token = await getToken(address);
      if (!token) return errorResult(`No CanHav launch at ${address}, or the indexer is unreachable.`);
      const pool = await getPool(token.address, token.creator);
      if (!pool) {
        return jsonResult({ address: token.address, ammContract: LAUNCH_CHAIN.ammAddress, pool: null });
      }
      const swaps = await getRecentSwaps(pool.poolId, recentLimit ?? 10);
      return jsonResult({
        address: token.address,
        ammContract: LAUNCH_CHAIN.ammAddress,
        pool: {
          poolId: pool.poolId,
          creator: pool.creator,
          ethReserveWei: pool.ethReserve,
          tokenReserveWei: pool.tokenReserve,
          totalShares: pool.totalShares,
          protocolFeeBps: pool.protocolFeeBps,
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
      });
    },
  );

  registerMeteredTool(
    server,
    "get_launch_governance",
    {
      title: "Get launch governance",
      description:
        "The contract addresses behind CanHav launches on Robinhood Chain Testnet and the timelock queue that gates every admin change to the factory and AMM, newest first.",
      inputSchema: z.object({}),
    },
    async () => {
      const ops = await getTimelockOperations();
      if (ops === null) return errorResult(INDEXER_HINT);
      return jsonResult({
        chain: {
          name: LAUNCH_CHAIN.name,
          chainId: LAUNCH_CHAIN.chainId,
          explorerUrl: LAUNCH_CHAIN.explorerUrl,
        },
        contracts: {
          tokenFactory: LAUNCH_CHAIN.factoryAddress,
          timelock: LAUNCH_CHAIN.timelockAddress,
          milestoneEscrow: LAUNCH_CHAIN.escrowAddress,
          journeyUpdates: LAUNCH_CHAIN.updatesAddress,
          allocationSale: LAUNCH_CHAIN.saleAddress,
          launchAmm: LAUNCH_CHAIN.ammAddress,
          feeSplitter: LAUNCH_CHAIN.splitterAddress,
        },
        timelockOperations: ops.map((o) => ({
          id: o.id,
          target: o.target,
          status: o.status,
          delaySeconds: Number(o.delay),
          scheduledAt: isoTime(o.scheduledAt),
          readyAt: isoTime(o.readyAt),
          scheduledTxHash: o.scheduledTxHash,
          executedTxHash: o.executedTxHash,
          calldata: o.data,
        })),
      });
    },
  );

  registerMeteredTool(
    server,
    "get_my_launches",
    {
      title: "My launches",
      description:
        "Deployed tokens attached to the authenticated user's CanHav token designs, each joined with its live launch record.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const userId = mcpUserId(ctx);
      if (!userId) return errorResult(AUTH_HINT);
      const rows = await getMyTokenDesigns(userId);
      if (rows === null) return errorResult(DB_HINT);
      const deployed = rows.filter((r) => r.deployed_token_address);
      const launches = await Promise.all(
        deployed.map(async (r) => {
          const address = r.deployed_token_address as string;
          const token = await getToken(address);
          return {
            design: { id: r.id, slug: r.slug, status: r.status, name: r.draft_doc.name },
            address,
            deployedAt: r.deployed_at,
            deployedByWallet: r.deployed_by_wallet,
            launchUrl: launchUrl(address),
            launch: token ? summarizeToken(token) : null,
          };
        }),
      );
      return jsonResult({ count: launches.length, launches });
    },
  );
}
