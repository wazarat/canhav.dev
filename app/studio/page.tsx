import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EntityList } from "@/components/studio/EntityList";
import { LaunchesSummary } from "@/components/studio/LaunchesSummary";
import { StudioTrackCards } from "@/components/studio/StudioTrackCards";
import { SignInCard } from "@/components/studio/SignInCard";
import { CommandMenuHint } from "@/components/studio/CommandMenuHint";
import { PlanWord } from "@/components/studio/PlanWord";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import { projectChainOf } from "@/lib/chains";
import { signInRedirectTarget } from "@/lib/sign-in-redirect";
import { agentActivityByProjects } from "@/lib/agent-writes-db";
import { latestSessionsByProjects } from "@/lib/agent-sessions-db";
import { getEntityLinks, getMyProjects, getMyTokenDesigns } from "@/lib/ideation-db";
import { launchedSets } from "@/lib/launch-status";
import { getMyLaunches } from "@/lib/my-launches";
import { STUDIO_COPY } from "@/content/ideation";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { ManageTeamButton } from "@/components/studio/PlusCheckout";
import { getPlan } from "@/lib/plan";

// The studio home, reached from the Studio link in the navigation.
export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The studio home (M75 order, projects only since 2026-10-18): the account
 * row, the start a project card, the launches summary, then the projects
 * still in progress. Token designs are reached from a project's Overview,
 * the switcher and the command menu. Launched records leave the list and
 * live under Launches and on /studio/launches.
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
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
        <PlanWord />
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

  // One round trip each for projects and designs: the launches reader is
  // handed the same promises, and the agent reads (keyed by project, so a
  // team sees them, M107) start as soon as the project rows land instead
  // of after the slowest read (2026-10-21).
  const projectsRead = getMyProjects(user.owner);
  const designsRead = getMyTokenDesigns(user.owner);
  const projectIdsRead = projectsRead.then((rows) => (rows ?? []).map((p) => p.id));
  const [plan, projects, designs, launches, links, agent, sessions] = await Promise.all([
    getPlan(),
    projectsRead,
    designsRead,
    getMyLaunches(user.owner, { projects: projectsRead, designs: designsRead }),
    getEntityLinks(user.owner),
    projectIdsRead.then(agentActivityByProjects),
    projectIdsRead.then(latestSessionsByProjects),
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

  return (
    <div className="container py-14 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {header}
        <div className="flex flex-col items-end gap-3">
          <CommandMenuHint />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {plan.plan === "studio_plus" ? (
              <ManageTeamButton label={STUDIO_PLUS_COPY.manage} size="sm" variant="outline" />
            ) : (
              <Button asChild size="sm">
                <Link href={STUDIO_PLUS_COPY.path}>{STUDIO_PLUS_COPY.upgrade}</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="secondary">
              <Link href="/studiopro">{STUDIO_COPY.pro.join}</Link>
            </Button>
          </div>
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
          <EntityList
            title={STUDIO_COPY.inProgress}
            rows={projects.filter((p) => !launched.projects.has(p.id))}
            hrefBase="/studio/project"
            publicBase="/p"
            empty="No projects yet. Start one above."
            links={links.byProject}
            side="project"
            agent={agent}
            sessions={sessions}
          />
          {launched.projects.size ? (
            <p className="text-xs text-ink-500">
              {STUDIO_COPY.launches.draftsNote(launched.projects.size)}{" "}
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
