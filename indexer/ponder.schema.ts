import { onchainTable, primaryKey } from "ponder";

/** One row per TokenLaunched event — the indexer's source of truth is the log.
 *  `factory` records which factory deployment emitted the launch (version
 *  numbers are per-factory registries, so factory+version disambiguates the
 *  template). */
export const token = onchainTable("token", (t) => ({
  address: t.hex().primaryKey(),
  factory: t.hex().notNull(),
  creator: t.hex().notNull(),
  name: t.text().notNull(),
  symbol: t.text().notNull(),
  totalSupply: t.bigint().notNull(),
  imageURI: t.text().notNull(),
  xHandle: t.text().notNull(),
  website: t.text().notNull(),
  descriptionHash: t.hex().notNull(),
  journeyHash: t.hex().notNull(),
  salt: t.hex().notNull(),
  version: t.integer().notNull(),
  // v3+ factories emit the fee paid and the treasury at launch time; tokens
  // from earlier factories predate the fields and stay null.
  launchFee: t.bigint(),
  treasury: t.hex(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
}));

/** One row per ImplementationSet event — the on-chain version registry mirror.
 *  Composite PK: every factory deployment starts its own registry at version 1,
 *  so version alone is not unique across factories. */
export const implementation = onchainTable(
  "implementation",
  (t) => ({
    factory: t.hex().notNull(),
    version: t.integer().notNull(),
    address: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.factory, table.version] }),
  }),
);

/** One row per EscrowCreated event — a creator locking supply against their
 *  journey's milestones (admin-less MilestoneEscrow singleton). */
export const escrow = onchainTable("escrow", (t) => ({
  escrowId: t.bigint().primaryKey(),
  tokenAddress: t.hex().notNull(),
  creator: t.hex().notNull(),
  journeyHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
}));

/** One row per TrancheAdded event; `claimed` flips on TrancheClaimed.
 *  `milestoneIndex` is the array index into the journey doc's milestones
 *  (order is hash-committed via journeyHash). */
export const escrowTranche = onchainTable(
  "escrow_tranche",
  (t) => ({
    escrowId: t.bigint().notNull(),
    trancheIndex: t.bigint().notNull(),
    milestoneIndex: t.integer().notNull(),
    amount: t.bigint().notNull(),
    unlockTime: t.bigint().notNull(),
    claimed: t.boolean().notNull(),
    claimedTxHash: t.hex(),
    claimedAt: t.bigint(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.escrowId, table.trancheIndex] }),
  }),
);

/** One row per MilestoneUpdate event (JourneyUpdates singleton). The update
 *  body is stored off-chain content-addressed by `updateHash`; authorship is
 *  a DISPLAY-layer rule — only show rows whose author equals the token's
 *  creator. */
export const milestoneUpdate = onchainTable(
  "milestone_update",
  (t) => ({
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    tokenAddress: t.hex().notNull(),
    author: t.hex().notNull(),
    milestoneIndex: t.integer().notNull(),
    updateHash: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.txHash, table.logIndex] }),
  }),
);

/** One row per TimelockController call: CallScheduled inserts as "pending",
 *  CallExecuted / Cancelled flip the status. Composite PK because a batch
 *  operation shares one id across call indexes. */
export const timelockOperation = onchainTable(
  "timelock_operation",
  (t) => ({
    id: t.hex().notNull(),
    callIndex: t.bigint().notNull(),
    target: t.hex().notNull(),
    value: t.bigint().notNull(),
    data: t.hex().notNull(),
    predecessor: t.hex().notNull(),
    delay: t.bigint().notNull(),
    scheduledAt: t.bigint().notNull(),
    readyAt: t.bigint().notNull(),
    status: t.text().notNull(), // "pending" | "executed" | "cancelled"
    scheduledTxHash: t.hex().notNull(),
    executedTxHash: t.hex(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.callIndex] }),
  }),
);

/** One row per VestingCreated event. `startTimestamp` is the RESOLVED start
 *  (the contract replaces the 0 sentinel with block.timestamp before
 *  emitting). NOTE: `beneficiary` is historical — the vesting wallet's
 *  Ownable owner is transferable, so live consumers read owner() on-chain. */
export const vesting = onchainTable("vesting", (t) => ({
  walletAddress: t.hex().primaryKey(),
  tokenAddress: t.hex().notNull(),
  factory: t.hex().notNull(),
  beneficiary: t.hex().notNull(),
  amount: t.bigint().notNull(),
  startTimestamp: t.bigint().notNull(),
  durationSeconds: t.bigint().notNull(),
  cliffSeconds: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
}));
