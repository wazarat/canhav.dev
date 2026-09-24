import Link from "next/link";

import { EmptyCard } from "@/components/explore/EmptyCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatCount } from "@/lib/format";
import {
  formatSupply,
  getActiveSaleTokens,
  getPools,
  getTokens,
  type IndexedPool,
} from "@/lib/indexer";
import { hasCommitment } from "@/lib/journey";

function launchedOn(blockTimestamp: string): string {
  return new Date(Number(blockTimestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** ETH per whole token, derived from reserves the same way PoolCard does. */
function priceEth(pool: IndexedPool): string {
  const tokenReserve = BigInt(pool.tokenReserve);
  if (tokenReserve === 0n) return "n/a";
  const wei = (BigInt(pool.ethReserve) * 10n ** 18n) / tokenReserve;
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "n/a";
  return eth < 0.000001 ? eth.toExponential(2) : eth.toPrecision(3);
}

/** Pool depth in ETH. No USD anywhere: this chain has no price feed. */
function liquidityEth(pool: IndexedPool): string {
  const eth = Number(BigInt(pool.ethReserve)) / 1e18;
  return eth < 0.001 ? eth.toExponential(2) : eth.toPrecision(3);
}

/** Deployed tokens, read from the on-chain event log via the indexer. */
export async function TokensGrid() {
  const [tokens, liveSaleTokens, pools] = await Promise.all([
    getTokens(),
    getActiveSaleTokens(),
    getPools(),
  ]);
  if (tokens === null)
    return <EmptyCard>Token data is temporarily unavailable. Try again shortly.</EmptyCard>;
  if (tokens.length === 0) return <EmptyCard>No tokens launched yet.</EmptyCard>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map((t) => {
        const liveSale = liveSaleTokens?.has(t.address.toLowerCase()) ?? false;
        const committed = hasCommitment(t.journeyHash);
        // Pools are per (token, creator) and only the creator's own pool is
        // shown, the same authorship rule the token page applies.
        const pool =
          pools?.get(`${t.address.toLowerCase()}:${t.creator.toLowerCase()}`) ?? null;
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
              <span className="text-ink-500">Price</span>
              <span className="tabular text-ink-200">
                {pool ? `${priceEth(pool)} ETH` : "No pool yet"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-500">Liquidity</span>
              <span className="tabular text-ink-200">
                {pool ? `${liquidityEth(pool)} ETH` : "No pool yet"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-500">Supply</span>
              <span className="tabular text-ink-200">{formatCount(formatSupply(t.totalSupply))}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-500">Launched</span>
              <span className="tabular text-ink-200">{launchedOn(t.blockTimestamp)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
