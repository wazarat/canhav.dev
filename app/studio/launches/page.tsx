import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EntityList, type TokenChipFacts } from "@/components/studio/EntityList";
import { LaunchList } from "@/components/studio/LaunchList";
import { Segmented } from "@/components/ui/Segmented";
import { StatusChip } from "@/components/ui/StatusChip";
import { STUDIO_COPY } from "@/content/ideation";
import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import { PROJECT_CHAINS, PROJECT_CHAIN_INFO, type ProjectChain, projectChainOf } from "@/lib/chains";
import { getEntityLinks, getMyProjects, getMyTokenDesigns } from "@/lib/ideation-db";
import { launchedSets } from "@/lib/launch-status";
import { getMyLaunches } from "@/lib/my-launches";

/**
 * The account's launch ledger (M75): every launch, then every project still
 * in progress, with a chain filter in the URL. Reached from the studio
 * home's "View all launches" (a new tab) and unlinked from navigation.
 */
export const metadata: Metadata = {
  title: STUDIO_COPY.launches.pageTitle,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function chainParam(value: string | undefined): ProjectChain | "" {
  return (PROJECT_CHAINS as readonly string[]).includes(value ?? "") ? (value as ProjectChain) : "";
}

export default async function StudioLaunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ chain?: string }>;
}) {
  const C = STUDIO_COPY.launches;
  if (!isAuthConfigured()) redirect("/studio");
  const user = await getSessionUser();
  if (!user) redirect("/studio");

  const { chain: rawChain } = await searchParams;
  const chain = chainParam(rawChain);

  const [projects, designs, launches, links] = await Promise.all([
    getMyProjects(user.id),
    getMyTokenDesigns(user.id),
    getMyLaunches(user.id),
    getEntityLinks(user.id),
  ]);
  const launched = launchedSets({
    launches: launches ?? [],
    designs: designs ?? [],
    links: links.byProject.values(),
  });
  const linkProjects = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.draft_doc.name,
    hasKit: Boolean(p.draft_doc.kit?.shape),
    chain: projectChainOf(p.draft_doc),
  }));
  const shownLaunches = launches === null ? null : launches.filter((l) => !chain || l.chain === chain);
  const inProgress = (projects ?? []).filter(
    (p) => !launched.projects.has(p.id) && (!chain || projectChainOf(p.draft_doc) === chain),
  );
  const token: TokenChipFacts = {
    linkedDesignIds: new Set(links.byDesign.keys()),
    curves: null,
    now: Math.floor(Date.now() / 1000),
  };

  return (
    <div className="container py-14 md:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="kicker">{STUDIO_COPY.kicker}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
            {C.pageTitle}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-400">{C.pageSubtitle}</p>
        </div>
        <Segmented
          ariaLabel={C.chainFilter}
          value={chain}
          options={[
            { value: "", label: C.allChains, href: "/studio/launches" },
            ...PROJECT_CHAINS.map((c) => ({
              value: c,
              label: PROJECT_CHAIN_INFO[c].short,
              href: `/studio/launches?chain=${c}`,
            })),
          ]}
        />
      </div>

      {projects === null ? (
        <div className="mt-10 max-w-md">
          <StatusChip tone="warning" variant="block">
            Storage is not configured, so launches can&apos;t be loaded right now.
          </StatusChip>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-ink-50">
                {C.title}
                {shownLaunches ? <span className="ml-2 text-sm font-normal text-ink-400">{shownLaunches.length}</span> : null}
              </h2>
              <Link href="/launch" className="text-xs text-electric-300 transition-colors hover:text-electric-200">
                {C.launchOne} →
              </Link>
            </div>
            <LaunchList launches={shownLaunches} projects={linkProjects} />
          </section>
          <EntityList
            title={C.inProgress}
            rows={inProgress}
            hrefBase="/studio/project"
            publicBase="/p"
            empty={C.inProgressEmpty}
            links={links.byProject}
            side="project"
            token={token}
          />
        </div>
      )}
    </div>
  );
}
