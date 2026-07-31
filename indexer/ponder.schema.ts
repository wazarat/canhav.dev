import { onchainTable } from "ponder";

/** One row per TokenLaunched event — the indexer's source of truth is the log. */
export const token = onchainTable("token", (t) => ({
  address: t.hex().primaryKey(),
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
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
}));

/** One row per ImplementationSet event — the on-chain version registry mirror. */
export const implementation = onchainTable("implementation", (t) => ({
  version: t.integer().primaryKey(),
  address: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  blockTimestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
}));
