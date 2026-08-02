import { Waves } from "lucide-react";
import { formatEther } from "viem";

import { LAUNCH_CHAIN } from "@/content/launch";
import { formatCount } from "@/lib/format";
import type { IndexedPool, IndexedSwap } from "@/lib/indexer";

function fmtTokens(wei: bigint, symbol: string): string {
  return `${formatCount(Number(wei / 10n ** 18n))} ${symbol}`;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * The creator-authored AMM pool for a token: price from reserves, volume from
 * indexed swaps, and the fee structure spelled out (LP fee + the enforced
 * 70/30 protocol split when opted in). All numbers from on-chain events.
 */
export function PoolCard({
  pool,
  symbol,
  swapData,
}: {
  pool: IndexedPool;
  symbol: string;
  swapData: { swaps: IndexedSwap[]; count: number; ethVolume: bigint } | null;
}) {
  const ethReserve = BigInt(pool.ethReserve);
  const tokenReserve = BigInt(pool.tokenReserve);
  // Price in ETH per whole token, shown with enough precision for small pools.
  const priceWei = tokenReserve === 0n ? 0n : (ethReserve * 10n ** 18n) / tokenReserve;

  return (
    <div className="card-surface mt-8 rounded-2xl border border-ink-700/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink-50">
          <Waves className="h-4 w-4 text-electric-300" /> Trading pool
        </h2>
        <span className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1 text-xs text-ink-300">
          {pool.protocolFeeBps > 0
            ? `${(pool.protocolFeeBps / 100).toFixed(2)}% protocol fee — 70% to the creator`
            : "No protocol fee"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
          <p className="text-xs text-ink-500">Price</p>
          <p className="tabular mt-1 text-sm text-ink-100">
            {tokenReserve === 0n ? "—" : `${formatEther(priceWei)} ETH`}
          </p>
        </div>
        <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
          <p className="text-xs text-ink-500">Reserves</p>
          <p className="tabular mt-1 text-sm text-ink-100">
            {formatEther(ethReserve)} ETH · {fmtTokens(tokenReserve, symbol)}
          </p>
        </div>
        <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
          <p className="text-xs text-ink-500">Volume (ETH side)</p>
          <p className="tabular mt-1 text-sm text-ink-100">
            {swapData ? `${formatEther(swapData.ethVolume)} ETH · ${swapData.count} swaps` : "—"}
          </p>
        </div>
      </div>

      {swapData && swapData.swaps.length > 0 ? (
        <>
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">
            Recent swaps
          </p>
          <ul className="mt-2 space-y-1">
            {swapData.swaps.map((s) => (
              <li key={s.txHash + s.blockTimestamp} className="flex justify-between text-xs">
                <a
                  href={`${LAUNCH_CHAIN.explorerUrl}/tx/${s.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-electric-300 hover:text-electric-200"
                >
                  {shortAddr(s.trader)}
                </a>
                <span className="tabular text-ink-300">
                  {s.ethToToken
                    ? `${formatEther(BigInt(s.amountIn))} ETH → ${fmtTokens(BigInt(s.amountOut), symbol)}`
                    : `${fmtTokens(BigInt(s.amountIn), symbol)} → ${formatEther(BigInt(s.amountOut))} ETH`}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-4 text-xs text-ink-500">
        0.30% of every swap stays in the pool for liquidity providers.
        {pool.protocolFeeBps > 0
          ? ` The ${(pool.protocolFeeBps / 100).toFixed(2)}% protocol fee is split 70/30 between the creator and the platform's auditable FeeSplitter — a split fixed in the contract's bytecode.`
          : " This pool opted out of the protocol fee."}
      </p>
    </div>
  );
}
