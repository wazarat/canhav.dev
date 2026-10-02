import "server-only";

import { LIVE_LAUNCH_CHAINS, launchChain } from "@/content/launch";
import { DEFAULT_PROJECT_CHAIN, type ProjectChain } from "@/lib/chains";

/**
 * Data layer for the launchpad indexer (Ponder GraphQL API). Local-first: the
 * indexer runs in indexer/ (`npm run dev`, port 42069). Every fetch degrades
 * gracefully to null so the hidden pages render an "indexer offline" state
 * instead of crashing.
 */

/**
 * One indexer per chain (M54), the same Ponder code run once for each. A
 * chain with no URL configured reads as unreachable, the same as an indexer
 * that is down. Every reader takes the chain last and defaults to Robinhood,
 * where every token from before M54 lives.
 */
const INDEXER_URLS: Record<ProjectChain, string | null> = {
  robinhood_testnet: process.env.INDEXER_URL ?? "http://localhost:42069",
  arbitrum_sepolia: process.env.INDEXER_URL_ARBITRUM_SEPOLIA ?? null,
};

/** Chains whose contracts are deployed and whose indexer is configured, in table order. */
export function indexedChains(): ProjectChain[] {
  return LIVE_LAUNCH_CHAINS.filter((c) => INDEXER_URLS[c] !== null);
}

export interface IndexedToken {
  address: string;
  /** The contract that emitted TokenLaunched: a TokenFactory or the
   *  CurveLauncher. Version numbers are per-factory, so this is the
   *  discriminator (see isCurveLaunch). */
  factory: string;
  creator: string;
  name: string;
  symbol: string;
  totalSupply: string;
  imageURI: string;
  xHandle: string;
  website: string;
  descriptionHash: string;
  journeyHash: string;
  salt: string;
  version: number;
  /** Fee paid at launch (wei). Null for tokens from pre-fee factories (v1/v2). */
  launchFee: string | null;
  /** Treasury at launch time. Null for tokens from pre-fee factories (v1/v2). */
  treasury: string | null;
  blockNumber: string;
  blockTimestamp: string;
  txHash: string;
  /** The chain the token was read from (M54). Set by the readers, not by the indexer. */
  chain?: ProjectChain;
}

const TOKEN_FIELDS =
  "address factory creator name symbol totalSupply imageURI xHandle website " +
  "descriptionHash journeyHash salt version launchFee treasury " +
  "blockNumber blockTimestamp txHash";

/**
 * A read that keeps the three outcomes apart. Most callers only need "did I
 * get something", and `query` collapsing everything to null is fine for them.
 * A page that would otherwise render a 404 needs to know whether the indexer
 * was unreachable or genuinely had no row.
 */
export type IndexerRead<T> =
  | { status: "ok"; value: T }
  | { status: "empty" }
  | { status: "unavailable" };

/** `query` bound to a chain, so a reader's body stays one call. */
const queryOn =
  (chain: ProjectChain) =>
  <T>(gql: string): Promise<T | null> =>
    query<T>(gql, chain);

