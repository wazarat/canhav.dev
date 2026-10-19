import { ponder } from "ponder:registry";
import { balance, pool, tokenDay, tokenStat, traderFirstSeen } from "ponder:schema";

/**
 * Token analytics (M122). Every launched token is a factory child of the
 * launchers, so its ERC-20 Transfer events reach the two LaunchToken
 * entries; balances and the holder count follow. Trades on the curve and
 * in the pools bump the token's day row through bumpTokenDay, which the
 * existing handlers call.
 */
const ZERO = "0x0000000000000000000000000000000000000000";

export function unixDay(timestamp: bigint): number {
  return Number(timestamp / 86_400n);
}

type Ctx = Parameters<Parameters<typeof ponder.on>[1]>[0]["context"];

async function ensureStat(context: Ctx, token: `0x${string}`) {
  const row = await context.db.find(tokenStat, { token });
  if (!row) await context.db.insert(tokenStat).values({ token, holders: 0, traders: 0 }).onConflictDoNothing();
}

async function ensureDay(context: Ctx, token: `0x${string}`, day: number, holders: number) {
  await context.db.insert(tokenDay).values({ token, day, volumeWei: 0n, trades: 0, newTraders: 0, holders }).onConflictDoNothing();
}

/** Apply one side of a transfer to a holder's balance; returns the change in holder count (-1, 0 or 1). */
async function move(context: Ctx, token: `0x${string}`, holder: `0x${string}`, delta: bigint): Promise<number> {
  if (holder.toLowerCase() === ZERO) return 0;
  const existing = await context.db.find(balance, { token, holder });
  const before = existing?.amount ?? 0n;
  const after = before + delta;
  if (existing) await context.db.update(balance, { token, holder }).set({ amount: after < 0n ? 0n : after });
  else await context.db.insert(balance).values({ token, holder, amount: after < 0n ? 0n : after });
  if (before <= 0n && after > 0n) return 1;
  if (before > 0n && after <= 0n) return -1;
  return 0;
}

async function onTransfer({ event, context }: { event: { args: { from: `0x${string}`; to: `0x${string}`; value: bigint }; log: { address: `0x${string}` }; block: { timestamp: bigint } }; context: Ctx }) {
  const token = event.log.address;
  await ensureStat(context, token);
  const change = (await move(context, token, event.args.from, -event.args.value)) + (await move(context, token, event.args.to, event.args.value));
  const stat = await context.db.update(tokenStat, { token }).set((row) => ({ holders: Math.max(0, row.holders + change) }));
  const day = unixDay(event.block.timestamp);
  await ensureDay(context, token, day, stat.holders);
  await context.db.update(tokenDay, { token, day }).set({ holders: stat.holders });
}

ponder.on("LaunchTokenV3:Transfer", onTransfer);
ponder.on("LaunchTokenV2:Transfer", onTransfer);

/** One trade on the curve or in a pool: volume, the trade count and the first appearance of the wallet. */
export async function bumpTokenDay(context: Ctx, token: `0x${string}`, trader: `0x${string}`, ethWei: bigint, timestamp: bigint) {
  await ensureStat(context, token);
  const day = unixDay(timestamp);
  const seen = await context.db.find(traderFirstSeen, { token, trader });
  let fresh = 0;
  if (!seen) {
    await context.db.insert(traderFirstSeen).values({ token, trader, day });
    fresh = 1;
  }
  const stat = await context.db.update(tokenStat, { token }).set((row) => ({ traders: row.traders + fresh }));
  await ensureDay(context, token, day, stat.holders);
  await context.db.update(tokenDay, { token, day }).set((row) => ({ volumeWei: row.volumeWei + ethWei, trades: row.trades + 1, newTraders: row.newTraders + fresh }));
}

/** The token behind a pool swap, for the day row. */
export async function poolToken(context: Ctx, poolId: bigint): Promise<`0x${string}` | null> {
  const row = await context.db.find(pool, { poolId });
  return row?.tokenAddress ?? null;
}
