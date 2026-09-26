import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { LAUNCH_CHAIN } from "@/content/launch";
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
} from "@/lib/indexer";
import { hasCommitment } from "@/lib/journey";
import { getVerifiedJourney } from "@/lib/journey-db";
import { getMyLaunches } from "@/lib/my-launches";
import {
  INDEXER_HINT,
  isoTime,
  journeyBlock,
  launchUrl,
  launchView,
  salePhase,
  summarizeEscrow,
  summarizeSale,
  summarizeToken,
} from "@/lib/mcp/launch-views";
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

const AUTH_HINT =
  "Authorize this MCP server via OAuth (a free CanHav account) to list your own launches.";
const DB_HINT = "Storage not configured.";

const ADDRESS = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected a 0x address with 40 hex characters")
  .transform((v) => v.toLowerCase());

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
        "Everything CanHav knows about one deployed token by address. Token metadata, the description text and Telegram handle verified against the on-chain description hash, the journey document verified against its on-chain hash, creator milestone updates, vesting, milestone escrow tranches, allocation sales, the creator's AMM pool, and the linked published design when one exists.",
      inputSchema: z.object({ address: ADDRESS }),
    },
    async ({ address }) => {
      const view = await launchView(address);
      return view.ok ? jsonResult(view.value) : errorResult(view.message);
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
        "The authenticated user's own launches. Tokens launched while signed in to CanHav plus tokens attached to the user's token designs, each joined with its live launch record.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const userId = mcpUserId(ctx);
      if (!userId) return errorResult(AUTH_HINT);
      const mine = await getMyLaunches(userId);
      if (mine === null) return errorResult(DB_HINT);
      const launches = mine.map((entry) => ({
        address: entry.address,
        source: entry.source,
        launchedAt: entry.launchedAt,
        creatorWallet: entry.creatorWallet,
        launchTxHash: entry.launchTxHash,
        design: entry.design,
        launchUrl: launchUrl(entry.address),
        launch: entry.launch ? summarizeToken(entry.launch) : null,
      }));
      return jsonResult({ count: launches.length, launches });
    },
  );
}
