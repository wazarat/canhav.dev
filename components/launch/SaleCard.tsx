import { Coins } from "lucide-react";
import { formatEther } from "viem";

import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { LAUNCH_CHAIN } from "@/content/launch";
import { formatCount } from "@/lib/format";
import type { IndexedPurchase, IndexedSale } from "@/lib/indexer";
import type { JourneyMilestone } from "@/lib/journey";

function fmtDate(unixSeconds: bigint): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtTokens(wei: bigint, symbol: string): string {
  return `${formatCount(Number(wei / 10n ** 18n))} ${symbol}`;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * Allocation sales for a token. Fixed price, hard window, zero platform cut —
 * 100% of proceeds sit in the sale contract until their milestone-dated
 * tranches unlock (and the sale has ended). All data from on-chain events.
 */
export function SaleCard({
  sales,
  purchases,
  symbol,
  milestones,
  nowSeconds,
}: {
  sales: IndexedSale[];
  purchases: Record<string, IndexedPurchase[]>;
  symbol: string;
  milestones: JourneyMilestone[] | null;
  nowSeconds: number;
}) {
  const now = BigInt(nowSeconds);

  return (
    <div className="card-surface mt-8 rounded-2xl border border-ink-700/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink-50">
          <Coins className="h-4 w-4 text-electric-300" /> Allocation sale
        </h2>
        <span className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1 text-xs text-ink-300">
          Zero platform cut
        </span>
      </div>

      {sales.map((s) => {
        const allocation = BigInt(s.allocation);
        const sold = BigInt(s.sold);
        const raised = BigInt(s.raised);
        const start = BigInt(s.startTime);
        const end = BigInt(s.endTime);
        const cap = BigInt(s.perWalletCap);
        const pct = allocation === 0n ? 0 : Number((sold * 10_000n) / allocation) / 100;
        const phase: { label: string; tone: StatusTone } =
          now < start
            ? { label: `Starts ${fmtDate(start)}`, tone: "neutral" }
            : now < end
              ? { label: "Live", tone: "success" }
              : { label: "Ended", tone: "neutral" };
        const recent = purchases[s.saleId] ?? [];

        return (
          <div key={s.saleId} className="mt-5 border-t border-ink-800/70 pt-4 first:mt-4 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-100">
                <span className="tabular font-medium">{formatEther(BigInt(s.price))} ETH</span>
                <span className="text-ink-500"> per {symbol}</span>
              </p>
              <StatusChip tone={phase.tone} className="px-2.5 py-0.5">
                {phase.label}
              </StatusChip>
            </div>

            <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-ink-700/60 bg-ink-950/70">
              <div
                className="h-full bg-electric-500/80"
                style={{ width: `${pct}%` }}
                title={`Sold ${fmtTokens(sold, symbol)}`}
              />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-400">
              <span className="tabular">
                {fmtTokens(sold, symbol)} / {fmtTokens(allocation, symbol)} sold
              </span>
              <span className="tabular">{formatEther(raised)} ETH raised</span>
            </div>

            <div className="mt-4 grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-ink-500">Window</span>
                <span className="text-ink-200">
                  {fmtDate(start)} → {fmtDate(end)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Per-wallet cap</span>
                <span className="tabular text-ink-200">
                  {cap === 0n ? "None" : fmtTokens(cap, symbol)}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">
              Proceeds schedule
            </p>
            <ul className="mt-2 space-y-2">
              {s.tranches.map((t) => {
                const m = milestones?.[t.milestoneIndex];
                const unlock = BigInt(t.unlockTime);
                const status: { label: string; tone: StatusTone } = t.claimed
                  ? {
                      label: `Claimed${t.claimedAmount ? ` ${formatEther(BigInt(t.claimedAmount))} ETH` : ""}`,
                      tone: "success",
                    }
                  : now >= end && unlock <= now
                    ? { label: "Claimable", tone: "info" }
                    : { label: `Unlocks ${fmtDate(unlock)}`, tone: "neutral" };
                return (
                  <li
                    key={`${s.saleId}-${t.trancheIndex}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-700/60 bg-ink-950/50 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0">
                      <span className="font-mono text-ink-500">M{t.milestoneIndex + 1}</span>{" "}
                      <span className="text-ink-100">
                        {m ? m.title : `Milestone ${t.milestoneIndex + 1}`}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular text-ink-200">{t.bps / 100}%</span>
                      <StatusChip tone={status.tone} className="px-2 py-0.5">
                        {status.label}
                      </StatusChip>
                    </span>
                  </li>
                );
              })}
            </ul>

            {recent.length > 0 ? (
              <>
                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">
                  Recent purchases
                </p>
                <ul className="mt-2 space-y-1">
                  {recent.map((p) => (
                    <li key={p.txHash + p.blockTimestamp} className="flex justify-between text-xs">
                      <a
                        href={`${LAUNCH_CHAIN.explorerUrl}/tx/${p.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-electric-300 hover:text-electric-200"
                      >
                        {shortAddr(p.buyer)}
                      </a>
                      <span className="tabular text-ink-300">
                        {fmtTokens(BigInt(p.tokenAmount), symbol)} · {formatEther(BigInt(p.cost))} ETH
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <p className="mt-3 text-xs text-ink-500">
              100% of proceeds go to the creator&apos;s milestone-locked schedule —
              the platform takes nothing.{" "}
              <a
                href={`${LAUNCH_CHAIN.explorerUrl}/tx/${s.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-electric-300 hover:text-electric-200"
              >
                sale transaction
              </a>
            </p>
          </div>
        );
      })}
    </div>
  );
}
