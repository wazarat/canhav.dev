import { onchainTable, primaryKey } from "ponder";

/**
 * ERC-8004 agent directory, Base Sepolia only. Deliberately a SEPARATE Ponder
 * app from indexer/ (Robinhood Chain launchpad) — one app = one schema, and
 * agent rows must never share tables with launchpad data.
 *
 * Verification statuses (phase 1's MCP introspection results) do NOT belong
 * here: indexer schemas are wiped and replayed per deploy. They will live in
 * Neon keyed by (chainId, agentId); this schema's only forward obligation is
 * stable agentId keys.
 */

/** One row per registered agent (ERC-721 token on the Identity Registry).
 *  `owner` and `agentURI` are kept current by Transfer/URIUpdated handlers. */
export const agent = onchainTable("agent", (t) => ({
  agentId: t.bigint().primaryKey(),
  owner: t.hex().notNull(),
  // null when registered via the bare register() overload and no URI set yet.
  agentURI: t.text(),
  registeredBlock: t.bigint().notNull(),
  registeredAt: t.bigint().notNull(),
  registeredTxHash: t.hex().notNull(),
  // Block timestamp of the last mutation of any kind (registration included).
  updatedAt: t.bigint().notNull(),
}));

/** History: one row per URIUpdated event. */
export const uriUpdate = onchainTable(
  "uri_update",
  (t) => ({
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    agentId: t.bigint().notNull(),
    newURI: t.text().notNull(),
    updatedBy: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
  }),
);

/** History: one row per post-mint ownership transfer (mints are recorded on
 *  the agent row itself; burns leave owner = 0x0). */
export const agentTransfer = onchainTable(
  "agent_transfer",
  (t) => ({
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    agentId: t.bigint().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
  }),
);

/** Current on-chain metadata per (agent, key) — upserted on MetadataSet. */
export const agentMetadata = onchainTable(
  "agent_metadata",
  (t) => ({
    agentId: t.bigint().notNull(),
    key: t.text().notNull(),
    value: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.agentId, table.key] }),
  }),
);
