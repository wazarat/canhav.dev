import "server-only";

/**
 * Data layer for the launchpad indexer (Ponder GraphQL API). Local-first: the
 * indexer runs in indexer/ (`npm run dev`, port 42069). Every fetch degrades
 * gracefully to null so the hidden pages render an "indexer offline" state
 * instead of crashing.
 */

const INDEXER_URL = process.env.INDEXER_URL ?? "http://localhost:42069";

export interface IndexedToken {
  address: string;
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
}

const TOKEN_FIELDS =
  "address creator name symbol totalSupply imageURI xHandle website " +
  "descriptionHash journeyHash salt version launchFee treasury " +
  "blockNumber blockTimestamp txHash";

async function query<T>(gql: string): Promise<T | null> {
  try {
    const res = await fetch(`${INDEXER_URL}/graphql`, {
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
export async function getTokens(): Promise<IndexedToken[] | null> {
  const data = await query<{ tokens: { items: IndexedToken[] } }>(
    `{ tokens(orderBy: "blockNumber", orderDirection: "desc", limit: 100) { items { ${TOKEN_FIELDS} } } }`,
  );
  return data?.tokens.items ?? null;
}

export interface CreatorDeployHistory {
  totalCount: number;
  items: Array<Pick<IndexedToken, "address" | "name" | "symbol" | "blockTimestamp">>;
}

/** Every factory launch by a wallet — the verify-don't-ask deploy record. */
export async function getTokensByCreator(creator: string): Promise<CreatorDeployHistory | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(creator)) return null;
  const data = await query<{ tokens: CreatorDeployHistory }>(
    `{ tokens(where: { creator: "${creator.toLowerCase()}" }, orderBy: "blockNumber", orderDirection: "desc", limit: 10) {
      totalCount items { address name symbol blockTimestamp }
    } }`,
  );
  return data?.tokens ?? null;
}

/** Single token by address (lowercase hex), or null if unknown/offline. */
export async function getToken(address: string): Promise<IndexedToken | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  const data = await query<{ token: IndexedToken | null }>(
    `{ token(address: "${address.toLowerCase()}") { ${TOKEN_FIELDS} } }`,
  );
  return data?.token ?? null;
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
export async function getVesting(tokenAddress: string): Promise<IndexedVesting | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await query<{ vestings: { items: IndexedVesting[] } }>(
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
export async function getEscrows(tokenAddress: string): Promise<IndexedEscrow[] | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await query<{
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
): Promise<IndexedMilestoneUpdate[] | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await query<{ milestoneUpdates: { items: IndexedMilestoneUpdate[] } }>(
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
export async function getTimelockOperations(): Promise<IndexedTimelockOperation[] | null> {
  const data = await query<{ timelockOperations: { items: IndexedTimelockOperation[] } }>(
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
export async function getSales(tokenAddress: string): Promise<IndexedSale[] | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  const data = await query<{
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
): Promise<IndexedPurchase[] | null> {
  if (!/^[0-9]+$/.test(saleId)) return null;
  const data = await query<{ purchases: { items: IndexedPurchase[] } }>(
    `{ purchases(where: { saleId: "${saleId}" }, orderBy: "blockTimestamp", orderDirection: "desc", limit: ${limit}) { items {
      buyer tokenAmount cost blockTimestamp txHash
    } } }`,
  );
  return data?.purchases.items ?? null;
}

/** Lowercase token addresses that currently have a live sale window. */
export async function getActiveSaleTokens(): Promise<Set<string> | null> {
  const now = Math.floor(Date.now() / 1000);
  const data = await query<{
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
): Promise<IndexedPool | null> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(creator)) return null;
  const data = await query<{ pools: { items: IndexedPool[] } }>(
    `{ pools(where: { tokenAddress: "${tokenAddress.toLowerCase()}", creator: "${creator.toLowerCase()}" }, limit: 1) { items {
      poolId tokenAddress creator protocolFeeBps ethReserve tokenReserve totalShares txHash
    } } }`,
  );
  return data?.pools.items[0] ?? null;
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
): Promise<{ swaps: IndexedSwap[]; count: number; ethVolume: bigint } | null> {
  if (!/^[0-9]+$/.test(poolId)) return null;
  const data = await query<{ swaps: { items: IndexedSwap[]; totalCount: number } }>(
    `{ swaps(where: { poolId: "${poolId}" }, orderBy: "blockTimestamp", orderDirection: "desc", limit: 100) { totalCount items {
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

/** Whole-token supply (assumes 18 decimals) for display. */
export function formatSupply(totalSupply: string): number {
  return Number(BigInt(totalSupply) / 10n ** 18n);
}
