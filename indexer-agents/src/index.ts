import { ponder } from "ponder:registry";
import { zeroAddress } from "viem";
import { agent, agentMetadata, agentTransfer, uriUpdate } from "ponder:schema";

ponder.on("IdentityRegistry:Registered", async ({ event, context }) => {
  await context.db.insert(agent).values({
    agentId: event.args.agentId,
    owner: event.args.owner,
    // The bare register() overload emits an empty URI — store null so the
    // directory can distinguish "never declared" from a real (possibly bad) URI.
    agentURI: event.args.agentURI || null,
    registeredBlock: event.block.number,
    registeredAt: event.block.timestamp,
    registeredTxHash: event.transaction.hash,
    updatedAt: event.block.timestamp,
  });
});

ponder.on("IdentityRegistry:URIUpdated", async ({ event, context }) => {
  await context.db.update(agent, { agentId: event.args.agentId }).set({
    agentURI: event.args.newURI || null,
    updatedAt: event.block.timestamp,
  });
  await context.db.insert(uriUpdate).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    agentId: event.args.agentId,
    newURI: event.args.newURI,
    updatedBy: event.args.updatedBy,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("IdentityRegistry:Transfer", async ({ event, context }) => {
  // Mint guard: the ERC-721 mint Transfer(0x0 → owner) lands in the same tx
  // BEFORE Registered, so the agent row doesn't exist yet — the Registered
  // handler records the initial owner. Burns just leave owner = 0x0.
  if (event.args.from === zeroAddress) return;
  await context.db.update(agent, { agentId: event.args.tokenId }).set({
    owner: event.args.to,
    updatedAt: event.block.timestamp,
  });
  await context.db.insert(agentTransfer).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    agentId: event.args.tokenId,
    from: event.args.from,
    to: event.args.to,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

ponder.on("IdentityRegistry:MetadataSet", async ({ event, context }) => {
  // The first MetadataSet arg is `string indexed` — its topic decodes as a
  // keccak hash, not the string. The plain key is the NON-indexed metadataKey.
  await context.db
    .insert(agentMetadata)
    .values({
      agentId: event.args.agentId,
      key: event.args.metadataKey,
      value: event.args.metadataValue,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      value: event.args.metadataValue,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    });
});
