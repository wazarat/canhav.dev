import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProjectBuildPage } from "@/components/build/ProjectBuildPage";
import { LinkPanel } from "@/components/ideation/LinkPanel";
import { ProjectEditor } from "@/components/ideation/ProjectEditor";
import { McpConnectCard } from "@/components/launch/McpConnectCard";
import { MoveToTeamButton } from "@/components/studio/MoveToTeamButton";
import { ProjectHeaderActions } from "@/components/studio/ProjectHeaderActions";
import { type PanelLaunch, ProjectLaunchPanel } from "@/components/studio/ProjectLaunchPanel";
import { getSessionUser } from "@/lib/auth";
import { projectChainOf } from "@/lib/chains";
import { launchTargetHandoffLine } from "@/content/launch-targets";
import { launchTargetFit, launchTargetOf } from "@/lib/launch-targets";
import { mainnetView } from "@/lib/mainnet-view";
import { hasCommitment } from "@/lib/journey";
import { projectChainLocked } from "@/lib/launch-project";
import { type MyLaunch, getMyLaunches } from "@/lib/my-launches";
import { countPrivateProjects, getLinkedTokenDesign, getMyTokenDesigns, getProject } from "@/lib/ideation-db";
import { latestCheckRuns } from "@/lib/checks/db";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The project page is the five tab BUILD page (M94 to M97). The classic
 * editor stays reachable at ?v=classic for one milestone, then goes.
 */
export default async function ProjectEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/studio");

  const { id } = await params;
  const { v } = await searchParams;
  const build = v !== "classic";
  const row = await getProject(id, user.owner);
  if (!row) notFound();

  const [privateUsed, checks] = await Promise.all([countPrivateProjects(user.owner, row.id), latestCheckRuns(row.id)]);
  const designsRead = getMyTokenDesigns(user.owner);
  const [linked, myDesigns, chainLocked, myLaunches] = await Promise.all([
    getLinkedTokenDesign(row.id),
    designsRead,
    projectChainLocked(row.id),
    getMyLaunches(user.owner, { designs: designsRead }),
  ]);
  // The launches side of the project (M56). Design-only launches link through the design.
  const chain = projectChainOf(row.draft_doc);
  const panelLaunch = (l: MyLaunch): PanelLaunch => ({
    address: l.address,
    name: l.launch?.name ?? l.design?.name ?? `${l.address.slice(0, 6)}…${l.address.slice(-4)}`,
    symbol: l.launch?.symbol ?? null,
    committed: l.launch ? hasCommitment(l.launch.journeyHash) : true,
  });
  const recorded = (myLaunches ?? []).filter((l) => l.source !== "design");
  const hasKit = Boolean(row.draft_doc.kit?.shape);
  // The venue the linked design ideates for (M69), one line on the handoff and the launch panel.
  const launchTarget = linked ? launchTargetOf(linked.draft_doc) : null;
  const venueLine = launchTarget ? launchTargetHandoffLine(launchTarget, launchTargetFit(launchTarget, chain)) : null;

  const headerActions = (
    <>
      <MoveToTeamButton projectId={row.id} name={row.draft_doc.name} orgId={row.org_id ?? null} creator={row.owner_id === user.id} />
      <ProjectHeaderActions
        projectId={row.id}
        name={row.draft_doc.name}
        hasKit={hasKit}
        hasLaunch={recorded.some((l) => l.project?.id === row.id)}
      />
    </>
  );
  // On the BUILD page the panels sit inside Overview as flat cards and the
  // MCP card is the compact one the tab renders itself.
  const panelClass = build ? "rounded-xl border border-ink-700/60 bg-ink-900 p-5" : undefined;
  const linkPanel = (
        <>
          <LinkPanel
            className={panelClass}
            selfType="project"
            selfId={row.id}
            selfName={row.draft_doc.name}
            linked={
              linked
                ? { id: linked.id, name: linked.draft_doc.name, status: linked.status, slug: linked.slug }
                : null
            }
            candidates={(myDesigns ?? []).map((d) => ({ id: d.id, name: d.draft_doc.name }))}
          />
          <ProjectLaunchPanel
            className={panelClass}
            showMainnet={!build}
            project={{ id: row.id, name: row.draft_doc.name, hasKit }}
            linked={recorded.filter((l) => l.project?.id === row.id).map(panelLaunch)}
            candidates={recorded.filter((l) => !l.project && l.chain === chain).map(panelLaunch)}
            venueLine={venueLine}
            mainnet={mainnetView(row.draft_doc)}
          />
          {build ? null : (
            <McpConnectCard
              target={{
                kind: "project",
                id: row.id,
                name: row.draft_doc.name,
                hasKit,
              }}
              className="mt-6"
            />
          )}
        </>
  );

  if (build)
    return (
      <ProjectBuildPage
        id={row.id}
        initialDoc={row.draft_doc}
        initialStatus={row.status}
        initialSlug={row.slug}
        createdAt={new Date(row.created_at).toISOString()}
        checks={checks}
        initialVisibility={row.visibility ?? "public"}
        initialShareToken={row.share_token ?? null}
        privateUsed={privateUsed}
        initialRev={row.agent_rev}
        chainLocked={chainLocked}
        linkedLaunchTarget={launchTarget}
        hasToken={recorded.some((l) => l.project?.id === row.id) || Boolean(linked?.deployed_token_address)}
        tokens={[
          ...recorded
            .filter((l) => l.project?.id === row.id)
            .map((l) => ({ ...panelLaunch(l), launchedAt: l.launchedAt })),
          ...(linked?.deployed_token_address && !recorded.some((l) => l.project?.id === row.id && l.address === linked.deployed_token_address)
            ? [{ address: linked.deployed_token_address, name: linked.draft_doc.name, symbol: linked.draft_doc.ticker || null, launchedAt: null }]
            : []),
        ]}
        headerActions={headerActions}
        linkPanel={linkPanel}
      />
    );

  return (
    <ProjectEditor
      id={row.id}
      initialDoc={row.draft_doc}
      initialStatus={row.status}
      initialSlug={row.slug}
      initialRev={row.agent_rev}
      chainLocked={chainLocked}
      linkedLaunchTarget={launchTarget}
      headerActions={headerActions}
      linkPanel={linkPanel}
    />
  );
}
