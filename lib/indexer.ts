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

/** Whole-token supply (assumes 18 decimals) for display. */
export function formatSupply(totalSupply: string): number {
  return Number(BigInt(totalSupply) / 10n ** 18n);
}
