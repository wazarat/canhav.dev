import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { LaunchList } from "@/components/studio/LaunchList";
import type { LaunchLinkProject } from "@/components/studio/LaunchRowActions";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { STUDIO_COPY } from "@/content/ideation";
import type { ProjectChain } from "@/lib/chains";
import type { MyLaunch } from "@/lib/my-launches";

/** How many launches the studio home shows before pointing at the full page. */
export const HOME_LAUNCH_LIMIT = 3;

/**
 * The studio home's Launches block (M75): a heading row with the link to
 * the full page, then a closed Collapsible whose summary carries the count
 * and the newest token, opening to the newest three rows. With more than
 * three launches the "View all launches" button opens /studio/launches in a
 * new tab, so the home stays the workbench and the page is the ledger.
 */
export function LaunchesSummary({
  launches,
  projects,
}: {
  launches: MyLaunch[] | null;
  projects: Array<LaunchLinkProject & { chain: ProjectChain }>;
}) {
  const C = STUDIO_COPY.launches;
  const count = launches?.length ?? 0;
  const newest = launches?.[0] ? (launches[0].launch?.name ?? launches[0].design?.name ?? null) : null;
  const overflow = count > HOME_LAUNCH_LIMIT;
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink-50">{C.title}</h2>
        {overflow ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/studio/launches" target="_blank" rel="noopener" title={C.viewAllHint}>
              {C.viewAll}
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : (
          <Link
            href="/studio"
            className="text-xs text-electric-300 transition-colors hover:text-electric-200"
          >
            {C.launchOne} →
          </Link>
        )}
      </div>
      {launches === null || count === 0 ? (
        <div className="mt-3">
          <LaunchList launches={launches} projects={projects} />
        </div>
      ) : (
        <Collapsible className="mt-3" summary={C.summary(count, newest)}>
          <LaunchList launches={launches} projects={projects} limit={HOME_LAUNCH_LIMIT} />
        </Collapsible>
      )}
    </section>
  );
}
