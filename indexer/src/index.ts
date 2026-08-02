import { ponder } from "ponder:registry";
import {
  escrow,
  escrowTranche,
  feeDistribution,
  implementation,
  liquidityEvent,
  milestoneUpdate,
  pool,
  purchase,
  sale,
  saleTranche,
  swap,
  timelockOperation,
  token,
  vesting,
} from "ponder:schema";

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

// Admin-less singletons: milestone escrow + progress updates.

ponder.on("MilestoneEscrow:EscrowCreated", async ({ event, context }) => {
  await context.db.insert(escrow).values({
    escrowId: event.args.escrowId,
    tokenAddress: event.args.token,
    creator: event.args.creator,
    journeyHash: event.args.journeyHash,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("MilestoneEscrow:TrancheAdded", async ({ event, context }) => {
  await context.db.insert(escrowTranche).values({
    escrowId: event.args.escrowId,
    trancheIndex: event.args.trancheIndex,
    milestoneIndex: Number(event.args.milestoneIndex),
    amount: event.args.amount,
    unlockTime: BigInt(event.args.unlockTime),
    claimed: false,
  });
});

ponder.on("MilestoneEscrow:TrancheClaimed", async ({ event, context }) => {
  await context.db
    .update(escrowTranche, {
      escrowId: event.args.escrowId,
      trancheIndex: event.args.trancheIndex,
    })
    .set({
      claimed: true,
      claimedTxHash: event.transaction.hash,
      claimedAt: event.block.timestamp,
    });
});

ponder.on("JourneyUpdates:MilestoneUpdate", async ({ event, context }) => {
  await context.db.insert(milestoneUpdate).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    tokenAddress: event.args.token,
    author: event.args.author,
    milestoneIndex: Number(event.args.milestoneIndex),
    updateHash: event.args.updateHash,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});

// TimelockController operations for the governance page.

ponder.on("Timelock:CallScheduled", async ({ event, context }) => {
  await context.db.insert(timelockOperation).values({
    id: event.args.id,
    callIndex: event.args.index,
    target: event.args.target,
    value: event.args.value,
    data: event.args.data,
    predecessor: event.args.predecessor,
    delay: event.args.delay,
    scheduledAt: event.block.timestamp,
    readyAt: event.block.timestamp + event.args.delay,
    status: "pending",
    scheduledTxHash: event.transaction.hash,
  });
});

ponder.on("Timelock:CallExecuted", async ({ event, context }) => {
  await context.db
    .update(timelockOperation, { id: event.args.id, callIndex: event.args.index })
    .set({ status: "executed", executedTxHash: event.transaction.hash });
});

ponder.on("Timelock:Cancelled", async ({ event, context }) => {
  // Cancellation carries only the operation id; ops scheduled via schedule()
  // (not scheduleBatch) always live at callIndex 0.
  const row = await context.db.find(timelockOperation, {
    id: event.args.id,
    callIndex: 0n,
  });
  if (row) {
    await context.db
      .update(timelockOperation, { id: event.args.id, callIndex: 0n })
      .set({ status: "cancelled" });
  }
});

// AllocationSale: fixed-price fee-free sales with milestone-dated proceeds.

ponder.on("AllocationSale:SaleCreated", async ({ event, context }) => {
  await context.db.insert(sale).values({
    saleId: event.args.saleId,
    tokenAddress: event.args.token,
    creator: event.args.creator,
    journeyHash: event.args.journeyHash,
    price: event.args.price,
    allocation: event.args.allocation,
    sold: 0n,
    raised: 0n,
    startTime: BigInt(event.args.startTime),
    endTime: BigInt(event.args.endTime),
    perWalletCap: event.args.perWalletCap,
    unsoldReclaimed: false,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("AllocationSale:ProceedsTranchePlanned", async ({ event, context }) => {
  await context.db.insert(saleTranche).values({
    saleId: event.args.saleId,
    trancheIndex: event.args.trancheIndex,
    milestoneIndex: Number(event.args.milestoneIndex),
    bps: Number(event.args.bps),
    unlockTime: BigInt(event.args.unlockTime),
    claimed: false,
  });
});

ponder.on("AllocationSale:TokensPurchased", async ({ event, context }) => {
  await context.db.insert(purchase).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    saleId: event.args.saleId,
    buyer: event.args.buyer,
    tokenAmount: event.args.tokenAmount,
    cost: event.args.cost,
    blockTimestamp: event.block.timestamp,
  });
  await context.db
    .update(sale, { saleId: event.args.saleId })
    .set((row) => ({
      sold: row.sold + event.args.tokenAmount,
      raised: row.raised + event.args.cost,
    }));
});

ponder.on("AllocationSale:ProceedsClaimed", async ({ event, context }) => {
  await context.db
    .update(saleTranche, {
      saleId: event.args.saleId,
      trancheIndex: event.args.trancheIndex,
    })
    .set({
      claimed: true,
      claimedAmount: event.args.amount,
      claimedTxHash: event.transaction.hash,
    });
});

ponder.on("AllocationSale:UnsoldReclaimed", async ({ event, context }) => {
  await context.db
    .update(sale, { saleId: event.args.saleId })
    .set({ unsoldReclaimed: true });
});

// LaunchAMM pools, liquidity, swaps + FeeSplitter distributions.

ponder.on("LaunchAMM:PoolCreated", async ({ event, context }) => {
  await context.db.insert(pool).values({
    poolId: event.args.poolId,
    tokenAddress: event.args.token,
    creator: event.args.creator,
    protocolFeeBps: Number(event.args.protocolFeeBps),
    ethReserve: 0n,
    tokenReserve: 0n,
    totalShares: 0n,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });
});

ponder.on("LaunchAMM:LiquidityAdded", async ({ event, context }) => {
  await context.db.insert(liquidityEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    poolId: event.args.poolId,
    provider: event.args.provider,
    kind: "add",
    ethAmount: event.args.ethIn,
    tokenAmount: event.args.tokensIn,
    shares: event.args.sharesMinted,
    blockTimestamp: event.block.timestamp,
  });
  await context.db.update(pool, { poolId: event.args.poolId }).set((row) => ({
    ethReserve: row.ethReserve + event.args.ethIn,
    tokenReserve: row.tokenReserve + event.args.tokensIn,
    // The first add locks MINIMUM_LIQUIDITY (1000) shares in the contract's
    // totalShares beyond the minted amount the event carries.
    totalShares:
      row.totalShares + event.args.sharesMinted + (row.totalShares === 0n ? 1000n : 0n),
  }));
});

ponder.on("LaunchAMM:LiquidityRemoved", async ({ event, context }) => {
  await context.db.insert(liquidityEvent).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    poolId: event.args.poolId,
    provider: event.args.provider,
    kind: "remove",
    ethAmount: event.args.ethOut,
    tokenAmount: event.args.tokensOut,
    shares: event.args.sharesBurned,
    blockTimestamp: event.block.timestamp,
  });
  await context.db.update(pool, { poolId: event.args.poolId }).set((row) => ({
    ethReserve: row.ethReserve - event.args.ethOut,
    tokenReserve: row.tokenReserve - event.args.tokensOut,
    totalShares: row.totalShares - event.args.sharesBurned,
  }));
});

ponder.on("LaunchAMM:Swapped", async ({ event, context }) => {
  await context.db.insert(swap).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    poolId: event.args.poolId,
    trader: event.args.trader,
    ethToToken: event.args.ethToToken,
    amountIn: event.args.amountIn,
    amountOut: event.args.amountOut,
    protocolFeePaid: event.args.protocolFeePaid,
    blockTimestamp: event.block.timestamp,
  });
  // Mirror the contract's reserve math: net input (minus protocol fee) enters
  // the curve, output leaves it.
  await context.db.update(pool, { poolId: event.args.poolId }).set((row) => {
    const inNet = event.args.amountIn - event.args.protocolFeePaid;
    return event.args.ethToToken
      ? {
          ethReserve: row.ethReserve + inNet,
          tokenReserve: row.tokenReserve - event.args.amountOut,
        }
      : {
          tokenReserve: row.tokenReserve + inNet,
          ethReserve: row.ethReserve - event.args.amountOut,
        };
  });
});

ponder.on("FeeSplitter:Distributed", async ({ event, context }) => {
  await context.db.insert(feeDistribution).values({
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    asset: event.args.asset,
    payee: event.args.payee,
    amount: event.args.amount,
    blockTimestamp: event.block.timestamp,
  });
});
