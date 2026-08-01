import { Lock } from "lucide-react";

import { LAUNCH_CHAIN } from "@/content/launch";
import { formatCount } from "@/lib/format";
import type { IndexedVesting } from "@/lib/indexer";

function fmtDate(unixSeconds: bigint): string {
  const d = new Date(Number(unixSeconds) * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtTokens(wei: bigint, symbol: string): string {
  return `${formatCount(Number(wei / 10n ** 18n))} ${symbol}`;
}

export interface LiveVesting {
  releasable: bigint;
  released: bigint;
  owner: string;
}

/**
 * Vesting schedule for a token. Schedule parameters come from the on-chain
 * VestingCreated event (via the indexer); `live` values are read from the
 * chain at render time. `live` is null when the RPC read failed — the card
 * degrades to schedule-only.
 */
export function VestingCard({
  vesting,
  symbol,
  live,
}: {
  vesting: IndexedVesting;
  symbol: string;
  live: LiveVesting | null;
}) {
  const amount = BigInt(vesting.amount);
  const start = BigInt(vesting.startTimestamp);
  const duration = BigInt(vesting.durationSeconds);
  const cliff = BigInt(vesting.cliffSeconds);

  const released = live?.released ?? 0n;
  const releasable = live?.releasable ?? 0n;
  const vested = released + releasable;
  const locked = amount - vested;
  const pct = (n: bigint) => (amount === 0n ? 0 : Number((n * 10_000n) / amount) / 100);

  return (
    <div className="card-surface mt-8 rounded-2xl border border-ink-700/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink-50">
          <Lock className="h-4 w-4 text-electric-300" /> Vesting
        </h2>
        <span className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1 text-xs text-ink-300">
          Read from chain
        </span>
      </div>

      {live ? (
        <>
          <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full border border-ink-700/60 bg-ink-950/70">
            <div
              className="h-full bg-emerald-500/80"
              style={{ width: `${pct(released)}%` }}
              title={`Released ${fmtTokens(released, symbol)}`}
            />
            <div
              className="h-full bg-electric-500/80"
              style={{ width: `${pct(releasable)}%` }}
              title={`Releasable ${fmtTokens(releasable, symbol)}`}
            />
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
              <span className="text-ink-500">Released</span>
              <span className="tabular ml-auto text-ink-200">{fmtTokens(released, symbol)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-electric-500/80" />
              <span className="text-ink-500">Releasable now</span>
              <span className="tabular ml-auto text-ink-200">{fmtTokens(releasable, symbol)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ink-700" />
              <span className="text-ink-500">Still locked</span>
              <span className="tabular ml-auto text-ink-200">{fmtTokens(locked, symbol)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-xs text-ink-500">
          Live progress unavailable (RPC unreachable) — schedule below is from the
          launch event.
        </p>
      )}

      <div className="mt-5 grid gap-x-8 gap-y-2 border-t border-ink-800/70 pt-4 text-xs sm:grid-cols-2">
        <div className="flex justify-between">
          <span className="text-ink-500">Vested amount</span>
          <span className="tabular text-ink-200">{fmtTokens(amount, symbol)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-500">Start</span>
          <span className="text-ink-200">{fmtDate(start)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-500">Cliff ends</span>
          <span className="text-ink-200">{cliff === 0n ? "No cliff" : fmtDate(start + cliff)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-500">Fully vested</span>
          <span className="text-ink-200">{fmtDate(start + duration)}</span>
        </div>
        <div className="flex justify-between sm:col-span-2">
          <span className="text-ink-500">Vesting wallet</span>
          <a
            href={`${LAUNCH_CHAIN.explorerUrl}/address/${vesting.walletAddress}`}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-electric-300 hover:text-electric-200"
          >
            {vesting.walletAddress}
          </a>
        </div>
        <div className="flex justify-between sm:col-span-2">
          <span className="text-ink-500">Beneficiary (live owner)</span>
          <span className="break-all font-mono text-ink-200">
            {live?.owner ?? vesting.beneficiary}
          </span>
        </div>
      </div>
    </div>
  );
}
