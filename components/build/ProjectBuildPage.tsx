"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BuildHeader } from "@/components/build/BuildHeader";
import { BuildSidebar } from "@/components/build/BuildSidebar";
import { BuildTab as BuildTabView } from "@/components/build/BuildTab";
import { BuildTabs } from "@/components/build/BuildTabs";
import { DecisionsTab } from "@/components/build/DecisionsTab";
import { type DeployedToken, DeploymentsTab } from "@/components/build/DeploymentsTab";
import { OverviewTab } from "@/components/build/OverviewTab";
import { HistoryDialog } from "@/components/build/HistoryDialog";
import { PublishBlockedDialog } from "@/components/build/PublishBlockedDialog";
import { PublishTab } from "@/components/build/PublishTab";
import { AutosaveIndicator } from "@/components/ideation/AutosaveIndicator";
import { type ResourceView, ResourcesDrawer } from "@/components/build/ResourcesDrawer";
import { useDeployerBalances } from "@/components/build/useDeployerBalances";
import { useAgentChanges } from "@/components/build/useAgentChanges";
import { useTabParam } from "@/components/build/useTabParam";
import { AgentActivityToast } from "@/components/ideation/AgentActivityToast";
import { StaleDraftNotice } from "@/components/ideation/StaleDraftNotice";
import { useAutosave } from "@/components/ideation/useAutosave";
import { useDraftDoc } from "@/components/ideation/useDraftDoc";
import { useDraftSave } from "@/components/ideation/useDraftSave";
import { usePublish } from "@/components/ideation/usePublish";
import { BUILD_COPY, BUILD_TABS, type BuildTab } from "@/content/build";
import { STUDIO_COPY } from "@/content/ideation";
import { kitsForDoc } from "@/content/kits";
import type { AgentActivity } from "@/lib/agent-writes";
import { sessionView } from "@/lib/agent-sessions";
import { projectProblems, tabProblems } from "@/lib/build-readiness";
import { projectChainOf } from "@/lib/chains";
import { registerCommands } from "@/lib/command-menu";
import { deployerView } from "@/lib/deployer";
import { type ProjectDoc, testnetContractRows } from "@/lib/ideation";
import { mainnetView } from "@/lib/mainnet-view";
import { type ProjectKit, emptyProjectKit } from "@/lib/kits";
import type { LaunchTarget } from "@/lib/launch-targets";

/**
 * The project page (M94 onwards): five fixed tabs over one draft. This
 * root owns the draft, saving, publishing, the agent poll and the tab in
 * the URL; the tabs only read the doc and patch it, so switching tabs never
 * loses an unsaved edit. Replaces ProjectEditor once every tab is in.
 */