async function query<T>(gql: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<T | null> {
  const url = INDEXER_URLS[chain];
  if (!url) return null;
  try {
    const res = await fetch(`${url}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

/** Newest-first token list, or null when the indexer is unreachable. */
export async function getTokens(chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<IndexedToken[] | null> {
  const data = await queryOn(chain)<{ tokens: { items: IndexedToken[] } }>(
    `{ tokens(orderBy: "blockNumber", orderDirection: "desc", limit: 100) { items { ${TOKEN_FIELDS} } } }`,
  );
  return data?.tokens.items.map((t) => ({ ...t, chain })) ?? null;
}

/** Newest-first tokens across every indexed chain. Null only when no chain answered. */
export async function getTokensAllChains(): Promise<IndexedToken[] | null> {
  const lists = await Promise.all(indexedChains().map((c) => getTokens(c)));
  if (lists.every((l) => l === null)) return null;
  return lists
    .flatMap((l) => l ?? [])
    .sort((a, b) => Number(b.blockTimestamp) - Number(a.blockTimestamp));
}

export interface CreatorDeployHistory {
  totalCount: number;
  items: Array<Pick<IndexedToken, "address" | "name" | "symbol" | "blockTimestamp">>;
}

/** Every factory launch by a wallet — the verify-don't-ask deploy record. */
export async function getTokensByCreator(creator: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<CreatorDeployHistory | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(creator)) return null;
  const data = await queryOn(chain)<{ tokens: CreatorDeployHistory }>(
    `{ tokens(where: { creator: "${creator.toLowerCase()}" }, orderBy: "blockNumber", orderDirection: "desc", limit: 10) {
      totalCount items { address name symbol blockTimestamp }
    } }`,
  );
  return data?.tokens ?? null;
}

/**
 * Every token a wallet launched, on every indexed chain, each with the chain
 * it is on (M57). The account side of "this wallet's launches are yours".
 */
export async function getCreatorTokens(creator: string): Promise<IndexedToken[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(creator)) return [];
  const lists = await Promise.all(
    indexedChains().map(async (chain) => {
      const data = await queryOn(chain)<{ tokens: { items: IndexedToken[] } }>(
        `{ tokens(where: { creator: "${creator.toLowerCase()}" }, orderBy: "blockNumber", orderDirection: "desc", limit: 100) {
          items { ${TOKEN_FIELDS} }
        } }`,
      );
      return (data?.tokens.items ?? []).map((t) => ({ ...t, chain }));
    }),
  );
  return lists.flat();
}

export type TokenIdentityMatch = Pick<IndexedToken, "address" | "name" | "symbol">;

/**
 * Exact-match lookup of deployed factory tokens by name and/or symbol, for
 * the design-form "not found on Robinhood Chain or CanHav" check. Two aliased
 * filters in one document (no dependency on GraphQL OR support). Null when
 * the indexer is unreachable.
 */
export async function findTokensByNameOrSymbol(
  name: string,
  symbol: string,
  chain: ProjectChain = DEFAULT_PROJECT_CHAIN,
): Promise<{ byName: TokenIdentityMatch[]; bySymbol: TokenIdentityMatch[] } | null> {
  const parts: string[] = [];
  // JSON.stringify produces a GraphQL-safe quoted string literal.
  if (name.trim())
    parts.push(
      `byName: tokens(where: { name: ${JSON.stringify(name.trim())} }, limit: 5) { items { address name symbol } }`,
    );
  if (/^[A-Z0-9]{1,10}$/.test(symbol))
    parts.push(
      `bySymbol: tokens(where: { symbol: ${JSON.stringify(symbol)} }, limit: 5) { items { address name symbol } }`,
    );
  if (parts.length === 0) return { byName: [], bySymbol: [] };
  const data = await queryOn(chain)<{
    byName?: { items: TokenIdentityMatch[] };
    bySymbol?: { items: TokenIdentityMatch[] };
  }>(`{ ${parts.join(" ")} }`);
  if (!data) return null;
  return {
    byName: data.byName?.items ?? [],
    bySymbol: data.bySymbol?.items ?? [],
  };
}

/**
 * Single token by address, keeping "the indexer is down" apart from "there is
 * no such token". A launch that just landed reads as empty for a few seconds
 * while the indexer catches up, which is not the same as a bad address.
 * A malformed address is "empty", never "unavailable".
 */
export async function getTokenRead(address: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<IndexerRead<IndexedToken>> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return { status: "empty" };
  const data = await queryOn(chain)<{ token: IndexedToken | null }>(
    `{ token(address: "${address.toLowerCase()}") { ${TOKEN_FIELDS} } }`,
  );
  if (data === null) return { status: "unavailable" };
  return data.token ? { status: "ok", value: { ...data.token, chain } } : { status: "empty" };
}

/**
 * A token on whichever indexed chain has it (M54), tagged with that chain.
 * Addresses do not repeat across chains in practice, since each chain's
 * factories sit at different addresses. "unavailable" when no chain had it
 * and at least one could not be asked.
 */
export async function findTokenRead(address: string): Promise<IndexerRead<IndexedToken>> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return { status: "empty" };
  const reads = await Promise.all(indexedChains().map((c) => getTokenRead(address, c)));
  const hit = reads.find((r) => r.status === "ok");
  if (hit) return hit;
  return reads.some((r) => r.status === "unavailable") || reads.length === 0
    ? { status: "unavailable" }
    : { status: "empty" };
}

/** `findTokenRead` for callers that only need the token. */
export async function findToken(address: string): Promise<IndexedToken | null> {
  const read = await findTokenRead(address);
  return read.status === "ok" ? read.value : null;
}

/** Single token by address (lowercase hex), or null if unknown/offline. */
export async function getToken(address: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<IndexedToken | null> {
  const read = await getTokenRead(address, chain);
  return read.status === "ok" ? read.value : null;
}

export interface IndexedVesting {
  walletAddress: string;
  tokenAddress: string;
  /** Historical — the wallet's live owner() is the real beneficiary. */
  beneficiary: string;
  amount: string;
  startTimestamp: string;
  durationSeconds: string;
  cliffSeconds: string;
  txHash: string;
}

/** Vesting schedule for a token (from the VestingCreated event), if any. */
export async function getVesting(tokenAddress: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<IndexedVesting | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await queryOn(chain)<{ vestings: { items: IndexedVesting[] } }>(
    `{ vestings(where: { tokenAddress: "${tokenAddress.toLowerCase()}" }, limit: 1) { items {
      walletAddress tokenAddress beneficiary amount startTimestamp durationSeconds cliffSeconds txHash
    } } }`,
  );
  return data?.vestings.items[0] ?? null;
}

export interface IndexedEscrowTranche {
  escrowId: string;
  trancheIndex: string;
  milestoneIndex: number;
  amount: string;
  unlockTime: string;
  claimed: boolean;
  claimedTxHash: string | null;
  claimedAt: string | null;
}

export interface IndexedEscrow {
  escrowId: string;
  tokenAddress: string;
  creator: string;
  journeyHash: string;
  blockTimestamp: string;
  txHash: string;
  tranches: IndexedEscrowTranche[];
}

/** All escrows for a token (oldest first), each with its tranches. */
export async function getEscrows(tokenAddress: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<IndexedEscrow[] | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await queryOn(chain)<{
    escrows: { items: Omit<IndexedEscrow, "tranches">[] };
    escrowTranches: { items: IndexedEscrowTranche[] };
  }>(
    `{
      escrows(where: { tokenAddress: "${tokenAddress.toLowerCase()}" }, orderBy: "escrowId", orderDirection: "asc", limit: 20) { items {
        escrowId tokenAddress creator journeyHash blockTimestamp txHash
      } }
      escrowTranches(orderBy: "trancheIndex", orderDirection: "asc", limit: 100) { items {
        escrowId trancheIndex milestoneIndex amount unlockTime claimed claimedTxHash claimedAt
      } }
    }`,
  );
  if (!data) return null;
  return data.escrows.items.map((e) => ({
    ...e,
    tranches: data.escrowTranches.items.filter((t) => t.escrowId === e.escrowId),
  }));
}

export interface IndexedMilestoneUpdate {
  txHash: string;
  logIndex: number;
  tokenAddress: string;
  author: string;
  milestoneIndex: number;
  updateHash: string;
  blockTimestamp: string;
}

/** On-chain-anchored milestone updates for a token, oldest first. Callers
 *  must filter to author === token.creator before display. */
export async function getMilestoneUpdates(
  tokenAddress: string,
  chain: ProjectChain = DEFAULT_PROJECT_CHAIN,
): Promise<IndexedMilestoneUpdate[] | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await queryOn(chain)<{ milestoneUpdates: { items: IndexedMilestoneUpdate[] } }>(
    `{ milestoneUpdates(where: { tokenAddress: "${tokenAddress.toLowerCase()}" }, orderBy: "blockTimestamp", orderDirection: "asc", limit: 100) { items {
      txHash logIndex tokenAddress author milestoneIndex updateHash blockTimestamp
    } } }`,
  );
  return data?.milestoneUpdates.items ?? null;
}

export interface IndexedTimelockOperation {
  id: string;
  callIndex: string;
  target: string;
  data: string;
  delay: string;
  scheduledAt: string;
  readyAt: string;
  status: string;
  scheduledTxHash: string;
  executedTxHash: string | null;
}

/** Timelock operations, newest first — the governance page's table. */
export async function getTimelockOperations(chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<IndexedTimelockOperation[] | null> {
  const data = await queryOn(chain)<{ timelockOperations: { items: IndexedTimelockOperation[] } }>(
    `{ timelockOperations(orderBy: "scheduledAt", orderDirection: "desc", limit: 50) { items {
      id callIndex target data delay scheduledAt readyAt status scheduledTxHash executedTxHash
    } } }`,
  );
  return data?.timelockOperations.items ?? null;
}

export interface IndexedSaleTranche {
  saleId: string;
  trancheIndex: string;
  milestoneIndex: number;
  bps: number;
  unlockTime: string;
  claimed: boolean;
  claimedAmount: string | null;
  claimedTxHash: string | null;
}

export interface IndexedSale {
  saleId: string;
  tokenAddress: string;
  creator: string;
  journeyHash: string;
  price: string;
  allocation: string;
  sold: string;
  raised: string;
  startTime: string;
  endTime: string;
  perWalletCap: string;
  unsoldReclaimed: boolean;
  blockTimestamp: string;
  txHash: string;
  tranches: IndexedSaleTranche[];
}

const SALE_FIELDS =
  "saleId tokenAddress creator journeyHash price allocation sold raised " +
  "startTime endTime perWalletCap unsoldReclaimed blockTimestamp txHash";

/** All sales for a token (oldest first), each with its proceeds tranches. */
export async function getSales(tokenAddress: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<IndexedSale[] | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await queryOn(chain)<{
    sales: { items: Omit<IndexedSale, "tranches">[] };
    saleTranches: { items: IndexedSaleTranche[] };
  }>(
    `{
      sales(where: { tokenAddress: "${tokenAddress.toLowerCase()}" }, orderBy: "saleId", orderDirection: "asc", limit: 20) { items { ${SALE_FIELDS} } }
      saleTranches(orderBy: "trancheIndex", orderDirection: "asc", limit: 100) { items {
        saleId trancheIndex milestoneIndex bps unlockTime claimed claimedAmount claimedTxHash
      } }
    }`,
  );
  if (!data) return null;
  return data.sales.items.map((s) => ({
    ...s,
    tranches: data.saleTranches.items.filter((t) => t.saleId === s.saleId),
  }));
}

export interface IndexedPurchase {
  buyer: string;
  tokenAmount: string;
  cost: string;
  blockTimestamp: string;
  txHash: string;
}

/** Most recent purchases for a sale. */
export async function getRecentPurchases(
  saleId: string,
  limit = 10,
  chain: ProjectChain = DEFAULT_PROJECT_CHAIN,
): Promise<IndexedPurchase[] | null> {
  if (!/^[0-9]+$/.test(saleId)) return null;
  const data = await queryOn(chain)<{ purchases: { items: IndexedPurchase[] } }>(
    `{ purchases(where: { saleId: "${saleId}" }, orderBy: "blockTimestamp", orderDirection: "desc", limit: ${limit}) { items {
      buyer tokenAmount cost blockTimestamp txHash
    } } }`,
  );
  return data?.purchases.items ?? null;
}

/** Lowercase token addresses that currently have a live sale window. */
export async function getActiveSaleTokens(chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<Set<string> | null> {
  const now = Math.floor(Date.now() / 1000);
  const data = await queryOn(chain)<{
    sales: { items: { tokenAddress: string; startTime: string; endTime: string }[] };
  }>(
    `{ sales(where: { endTime_gt: "${now}" }, limit: 100) { items { tokenAddress startTime endTime } } }`,
  );
  if (!data) return null;
  return new Set(
    data.sales.items
      .filter((s) => Number(s.startTime) <= now)
      .map((s) => s.tokenAddress.toLowerCase()),
  );
}

export interface IndexedPool {
  poolId: string;
  tokenAddress: string;
  creator: string;
  protocolFeeBps: number;
  ethReserve: string;
  tokenReserve: string;
  totalShares: string;
  txHash: string;
}

/** The creator-authored pool for a token, or null. Pools are per
 *  (token, creator); this is the display-layer authorship filter. */
export async function getPool(
  tokenAddress: string,
  creator: string,
  chain: ProjectChain = DEFAULT_PROJECT_CHAIN,
): Promise<IndexedPool | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(creator)) return null;
  const data = await queryOn(chain)<{ pools: { items: IndexedPool[] } }>(
    `{ pools(where: { tokenAddress: "${tokenAddress.toLowerCase()}", creator: "${creator.toLowerCase()}" }, limit: 1) { items {
      poolId tokenAddress creator protocolFeeBps ethReserve tokenReserve totalShares txHash
    } } }`,
  );
  return data?.pools.items[0] ?? null;
}

/**
 * Every creator-authored pool, keyed by lowercase token address. One query for
 * a whole board, where getPool would be one round trip per card. The caller
 * supplies each token's creator so the same authorship filter applies.
 */
export async function getPools(chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<{
  byTokenCreator: Map<string, IndexedPool>;
  byPoolId: Map<string, IndexedPool>;
} | null> {
  const data = await queryOn(chain)<{ pools: { items: IndexedPool[] } }>(
    `{ pools(limit: 100) { items {
      poolId tokenAddress creator protocolFeeBps ethReserve tokenReserve totalShares txHash
    } } }`,
  );
  if (!data) return null;
  const byTokenCreator = new Map<string, IndexedPool>();
  const byPoolId = new Map<string, IndexedPool>();
  for (const pool of data.pools.items) {
    // The creator match happens at the call site, which is the only place
    // that knows who launched the token; a graduated curve's pool is looked
    // up by the id the curve row carries instead.
    byTokenCreator.set(`${pool.tokenAddress.toLowerCase()}:${pool.creator.toLowerCase()}`, pool);
    byPoolId.set(pool.poolId, pool);
  }
  return { byTokenCreator, byPoolId };
}

export interface IndexedSwap {
  trader: string;
  ethToToken: boolean;
  amountIn: string;
  amountOut: string;
  protocolFeePaid: string;
  blockTimestamp: string;
  txHash: string;
}

/** Recent swaps for a pool (newest first) plus simple volume totals. */
export async function getRecentSwaps(
  poolId: string,
  limit = 10,
  chain: ProjectChain = DEFAULT_PROJECT_CHAIN,
): Promise<{ swaps: IndexedSwap[]; count: number; ethVolume: bigint } | null> {
  if (!/^[0-9]+$/.test(poolId)) return null;
  const data = await queryOn(chain)<{ swaps: { items: IndexedSwap[]; totalCount: number } }>(
    `{ swaps(where: { poolId: "${poolId}" }, orderBy: "blockTimestamp", orderDirection: "desc", limit: ${Math.max(100, limit)}) { totalCount items {
      trader ethToToken amountIn amountOut protocolFeePaid blockTimestamp txHash
    } } }`,
  );
  if (!data) return null;
  const all = data.swaps.items;
  const ethVolume = all.reduce(
    (s, x) => s + BigInt(x.ethToToken ? x.amountIn : x.amountOut),
    0n,
  );
  return { swaps: all.slice(0, limit), count: data.swaps.totalCount, ethVolume };
}

/** True when the token was launched through the bonding-curve launcher. */
export function isCurveLaunch(token: Pick<IndexedToken, "factory" | "chain">): boolean {
  return token.factory.toLowerCase() === launchChain(token.chain).curveAddress.toLowerCase();
}

/** A pool by id, whoever created it. Graduated curves seed a pool whose
 *  creator is the launcher, so the creator filter cannot find it. */
export async function getPoolById(poolId: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<IndexedPool | null> {
  if (!/^[0-9]+$/.test(poolId)) return null;
  const data = await queryOn(chain)<{ pool: IndexedPool | null }>(
    `{ pool(poolId: "${poolId}") {
      poolId tokenAddress creator protocolFeeBps ethReserve tokenReserve totalShares txHash
    } }`,
  );
  return data?.pool ?? null;
}

export interface IndexedCurve {
  token: string;
  developer: string;
  supply: string;
  curveSupply: string;
  poolSupply: string;
  virtualEthReserve: string;
  /** Virtual ETH reserve x (real ETH held is x minus virtualEthReserve). */
  ethReserve: string;
  /** Virtual token reserve y. */
  tokenReserve: string;
  raisedWei: string;
  taxPotWei: string;
  thresholdWei: string;
  snipeTaxBps: number;
  /** Unix seconds. The window is timestamp based on this chain. */
  windowEnd: string;
  graduated: boolean;
  poolId: string | null;
  buyCount: number;
  sellCount: number;
  ethVolume: string;
  ethSeeded: string | null;
  tokensSeeded: string | null;
  sharesLocked: string | null;
  graduatedAt: string | null;
  graduationTxHash: string | null;
  blockNumber: string;
  blockTimestamp: string;
  txHash: string;
}

const CURVE_FIELDS =
  "token developer supply curveSupply poolSupply virtualEthReserve ethReserve tokenReserve " +
  "raisedWei taxPotWei thresholdWei snipeTaxBps windowEnd graduated poolId buyCount sellCount " +
  "ethVolume ethSeeded tokensSeeded sharesLocked graduatedAt graduationTxHash " +
  "blockNumber blockTimestamp txHash";

/** The bonding curve behind a token, or null when the token was not launched
 *  through the launcher (or the indexer is unreachable). */
export async function getCurve(tokenAddress: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<IndexedCurve | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await queryOn(chain)<{ curve: IndexedCurve | null }>(
    `{ curve(token: "${tokenAddress.toLowerCase()}") { ${CURVE_FIELDS} } }`,
  );
  return data?.curve ?? null;
}

/** Every curve, keyed by lowercase token address. One query for a board. */
export async function getCurves(chain: ProjectChain = DEFAULT_PROJECT_CHAIN): Promise<Map<string, IndexedCurve> | null> {
  const data = await queryOn(chain)<{ curves: { items: IndexedCurve[] } }>(
    `{ curves(limit: 100) { items { ${CURVE_FIELDS} } } }`,
  );
  if (!data) return null;
  return new Map(data.curves.items.map((c) => [c.token.toLowerCase(), c]));
}

/** Curves across every indexed chain, by token address. Null only when no chain answered. */
export async function getCurvesAllChains(): Promise<Map<string, IndexedCurve> | null> {
  const maps = await Promise.all(indexedChains().map((c) => getCurves(c)));
  if (maps.every((m) => m === null)) return null;
  return new Map(maps.flatMap((m) => (m ? [...m] : [])));
}

export interface IndexedCurveTrade {
  trader: string;
  side: "buy" | "sell";
  ethWei: string;
  taxWei: string;
  tokensWei: string;
  blockTimestamp: string;
  txHash: string;
}

/** Recent trades on a curve (newest first) plus the total count. */
export async function getCurveTrades(
  tokenAddress: string,
  limit = 10,
  chain: ProjectChain = DEFAULT_PROJECT_CHAIN,
): Promise<{ trades: IndexedCurveTrade[]; count: number } | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await queryOn(chain)<{ curveTrades: { items: IndexedCurveTrade[]; totalCount: number } }>(
    `{ curveTrades(where: { token: "${tokenAddress.toLowerCase()}" }, orderBy: "blockTimestamp", orderDirection: "desc", limit: ${limit}) { totalCount items {
      trader side ethWei taxWei tokensWei blockTimestamp txHash
    } } }`,
  );
  if (!data) return null;
  return { trades: data.curveTrades.items, count: data.curveTrades.totalCount };
}

/**
 * The one pool a launch page shows. A graduated curve's pool belongs to the
 * launcher, so it is found by id; otherwise the creator-authored pool. Every
 * surface (token page, board, MCP views and tools) resolves through here.
 */
export async function getLaunchPool(
  token: Pick<IndexedToken, "address" | "creator">,
  curve: IndexedCurve | null,
  chain: ProjectChain = DEFAULT_PROJECT_CHAIN,
): Promise<IndexedPool | null> {
  if (curve?.poolId) return getPoolById(curve.poolId, chain);
  return getPool(token.address, token.creator, chain);
}

/** Graduation progress in whole percent, clamped to 100. */
export function curveProgressPct(c: Pick<IndexedCurve, "raisedWei" | "thresholdWei">): number {
  const threshold = BigInt(c.thresholdWei);
  if (threshold === 0n) return 0;
  const pct = Number((BigInt(c.raisedWei) * 10_000n) / threshold) / 100;
  return Math.min(100, Math.max(0, pct));
}

/** Whether buys still pay the snipe tax at `nowSeconds`. */
export function curveWindowOpen(
  c: Pick<IndexedCurve, "windowEnd" | "graduated">,
  nowSeconds: number,
): boolean {
  return !c.graduated && nowSeconds < Number(c.windowEnd);
}

/** Whole-token supply (assumes 18 decimals) for display. */
export function formatSupply(totalSupply: string): number {
  return Number(BigInt(totalSupply) / 10n ** 18n);
}
