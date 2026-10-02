import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { LinkPanel } from "@/components/ideation/LinkPanel";
import { ProjectEditor } from "@/components/ideation/ProjectEditor";
import { McpConnectCard } from "@/components/launch/McpConnectCard";
import { ProjectHeaderActions } from "@/components/studio/ProjectHeaderActions";
import { type PanelLaunch, ProjectLaunchPanel } from "@/components/studio/ProjectLaunchPanel";
import { getSessionUser } from "@/lib/auth";
import { projectChainOf } from "@/lib/chains";
import { hasCommitment } from "@/lib/journey";
import { projectChainLocked } from "@/lib/launch-project";
import { type MyLaunch, getMyLaunches } from "@/lib/my-launches";
import { getLinkedTokenDesign, getMyTokenDesigns, getProject } from "@/lib/ideation-db";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/studio");

  const { id } = await params;
  const row = await getProject(id, user.id);
  if (!row) notFound();

  const [linked, myDesigns, chainLocked, myLaunches] = await Promise.all([
    getLinkedTokenDesign(row.id),
    getMyTokenDesigns(user.id),
    projectChainLocked(row.id),
    getMyLaunches(user.id),
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

  return (
    <ProjectEditor
      id={row.id}
      initialDoc={row.draft_doc}
      initialStatus={row.status}
      initialSlug={row.slug}
      initialRev={row.agent_rev}
      chainLocked={chainLocked}
      headerActions={
        <ProjectHeaderActions
          projectId={row.id}
          name={row.draft_doc.name}
          hasKit={hasKit}
          hasLaunch={recorded.some((l) => l.project?.id === row.id)}
        />
      }
      linkPanel={
        <>
          <LinkPanel
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
            project={{ id: row.id, name: row.draft_doc.name, hasKit }}
            linked={recorded.filter((l) => l.project?.id === row.id).map(panelLaunch)}
            candidates={recorded.filter((l) => !l.project && l.chain === chain).map(panelLaunch)}
          />
          <McpConnectCard
            target={{
              kind: "project",
              id: row.id,
              name: row.draft_doc.name,
              hasKit,
            }}
            className="mt-6"
          />
        </>
      }
    />
  );
}
