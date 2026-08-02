import type { Metadata } from "next";
import Link from "next/link";

import { LAUNCH_CHAIN } from "@/content/launch";
import { formatCount } from "@/lib/format";
import { formatSupply, getActiveSaleTokens, getTokens } from "@/lib/indexer";

// Hidden like /launch: URL-only access, no nav links.
export const metadata: Metadata = {
  title: "Explore tokens",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const [tokens, liveSaleTokens] = await Promise.all([getTokens(), getActiveSaleTokens()]);

  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">Launchpad</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          Explore tokens
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-300">
          Every token launched through the factory on {LAUNCH_CHAIN.name}, read
          from the on-chain event log.
        </p>
      </div>

      <div className="mt-10 md:mt-12">
        {tokens === null ? (
          <div className="glass rounded-2xl border border-ink-700/70 p-8 text-center">
            <p className="text-sm text-ink-300">
              Indexer offline. Start it with{" "}
              <code className="rounded bg-ink-900/80 px-1.5 py-0.5 font-mono text-xs text-ink-200">
                cd indexer && npm run dev
              </code>
            </p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="glass rounded-2xl border border-ink-700/70 p-8 text-center">
            <p className="text-sm text-ink-300">No tokens launched yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tokens.map((t) => (
              <Link
                key={t.address}
                href={`/launch/t/${t.address}`}
                className="card-surface card-lift block rounded-2xl border border-ink-700/70 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-900/80">
                    <span className="text-gradient-brand font-display text-lg font-semibold">
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-ink-50">
                      {t.name}
                    </p>
                    <p className="font-mono text-xs text-electric-300">${t.symbol}</p>
                  </div>
                  {liveSaleTokens?.has(t.address.toLowerCase()) ? (
                    <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                      Live sale
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-ink-500">Supply</span>
                  <span className="tabular text-ink-200">
                    {formatCount(formatSupply(t.totalSupply))}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-ink-500">Template</span>
                  <span className="text-ink-200">v{t.version}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-ink-500">Block</span>
                  <span className="tabular text-ink-200">{t.blockNumber}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
