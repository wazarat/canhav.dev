import type { Metadata } from "next";

import { DesignsGrid } from "@/components/explore/DesignsGrid";
import { TokensGrid } from "@/components/explore/TokensGrid";
import { LAUNCH_CHAIN } from "@/content/launch";

export const metadata: Metadata = {
  title: "Tokens",
  description:
    "Tokens launched through the CanHav factory on Robinhood Chain testnet, and published token designs — the thinking behind them.",
};

export const dynamic = "force-dynamic";

export default function TokensPage() {
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">Launchpad</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          Tokens
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-300">
          Every token launched through the factory on {LAUNCH_CHAIN.name}, read
          from the on-chain event log — and the published designs behind them,
          which need no deployment to be discoverable.
        </p>
      </div>

      <section className="mt-10 md:mt-12">
        <h2 className="font-display text-xl font-semibold text-ink-50">Deployed tokens</h2>
        <div className="mt-5">
          <TokensGrid />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-ink-50">Token designs</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
          Published designs: supply, allocations, vesting, and the computed
          float behind each — with the warnings that fired, in the open.
        </p>
        <div className="mt-5">
          <DesignsGrid />
        </div>
      </section>
    </div>
  );
}
