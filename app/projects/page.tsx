import type { Metadata } from "next";

import { ProjectsGrid } from "@/components/explore/ProjectsGrid";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Products being built on Robinhood Chain testnet — published project records with architecture, security posture, and verified signals. No token required.",
};

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">Launchpad</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          Projects
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-300">
          What teams are actually building: sector, architecture, security
          posture, and where the first hundred users come from. A product
          needs no token to be listed here — that&apos;s the point.
        </p>
      </div>

      <div className="mt-10 md:mt-12">
        <ProjectsGrid />
      </div>
    </div>
  );
}