export function ProjectBuildPage({
  id,
  initialDoc,
  initialStatus,
  initialSlug,
  initialVisibility = "public",
  initialShareToken = null,
  privateUsed = 0,
  initialRev,
  chainLocked = false,
  linkedLaunchTarget = null,
  hasToken = false,
  tokens = [],
  linkPanel,
  headerActions,
}: {
  id: string;
  initialDoc: ProjectDoc;
  initialStatus: "draft" | "published";
  initialSlug: string | null;
  /** Private keeps the published page off the listings (M109). */
  initialVisibility?: "public" | "private";
  initialShareToken?: string | null;
  /** The owner's other published private projects, for the free allowance (M109). */
  privateUsed?: number;
  /** The draft's agent revision at load. Undefined before the database update (M39). */
  initialRev?: number;
  /** True once a token has launched from the project, which fixes its chain (M52). */
  chainLocked?: boolean;
  /** The launch venue the linked token design ideates for (M69), null when none. */
  linkedLaunchTarget?: LaunchTarget | null;
  /** True when a launch is linked to the project or the linked design has deployed (M95). */
  hasToken?: boolean;
  /** The tokens launched from or linked to the project, for Deployments (M96). */
  tokens?: DeployedToken[];
  linkPanel?: React.ReactNode;
  headerActions?: React.ReactNode;
}) {
  const { doc, patch, patchSection, setDoc } = useDraftDoc(initialDoc);
  const { save, stale, adopt, rev } = useDraftSave("projects", id, initialRev);
  const saveState = useAutosave(doc, save);
  const [heldRev, setHeldRev] = useState(initialRev);
  const { status: publishStatus, publish, unpublish } = usePublish("projects", id);
  /** The visibility the next publish uses (M109). */
  const [visibility, setVisibility] = useState<"public" | "private">(initialVisibility);
  const { tab, setTab, milestone, setMilestone } = useTabParam();
  const [activity, setActivity] = useState<(AgentActivity & { seq: number }) | null>(null);
  /** The resources drawer's section, null while closed. */
  const [resourceView, setResourceView] = useState<ResourceView | null>(null);
  /** Publish was pressed with open fields. */
  const [blockedOpen, setBlockedOpen] = useState(false);
  /** The version history pop up (M110). */
  const [historyOpen, setHistoryOpen] = useState(false);
  const dismissActivity = useCallback(() => setActivity(null), []);

  /**
   * An agent wrote to this draft while the page was open. With nothing
   * unsaved here the page takes the latest draft and carries on. With
   * unsaved typing it leaves the page alone; the next save is refused and
   * the stale notice explains.
   */
  const pullLatest = useCallback(async () => {
    if (saveState === "saving" || saveState === "error") return;
    try {
      const res = await fetch(`/api/ideation/projects/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const { row } = (await res.json()) as { row: { draft_doc: ProjectDoc; agent_rev?: number } };
      if (typeof row.agent_rev !== "number" || row.agent_rev === rev.current) return;
      adopt(row.agent_rev);
      setHeldRev(row.agent_rev);
      setDoc(row.draft_doc);
    } catch {
      // The next poll tries again.
    }
  }, [id, saveState, adopt, rev, setDoc]);

  const agent = useAgentChanges({
    projectId: id,
    doc,
    rev: heldRev,
    onApply: setDoc,
    onRemoteChange: pullLatest,
    onActivity: (a) => setActivity({ ...a, seq: Date.now() }),
  });

  const problems = useMemo(() => projectProblems(doc), [doc]);
  const tabDots = useMemo(() => tabProblems(problems), [problems]);
  const kit = doc.kit;
  const kitIds = kitsForDoc(doc);
  const hasKit = Boolean(kit?.shape);
  const patchKit = (partial: Partial<ProjectKit>) =>
    patch({ kit: { ...(kit ?? emptyProjectKit(kitIds)), ...partial } });

  // The command menu's "Go to <tab>" entries (M87).
  useEffect(() => {
    const C = STUDIO_COPY.command;
    return registerCommands(
      "project-build-tabs",
      BUILD_TABS.map((t) => ({
        id: `tab:${t}`,
        label: C.step(BUILD_COPY.tabs[t]),
        group: C.groups.project,
        keywords: "tab",
        run: () => setTab(t),
      })),
    );
  }, [setTab]);

  const session = agent.state?.session ?? null;
  const view = session ? sessionView(session) : null;
  const agentLine =
    view === "working"
      ? BUILD_COPY.agent.working
      : view === "awaiting_input"
        ? BUILD_COPY.agent.waiting
        : session || agent.state?.changes.length
          ? BUILD_COPY.agent.connected
          : BUILD_COPY.agent.connect;

  const published =
    publishStatus.kind === "published" || (initialStatus === "published" && publishStatus.kind !== "unpublished");
  // The deployer key's balances, polled while the page is open (M103).
  const deployer = deployerView(doc, projectChainOf(doc));
  const funding = useDeployerBalances(id, deployer?.address ?? null);
  const facts = {
    deployerFunded: funding.fundedOn(projectChainOf(doc)),
    published,
    hasTestnetContracts: testnetContractRows(doc).some((c) => c.address.trim().length > 0),
    hasToken,
    hasMainnet: mainnetView(doc) !== null,
  };

  const body: Record<BuildTab, React.ReactNode> = {
    overview: (
      <OverviewTab
        id={id}
        doc={doc}
        kit={kit}
        hasKit={hasKit}
        agent={agent}
        paused={stale}
        onPatchKit={patchKit}
        onOpenResources={() => setResourceView("pack")}
        deployer={deployer}
        funding={funding}
        onGoDeployments={() => setTab("deployments")}
        onGoMilestone={setMilestone}
        linkPanel={linkPanel}
      />
    ),
    build: (
      <BuildTabView
        kit={kit}
        chain={projectChainOf(doc)}
        facts={facts}
        milestone={milestone}
        onMilestone={setMilestone}
        onPatchKit={patchKit}
        onGoTab={setTab}
      />
    ),
    decisions: (
      <DecisionsTab doc={doc} patch={patch} patchSection={patchSection} chainLocked={chainLocked} earlier={agent.earlier} />
    ),
    deployments: <DeploymentsTab id={id} doc={doc} patch={patch} setDoc={setDoc} tokens={tokens} funding={funding} />,
    publish: (
      <PublishTab
        id={id}
        doc={doc}
        patch={patch}
        problems={problems}
        linkedLaunchTarget={linkedLaunchTarget}
        onGoTab={setTab}
        visibility={visibility}
        onVisibility={setVisibility}
        privateUsed={privateUsed}
        isPrivatePublished={initialVisibility === "private" && initialStatus === "published"}
      />
    ),
  };

  const slug = publishStatus.kind === "published" ? publishStatus.slug : initialSlug;
  // The share token and the published visibility follow the last publish (M109).
  const shareToken = publishStatus.kind === "published" ? (publishStatus.shareToken ?? initialShareToken) : initialShareToken;
  const publishedVisibility = publishStatus.kind === "published" ? (publishStatus.visibility ?? initialVisibility) : initialVisibility;
  const publicHref = published && slug ? (publishedVisibility === "private" && shareToken ? `/p/${slug}?s=${shareToken}` : `/p/${slug}`) : null;

  return (
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-r lg:border-ink-700/40">
        <BuildSidebar
          name={doc.name}
          logo={doc.logo ?? null}
          tab={tab}
          milestone={milestone}
          problems={tabDots}
          publicHref={publicHref}
          onTab={setTab}
          onMilestone={setMilestone}
          onResource={setResourceView}
          onHistory={() => setHistoryOpen(true)}
        />
      </aside>
      <div className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <BuildHeader
        id={id}
        name={doc.name}
        logo={doc.logo ?? null}
        agentLine={agentLine}
        initialStatus={initialStatus}
        initialSlug={initialSlug}
        publicHref={publicHref}
        privatePublished={publishedVisibility === "private"}
        publishStatus={publishStatus}
        canPublish={problems.overall === null}
        onPublish={() => void publish(visibility)}
        onBlocked={() => setBlockedOpen(true)}
        onUnpublish={unpublish}
        headerActions={headerActions}
      />
      <div className="mt-6 lg:hidden">
        <BuildTabs tab={tab} onChange={setTab} problems={tabDots} />
      </div>
      {stale ? (
        <div className="mt-6">
          <StaleDraftNotice />
        </div>
      ) : null}
      {/* The save state sits with the section being edited, not in the header (2026-10-19). */}
      <div className="mt-6 flex h-7 max-w-3xl items-center justify-end">
        <AutosaveIndicator state={saveState} />
      </div>
      <div className="mt-1">{body[tab]}</div>
      <PublishBlockedDialog open={blockedOpen} onClose={() => setBlockedOpen(false)} problems={problems} onGoTab={setTab} />
      <HistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} projectId={id} />
      {activity ? <AgentActivityToast key={activity.seq} activity={activity} onDismiss={dismissActivity} /> : null}
      </div>
      <ResourcesDrawer
        view={resourceView}
        onClose={() => setResourceView(null)}
        doc={doc}
        kit={kit}
        chain={projectChainOf(doc)}
        onPatchKit={patchKit}
      />
    </div>
  );
}
