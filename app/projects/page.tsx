import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { SoonBadge } from "@/components/ui/SoonBadge";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Published project records for products on Robinhood Chain testnet are coming soon. Until then, ideate the project behind your token through Token Launch.",
};

export const dynamic = "force-dynamic";

// The explore grid (components/explore/ProjectsGrid.tsx) returns here when
// the Projects track opens; the component is kept on disk for that relaunch.
export default function ProjectsPage() {
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">Launchpad</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          Projects
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-300">
          What teams are building: sector, architecture, security posture,
          and where the first hundred users come from. A product will need
          no token to be listed here. That is the point.
        </p>
      </div>

      <div className="mt-10 max-w-2xl md:mt-12">
        <div className="glass rounded-2xl border border-ink-700/60 p-8">
          <SoonBadge label="Coming soon" />
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink-50">
            Project records are on the way.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Published project pages open after token launch. You can already
            ideate the project behind your token: start a token design in the
            studio and capture the product record there.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/studio">Ideate through Token Launch</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tokens">Browse live tokens</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
