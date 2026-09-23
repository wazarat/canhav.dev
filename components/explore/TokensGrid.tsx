import Link from "next/link";

import { EmptyCard } from "@/components/explore/EmptyCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatCount } from "@/lib/format";
import { formatSupply, getActiveSaleTokens, getTokens } from "@/lib/indexer";
import { hasCommitment } from "@/lib/journey";

function launchedOn(blockTimestamp: string): string {
  return new Date(Number(blockTimestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Deployed tokens, read from the on-chain event log via the indexer. */
export async function TokensGrid() {
  const [tokens, liveSaleTokens] = await Promise.all([getTokens(), getActiveSaleTokens()]);
  if (tokens === null)
    return <EmptyCard>Token data is temporarily unavailable. Try again shortly.</EmptyCard>;
  if (tokens.length === 0) return <EmptyCard>No tokens launched yet.</EmptyCard>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map((t) => {
        const liveSale = liveSaleTokens?.has(t.address.toLowerCase()) ?? false;
        const committed = hasCommitment(t.journeyHash);
        return (
          <Link
            key={t.address}
            href={`/launch/t/${t.address}`}
            className="card-surface card-lift block rounded-2xl border border-ink-700/70 p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-700/60 bg-ink-900/80">
                {t.imageURI ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.imageURI} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-gradient-brand font-display text-lg font-semibold">
                    {t.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold text-ink-50">{t.name}</p>
                <p className="font-mono text-xs text-electric-300">${t.symbol}</p>
              </div>
              {liveSale ? (
                <StatusChip tone="success" className="ml-auto shrink-0 px-2 py-0.5 text-[11px]">
                  Live sale
                </StatusChip>
              ) : !committed ? (
                <StatusChip tone="neutral" className="ml-auto shrink-0 px-2 py-0.5 text-[11px]">
                  No commitment
                </StatusChip>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-ink-500">Supply</span>
              <span className="tabular text-ink-200">{formatCount(formatSupply(t.totalSupply))}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-500">Launched</span>
              <span className="tabular text-ink-200">{launchedOn(t.blockTimestamp)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-500">Template</span>
              <span className="text-ink-200">v{t.version}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
