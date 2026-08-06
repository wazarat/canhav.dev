import { Milestone } from "lucide-react";

import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { LAUNCH_CHAIN } from "@/content/launch";
import { formatCount } from "@/lib/format";
import type { IndexedEscrow } from "@/lib/indexer";
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

/**
 * Milestone escrows for a token. Every number comes from on-chain events (via
 * the indexer); milestone titles come from the journey doc, whose order is
 * committed by the escrow's journeyHash. The escrow contract has no admin —
 * tranches unlock at their dates and can only ever be claimed to the creator.
 */
export function EscrowCard({
  escrows,
  symbol,
  milestones,
  nowSeconds,
}: {
  escrows: IndexedEscrow[];
  symbol: string;
  milestones: JourneyMilestone[] | null;
  nowSeconds: number;
}) {
  const now = BigInt(nowSeconds);

  return (
    <div className="card-surface mt-8 rounded-2xl border border-ink-700/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink-50">
          <Milestone className="h-4 w-4 text-electric-300" /> Milestone escrow
        </h2>
        <span className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1 text-xs text-ink-300">
          No admin — time-locked on-chain
        </span>
      </div>

      {escrows.map((e) => {
        const tranches = e.tranches.map((t) => ({
          ...t,
          amountWei: BigInt(t.amount),
          unlock: BigInt(t.unlockTime),
        }));
        const total = tranches.reduce((s, t) => s + t.amountWei, 0n);
        const claimed = tranches.filter((t) => t.claimed).reduce((s, t) => s + t.amountWei, 0n);
        const claimable = tranches
          .filter((t) => !t.claimed && t.unlock <= now)
          .reduce((s, t) => s + t.amountWei, 0n);
        const locked = total - claimed - claimable;
        const pct = (n: bigint) => (total === 0n ? 0 : Number((n * 10_000n) / total) / 100);

        return (
          <div key={e.escrowId} className="mt-5 border-t border-ink-800/70 pt-4 first:mt-4 first:border-t-0 first:pt-0">
            <div className="flex h-3 w-full overflow-hidden rounded-full border border-ink-700/60 bg-ink-950/70">
              <div
                className="h-full bg-emerald-500/80"
                style={{ width: `${pct(claimed)}%` }}
                title={`Claimed ${fmtTokens(claimed, symbol)}`}
              />
              <div
                className="h-full bg-electric-500/80"
                style={{ width: `${pct(claimable)}%` }}
                title={`Claimable ${fmtTokens(claimable, symbol)}`}
              />
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                <span className="text-ink-500">Claimed</span>
                <span className="tabular ml-auto text-ink-200">{fmtTokens(claimed, symbol)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-electric-500/80" />
                <span className="text-ink-500">Claimable now</span>
                <span className="tabular ml-auto text-ink-200">{fmtTokens(claimable, symbol)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ink-700" />
                <span className="text-ink-500">Still locked</span>
                <span className="tabular ml-auto text-ink-200">{fmtTokens(locked, symbol)}</span>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {tranches.map((t) => {
                const m = milestones?.[t.milestoneIndex];
                const status: { label: string; tone: StatusTone } = t.claimed
                  ? { label: "Claimed", tone: "success" }
                  : t.unlock <= now
                    ? { label: "Claimable", tone: "info" }
                    : { label: `Unlocks ${fmtDate(t.unlock)}`, tone: "neutral" };
                return (
                  <li
                    key={`${e.escrowId}-${t.trancheIndex}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-700/60 bg-ink-950/50 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0">
                      <span className="font-mono text-ink-500">M{t.milestoneIndex + 1}</span>{" "}
                      <span className="text-ink-100">
                        {m ? m.title : `Milestone ${t.milestoneIndex + 1}`}
                      </span>
                      {m ? <span className="ml-2 font-mono text-ink-500">{m.date}</span> : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular text-ink-200">{fmtTokens(t.amountWei, symbol)}</span>
                      <StatusChip tone={status.tone} className="px-2 py-0.5">
                        {status.label}
                      </StatusChip>
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-3 text-xs text-ink-500">
              Locked by{" "}
              <span className="font-mono">{e.creator.slice(0, 6)}…{e.creator.slice(-4)}</span> ·{" "}
              <a
                href={`${LAUNCH_CHAIN.explorerUrl}/tx/${e.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-electric-300 hover:text-electric-200"
              >
                escrow transaction
              </a>
            </p>
          </div>
        );
      })}
    </div>
  );
}
