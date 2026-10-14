import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EntityList, type TokenChipFacts } from "@/components/studio/EntityList";
import { LaunchesSummary } from "@/components/studio/LaunchesSummary";
import { StudioTrackCards } from "@/components/studio/StudioTrackCards";
import { SignInCard } from "@/components/studio/SignInCard";
import { AccountMenu } from "@/components/studio/AccountMenu";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { getCurvesAllChains } from "@/lib/indexer";
import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import { projectChainOf } from "@/lib/chains";
import { signInRedirectTarget } from "@/lib/sign-in-redirect";
import { agentActivityByOwner } from "@/lib/agent-writes-db";
import { getEntityLinks, getMyProjects, getMyTokenDesigns } from "@/lib/ideation-db";
import { launchedSets } from "@/lib/launch-status";
import { getMyLaunches } from "@/lib/my-launches";
import { STUDIO_COPY } from "@/content/ideation";

// Intentionally unlinked from navigation while the ideation tracks are
// developed incrementally — URL-only, like /launch.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The studio home (M75 order): the account row, the three track cards, the
 * launches summary, then the token designs and projects still in progress.
 * Launched records leave these two lists and live under Launches and on
 * /studio/launches.
 *
 * ?redirect_url= is the sign-in round trip (the export gate, and Clerk's
 * OAuth consent screen during an MCP sign-in). The SignIn card follows it
 * for a visitor; a signed-in account is sent on from here, otherwise the
 * consent screen is never reached and the agent waits forever.
 */
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const header = (
    <div className="max-w-2xl">
      <p className="kicker">{STUDIO_COPY.kicker}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
        {STUDIO_COPY.title}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-400">{STUDIO_COPY.subtitle}</p>
    </div>
  );

  if (!isAuthConfigured()) {
    return (
      <div className="container py-14 md:py-20">
        {header}
        <div className="mt-10 max-w-md">
          <StatusChip tone="warning" variant="block">
            Sign-in is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            and CLERK_SECRET_KEY, then reload.
          </StatusChip>
        </div>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="container py-14 md:py-20">
        {header}
        <div className="mt-10">
          <SignInCard />
        </div>
      </div>
    );
  }
  const { redirect_url: rawRedirect } = await searchParams;
  if (rawRedirect !== undefined) {
    const host = (await headers()).get("host") ?? "";
    const target = signInRedirectTarget(rawRedirect, host);
    if (target) redirect(target);
  }

  const [projects, designs, launches, links, agent] = await Promise.all([
    getMyProjects(user.id),
    getMyTokenDesigns(user.id),
    getMyLaunches(user.id),
    getEntityLinks(user.id),
    agentActivityByOwner(user.id),
  ]);
  // Token build chips (M46). One curve read for every deployed design.
  const deployedAny = (designs ?? []).some((d) => d.deployed_token_address);
  const token: TokenChipFacts = {
    linkedDesignIds: new Set(links.byDesign.keys()),
    curves: deployedAny ? await getCurvesAllChains() : null,
    now: Math.floor(Date.now() / 1000),
  };
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

  return (
    <div className="container py-14 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {header}
        <div className="flex flex-col items-end gap-3">
          <AccountMenu />
          <Button asChild variant="secondary">
            <Link href="/studiopro">{STUDIO_COPY.pro.join}</Link>
          </Button>
        </div>
      </div>

      {projects === null || designs === null ? (
        <div className="mt-10 max-w-md">
          <StatusChip tone="warning" variant="block">
            Storage is not configured, so drafts can&apos;t be loaded right now.
          </StatusChip>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <StudioTrackCards />
          <LaunchesSummary launches={launches} projects={linkProjects} />
          <div className="grid gap-10 md:grid-cols-2">
            <EntityList
              title="Token designs"
              rows={designs.filter((d) => !launched.designs.has(d.id))}
              hrefBase="/studio/token"
              publicBase="/t"
              token={token}
              empty="No token designs yet. A design is what you're issuing; product optional."
              links={links.byDesign}
              side="design"
            />
            <EntityList
              title="Projects"
              rows={projects.filter((p) => !launched.projects.has(p.id))}
              hrefBase="/studio/project"
              publicBase="/p"
              empty="No projects yet. A project is what you're building; token optional."
              links={links.byProject}
              side="project"
              agent={agent}
            />
          </div>
          {launched.projects.size || launched.designs.size ? (
            <p className="text-xs text-ink-500">
              {STUDIO_COPY.launches.draftsNote(launched.projects.size, launched.designs.size)}{" "}
              <Link
                href="/studio/launches"
                target="_blank"
                rel="noopener"
                className="text-electric-300 transition-colors hover:text-electric-200"
              >
                {STUDIO_COPY.launches.viewAll}
              </Link>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
