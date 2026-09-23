import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TokensGrid } from "@/components/explore/TokensGrid";
import { LAUNCH_COPY } from "@/content/launch";

export const metadata: Metadata = {
  title: "Recent launches",
  description: "Every token launched through the CanHav factory on Robinhood Chain Testnet, newest first.",
};

export const dynamic = "force-dynamic";

/** Recent launches. Old `?view=projects` links still forward to /projects. */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  if (view === "projects") redirect("/projects");

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
    </div>
  );
}
