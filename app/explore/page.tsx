import type { Metadata } from "next";
import Link from "next/link";

import { BuildWithUsCards } from "@/components/home/BuildWithUsCards";
import { TokensGrid } from "@/components/explore/TokensGrid";
import { LAUNCH_COPY } from "@/content/launch";

export const metadata: Metadata = {
  title: "Explore launches",
  description:
    "Every token launched through the CanHav factory on Robinhood Chain Testnet, newest first.",
};

export const dynamic = "force-dynamic";

/** The launch board. Replaced /projects in the nav, and absorbed it below. */
export default function ExplorePage() {
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">{LAUNCH_COPY.kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          {LAUNCH_COPY.exploreTitle}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-400">
          {LAUNCH_COPY.exploreLead}{" "}
          <Link
            href="/launch"
            className="text-electric-300 transition-colors hover:text-electric-200"
          >
            Launch a token →
          </Link>
        </p>
      </div>

      <div className="mt-10 md:mt-12">
        <TokensGrid />
      </div>

      <div className="mt-20 border-t border-ink-800/70 pt-16 md:mt-24 md:pt-20">
        <BuildWithUsCards />
      </div>
    </div>
  );
}
