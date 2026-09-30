import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { LAUNCH_CHAIN } from "@/content/launch";
import {
  formatSupply,
  getActiveSaleTokens,
  getCurve,
  getCurves,
  getCurveTrades,
  getEscrows,
  getLaunchPool,
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
  curveState,
  curveStatusView,
  INDEXER_HINT,
  isoTime,
  journeyView,
  launchUrl,
  launchView,
  milestoneUpdatesView,
  poolStatusView,
  salePhase,
  saleStatusView,
  summarizeCurve,
  summarizeEscrow,
  summarizePool,
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
        "Newest-first list of tokens launched through CanHav on Robinhood Chain Testnet (the factory or the bonding-curve launcher), with a flag for launches that have a sale open right now and, for curve launches, the curve state and graduation progress. Pass creator to see one wallet's launches.",
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
      const [tokens, active, curves] = await Promise.all([
        getTokens(),
        getActiveSaleTokens(),
        getCurves(),
      ]);
      if (!tokens) return errorResult(INDEXER_HINT);
      const now = Math.floor(Date.now() / 1000);
      return jsonResult({
        totalReturned: Math.min(tokens.length, max),
        launches: tokens.slice(0, max).map((t) => {
          const curve = curves?.get(t.address.toLowerCase()) ?? null;
          return {
            ...summarizeToken(t),
            saleOpen: active?.has(t.address.toLowerCase()) ?? null,
            curve: curve
              ? { state: curveState(curve, now), progressPct: summarizeCurve(curve, now).progressPct }
              : null,
          };
        }),
      });
    },
  );

  registerMeteredTool(
    server,
    "get_launch",
    {
      title: "Get a token launch",
      description:
        "Everything CanHav knows about one deployed token by address. Token metadata, the description text and Telegram handle verified against the on-chain description hash, the journey document verified against its on-chain hash, creator milestone updates, vesting, milestone escrow tranches, allocation sales, the launch's AMM pool (the creator's, or the locked one the curve seeded), the bonding curve state for a curve launch, the linked published design when one exists, and the studio project the token was launched from (its sectors and shapes always, its name only when published).",
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
      const view = await journeyView(address);
      return view.ok ? jsonResult(view.value) : errorResult(view.message);
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
      const view = await milestoneUpdatesView(address);
      return view.ok ? jsonResult(view.value) : errorResult(view.message);
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
      const view = await saleStatusView(address, recentLimit);
      return view.ok ? jsonResult(view.value) : errorResult(view.message);
    },
  );

  registerMeteredTool(
    server,
    "get_pool_status",
    {
      title: "Get pool status",
      description:
        "The launch's AMM pool with reserves, LP shares, protocol fee, swap count, ETH volume, and the most recent swaps. For a curve launch this is the pool the launcher seeded at graduation, whose liquidity is locked; otherwise the creator's own pool.",
      inputSchema: z.object({
        address: ADDRESS,
        recentLimit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async ({ address, recentLimit }) => {
      const view = await poolStatusView(address, recentLimit);
      return view.ok ? jsonResult(view.value) : errorResult(view.message);
    },
  );

  registerMeteredTool(
    server,
    "get_curve_status",
    {
      title: "Get bonding curve status",
      description:
        "The bonding curve for a launch made through the CanHav curve launcher. Reserves and price, ETH raised against the graduation threshold with progress, the snipe tax window and the tax held for graduation, trade counts and volume, the most recent trades, and after graduation the locked pool id and what was seeded. Null curve for a factory launch.",
      inputSchema: z.object({
        address: ADDRESS,
        recentLimit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async ({ address, recentLimit }) => {
      const view = await curveStatusView(address, recentLimit);
      return view.ok ? jsonResult(view.value) : errorResult(view.message);
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
        "The authenticated user's own launches. Tokens launched while signed in to CanHav plus tokens attached to the user's token designs, each joined with its live launch record and the studio project it was launched from.",
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
        project: entry.project,
        launchUrl: launchUrl(entry.address),
        launch: entry.launch ? summarizeToken(entry.launch) : null,
      }));
      return jsonResult({ count: launches.length, launches });
    },
  );
}
