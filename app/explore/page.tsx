import type { Metadata } from "next";
import Link from "next/link";

import { BuildWithUsCards } from "@/components/home/BuildWithUsCards";
import { ExploreToggle } from "@/components/explore/ExploreToggle";
import { ProjectsGrid } from "@/components/explore/ProjectsGrid";
import { TokensGrid } from "@/components/explore/TokensGrid";
import { EXPLORE_COPY, type ExploreView } from "@/content/launch";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Every token launched through CanHav on Robinhood Chain Testnet and every project published from the studio, newest first.",
};

export const dynamic = "force-dynamic";

/**
 * The Explore board. Replaced /projects in the nav, and absorbed it. A
 * toggle switches between launched tokens (the default) and published
 * projects (?view=projects, M49).
 */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const raw = (await searchParams).view;
  const view: ExploreView = (Array.isArray(raw) ? raw[0] : raw) === "projects" ? "projects" : "tokens";
  const copy = EXPLORE_COPY[view];
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">{EXPLORE_COPY.kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-400">
          {copy.lead}{" "}
          <Link
            href={copy.href}
            className="text-electric-300 transition-colors hover:text-electric-200"
          >
            {copy.cta}
          </Link>
        </p>
      </div>

      <div className="mt-8">
        <ExploreToggle view={view} />
      </div>

      <div className="mt-6 md:mt-8">{view === "projects" ? <ProjectsGrid /> : <TokensGrid />}</div>

      <div className="mt-20 border-t border-ink-800/70 pt-16 md:mt-24 md:pt-20">
        <BuildWithUsCards />
      </div>
    </div>
  );
}
