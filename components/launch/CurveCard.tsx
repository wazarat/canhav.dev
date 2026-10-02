import type { ProjectChain } from "@/lib/chains";
import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { formatEther } from "viem";

import { StatusChip } from "@/components/ui/StatusChip";
import {
  launchChain,
  LAUNCH_CURVE,
  LAUNCH_CURVE_SHARE_PCT,
  LAUNCH_CURVE_TAX_PCT,
} from "@/content/launch";
import { formatCount, formatPriceEth } from "@/lib/format";
import { curveWindowOpen, type IndexedCurve, type IndexedCurveTrade } from "@/lib/indexer";

import { CurveProgress, trimEth } from "./CurveProgress";

function fmtTokens(wei: bigint, symbol: string): string {
  return `${formatCount(Number(wei / 10n ** 18n))} ${symbol}`;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * The bonding curve behind a launch: state, price from the virtual reserves,
 * ETH raised against the graduation threshold, the tax pot, recent trades
 * and, after graduation, what was seeded. All numbers from indexed events.
 * `children` is the wallet side (CurveActions) while the curve is live.
 */
export function CurveCard({
  chain,
  curve,
  symbol,
  trades,
  nowSeconds,
  children,
}: {
  /** The chain the token lives on (M54). */
  chain: ProjectChain;
  curve: IndexedCurve;
  symbol: string;
  trades: { trades: IndexedCurveTrade[]; count: number } | null;
  nowSeconds: number;
  children?: ReactNode;
}) {
  const net = launchChain(chain);
  const L = LAUNCH_CURVE.labels;
  const inWindow = curveWindowOpen(curve, nowSeconds);
  const secondsLeft = Math.max(0, Number(curve.windowEnd) - nowSeconds);
  const poolPct = 100 - LAUNCH_CURVE_SHARE_PCT;

  return (
    <div className="card-surface mt-8 rounded-2xl border border-ink-700/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink-50">
          <TrendingUp className="h-4 w-4 text-electric-300" /> {L.title}
        </h2>
        {curve.graduated ? (
          <StatusChip tone="success">{L.graduated}</StatusChip>
        ) : inWindow ? (
          <StatusChip tone="warning">
            {L.window}, {secondsLeft}s left
          </StatusChip>
        ) : (
          <StatusChip tone="info">{L.live}</StatusChip>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
          <p className="text-xs text-ink-500">{L.price}</p>
          <p className="tabular mt-1 text-sm text-ink-100">
            {formatPriceEth(BigInt(curve.ethReserve), BigInt(curve.tokenReserve))} ETH
          </p>
        </div>
        <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
          <p className="text-xs text-ink-500">{L.raised}</p>
          <CurveProgress
            className="mt-2"
            raisedWei={curve.raisedWei}
            thresholdWei={curve.thresholdWei}
            graduated={curve.graduated}
          />
        </div>
        <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
          <p className="text-xs text-ink-500">{L.taxPot}</p>
          <p className="tabular mt-1 text-sm text-ink-100">
            {curve.graduated ? "Seeded into the pool" : `${trimEth(BigInt(curve.taxPotWei))} ETH`}
          </p>
        </div>
      </div>

      <p className="tabular mt-3 text-xs text-ink-400">
        {curve.buyCount + curve.sellCount} {L.trades.toLowerCase()} · {trimEth(BigInt(curve.ethVolume))} ETH
        traded · {formatCount(Number(BigInt(curve.curveSupply) / 10n ** 18n))} {symbol} on the curve
      </p>

      {children}

      {trades && trades.trades.length > 0 ? (
        <>
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">
            Recent trades
          </p>
          <ul className="mt-2 space-y-1">
            {trades.trades.map((t) => {
              const developerBuy =
                t.side === "buy" && t.txHash.toLowerCase() === curve.txHash.toLowerCase();
              return (
                <li key={t.txHash + t.blockTimestamp + t.side} className="flex justify-between gap-3 text-xs">
                  <a
                    href={`${net.explorerUrl}/tx/${t.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-electric-300 hover:text-electric-200"
                  >
                    {shortAddr(t.trader)}
                    {developerBuy ? <span className="ml-1 text-ink-500"> developer</span> : null}
                  </a>
                  <span className="tabular text-right text-ink-300">
                    {t.side === "buy"
                      ? `${trimEth(BigInt(t.ethWei))} ETH → ${fmtTokens(BigInt(t.tokensWei), symbol)}`
                      : `${fmtTokens(BigInt(t.tokensWei), symbol)} → ${trimEth(BigInt(t.ethWei))} ETH`}
                    {BigInt(t.taxWei) > 0n ? (
                      <span className="text-ink-500"> ({trimEth(BigInt(t.taxWei))} ETH tax)</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {curve.graduated ? (
        <p className="mt-4 text-xs text-ink-500">
          Graduated
          {curve.graduatedAt
            ? ` on ${new Date(Number(curve.graduatedAt) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
            : ""}
          . The launcher seeded pool #{curve.poolId} with{" "}
          {curve.ethSeeded ? `${trimEth(BigInt(curve.ethSeeded))} ETH` : "the raised ETH"} and{" "}
          {curve.tokensSeeded ? fmtTokens(BigInt(curve.tokensSeeded), symbol) : "the reserved supply"} and
          keeps the {curve.sharesLocked ? formatEther(BigInt(curve.sharesLocked)) : ""} liquidity
          shares, so that liquidity can never be withdrawn. Trading continues in the pool below.
        </p>
      ) : (
        <p className="mt-4 text-xs text-ink-500">
          Buys in the first {LAUNCH_CURVE.windowSeconds} seconds after launch pay a{" "}
          {LAUNCH_CURVE_TAX_PCT}% snipe tax that the launcher holds for graduation. Sells are never
          taxed. At {LAUNCH_CURVE.thresholdEth} ETH raised the launcher seeds a LaunchAMM pool with
          the raised ETH, the tax and the reserved {poolPct}% of the supply, and keeps the shares
          forever, so that liquidity can never be withdrawn.
        </p>
      )}
    </div>
  );
}
