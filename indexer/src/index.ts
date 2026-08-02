import { ponder } from "ponder:registry";
import { implementation, token, vesting } from "ponder:schema";

ponder.on("TokenFactory:TokenLaunched", async ({ event, context }) => {
  await context.db.insert(token).values({
    address: event.args.token,
    factory: event.log.address,
    creator: event.args.creator,
    name: event.args.name,
    symbol: event.args.symbol,
    totalSupply: event.args.totalSupply,
    imageURI: event.args.imageURI,
    xHandle: event.args.xHandle,
    website: event.args.website,
    descriptionHash: event.args.descriptionHash,
    journeyHash: event.args.journeyHash,
    salt: event.args.salt,
    version: Number(event.args.version),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("TokenFactory:ImplementationSet", async ({ event, context }) => {
  await context.db.insert(implementation).values({
    factory: event.log.address,
    version: Number(event.args.version),
    address: event.args.implementation,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("TokenFactory:VestingCreated", async ({ event, context }) => {
  await context.db.insert(vesting).values({
    walletAddress: event.args.vestingWallet,
    tokenAddress: event.args.token,
    factory: event.log.address,
    beneficiary: event.args.beneficiary,
    amount: event.args.amount,
    startTimestamp: BigInt(event.args.startTimestamp),
    durationSeconds: BigInt(event.args.durationSeconds),
    cliffSeconds: BigInt(event.args.cliffSeconds),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

// v3 factory: separate contract entry (TokenLaunched gained launchFee/treasury,
// changing the event signature). Rows land in the same tables.

ponder.on("TokenFactoryV3:TokenLaunched", async ({ event, context }) => {
  await context.db.insert(token).values({
    address: event.args.token,
    factory: event.log.address,
    creator: event.args.creator,
    name: event.args.name,
    symbol: event.args.symbol,
    totalSupply: event.args.totalSupply,
    imageURI: event.args.imageURI,
    xHandle: event.args.xHandle,
    website: event.args.website,
    descriptionHash: event.args.descriptionHash,
    journeyHash: event.args.journeyHash,
    salt: event.args.salt,
    version: Number(event.args.version),
    launchFee: event.args.launchFee,
    treasury: event.args.treasury,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("TokenFactoryV3:ImplementationSet", async ({ event, context }) => {
  await context.db.insert(implementation).values({
    factory: event.log.address,
    version: Number(event.args.version),
    address: event.args.implementation,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("TokenFactoryV3:VestingCreated", async ({ event, context }) => {
  await context.db.insert(vesting).values({
    walletAddress: event.args.vestingWallet,
    tokenAddress: event.args.token,
    factory: event.log.address,
    beneficiary: event.args.beneficiary,
    amount: event.args.amount,
    startTimestamp: BigInt(event.args.startTimestamp),
    durationSeconds: BigInt(event.args.durationSeconds),
    cliffSeconds: BigInt(event.args.cliffSeconds),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});
