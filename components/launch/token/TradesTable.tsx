"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

import { TOKEN_PAGE_COPY } from "@/content/launch";
import { formatCount } from "@/lib/format";
import { formatEthAmount, type TradeRow } from "@/lib/market";
import { cn } from "@/lib/utils";

const PAGE = 10;

function age(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Recent trades across the curve and the pool, newest first, ten to a page
 * (M58). `now` comes from the server so the ages match on hydration.
 */
export function TradesTable({
  rows,
  total,
  symbol,
  explorerUrl,
  developerTx,
  now,
}: {
  rows: TradeRow[];
  /** Trades the indexer knows of, which can exceed the rows loaded. */
  total: number;
  symbol: string;
  explorerUrl: string;
  /** The launch transaction, whose buy is the developer's. */
  developerTx: string | null;
  now: number;
}) {
  const C = TOKEN_PAGE_COPY.trades;
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="card-surface mt-6 rounded-2xl border border-ink-700/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">{C.title}</h2>
        <span className="tabular rounded-full border border-ink-700/70 px-2.5 py-0.5 text-xs text-ink-400">
          {total}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-400">{C.empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink-800/70">
          {shown.map((r) => {
            const buy = r.side === "buy";
            return (
              <li key={`${r.txHash}-${r.side}-${r.tokensWei}`} className="flex items-center justify-between gap-4 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  {buy ? (
                    <ArrowUpRight aria-label={C.buy} className="h-4 w-4 shrink-0 text-signal-400" />
                  ) : (
                    <ArrowDownLeft aria-label={C.sell} className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                  <div className="min-w-0">
                    <p className="tabular truncate text-sm text-ink-100">
                      {formatCount(Number(BigInt(r.tokensWei) / 10n ** 18n))} {symbol}
                    </p>
                    <a
                      href={`${explorerUrl}/tx/${r.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-ink-500 transition-colors hover:text-electric-200"
                    >
                      {r.trader.slice(0, 6)}…{r.trader.slice(-4)}
                      {buy && developerTx && r.txHash.toLowerCase() === developerTx.toLowerCase()
                        ? ` · ${C.developer}`
                        : ""}
                    </a>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="tabular text-sm text-ink-100">
                      {formatEthAmount(Number(BigInt(r.ethWei)) / 1e18)} ETH
                    </p>
                    <p className="text-[11px] text-ink-500">
                      {r.venue === "curve" ? C.curve : C.pool}
                      {BigInt(r.taxWei) > 0n
                        ? ` · ${formatEthAmount(Number(BigInt(r.taxWei)) / 1e18)} ETH ${C.tax}`
                        : ""}
                    </p>
                  </div>
                  <span className="tabular w-8 text-right text-xs text-ink-500">{age(now - r.timestamp)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label={C.previous}
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-ink-700 p-1.5 text-ink-300 transition-colors hover:text-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className={cn("tabular text-xs text-ink-400")}>
            {page + 1} / {pages}
          </span>
          <button
            type="button"
            aria-label={C.next}
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-ink-700 p-1.5 text-ink-300 transition-colors hover:text-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {total > rows.length ? (
        <p className="mt-3 text-center text-xs text-ink-500">{C.capped(rows.length)}</p>
      ) : null}
    </div>
  );
}
