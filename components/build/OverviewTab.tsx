"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";

import { AgentFeed } from "@/components/build/AgentFeed";
import { ProgressDialog } from "@/components/build/ProgressDialog";
import { SummaryDialog } from "@/components/build/SummaryDialog";
import { WeeklyUpdateCard } from "@/components/build/WeeklyUpdateCard";
import { TAB_WIDTH } from "@/components/build/layout";
import { usePlan } from "@/components/studio/PlanContext";
import { PlusLine } from "@/components/studio/PlusLine";
import { ResourcesLine } from "@/components/build/ResourcesLine";
import type { AgentChangesHandle } from "@/components/build/useAgentChanges";
import type { DeployerFunding } from "@/components/build/useDeployerBalances";
import { McpConnectCard } from "@/components/launch/McpConnectCard";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { MetaLine, ProgressBar } from "@/components/ui/MetaLine";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import { STAGE_OPTIONS, optionLabel } from "@/content/ideation";
import { shapeLabels } from "@/content/kits/copy";
import { buildProgress } from "@/content/kits/checklists";
import { chainInfo, projectChainOf } from "@/lib/chains";
import type { DeployerView } from "@/lib/deployer";
import type { ProjectDoc } from "@/lib/ideation";
import type { ProjectKit } from "@/lib/kits";

const ONE_LINE = 140;

/** Whether the deployer key is funded, in one chip that opens Deployments (M103). */
function DeployerChip({
  deployer,
  funding,
  onClick,
}: {
  deployer: DeployerView | null;
  funding: DeployerFunding;
  onClick: () => void;
}) {
  const C = BUILD_COPY.deployments.deployer;
  if (!deployer) {
    return (
      <StatusChip tone="neutral" onClick={onClick}>
        {C.chipNone}
      </StatusChip>
    );
  }
  if (funding.balances === null) {
    return (
      <StatusChip tone="neutral" onClick={onClick}>
        {funding.loading ? C.chipChecking : C.chipEmpty}
      </StatusChip>
    );
  }
  const names = deployer.chains.filter((c) => funding.fundedOn(c.chain)).map((c) => c.name);
  return names.length ? (
    <StatusChip tone="success" onClick={onClick}>
      {C.chipFunded(names)}
    </StatusChip>
  ) : (
    <StatusChip tone="warning" onClick={onClick}>
      {C.chipEmpty}
    </StatusChip>
  );
}

function oneLine(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= ONE_LINE) return t;
  return `${t.slice(0, ONE_LINE).replace(/\s+\S*$/, "")}…`;
}

/**
 * The Overview tab (M94): what the project is in one strip, the agent
 * (session, mode, proposals), how to connect one, the resource pack
 * behind a line, then the token design and launch panels the page passes
 * in.
 */
export function OverviewTab({
  id,
  doc,
  kit,
  hasKit,
  agent,
  paused,
  onPatchKit,
  onOpenResources,
  patch,
  deployer,
  funding,
  onGoDeployments,
  onGoMilestone,
  linkPanel,
}: {
  id: string;
  doc: ProjectDoc;
  kit: ProjectKit | undefined;
  hasKit: boolean;
  agent: AgentChangesHandle;
  paused: boolean;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  /** Opens the resources drawer on the pack. */
  onOpenResources: () => void;
  /** Writes the draft, for the team update's draft request (M124). */
  patch: (p: Partial<ProjectDoc>) => void;
  /** The deployer key and its balances (M103). */
  deployer: DeployerView | null;
  funding: DeployerFunding;
  onGoDeployments: () => void;
  /** Opens the Build section on one milestone (the progress pop up, M104). */
  onGoMilestone: (m: import("@/lib/build-milestones").Milestone) => void;
  /** The token design link, the launch panel and the MCP card, rendered by the server page. */
  linkPanel?: React.ReactNode;
}) {
  const chain = chainInfo(projectChainOf(doc));
  const progress = buildProgress(kit);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const shapes = shapeLabels(kit);
  const line = oneLine(doc.whatItDoes);
  // Studio+ surfaces show for a Studio+ session only (M136); a free account gets one sentence.
  const paid = usePlan().plan === "studio_plus";
  return (
    <div className={`${TAB_WIDTH} space-y-6`}>
      <Card>
        <CardSection className="space-y-3">
          {line ? <p className="text-sm leading-relaxed text-ink-200">{line}</p> : null}
          <MetaLine
            items={[
              shapes.length ? shapes.join(" and ") : null,
              chain.short,
              doc.stage ? optionLabel(STAGE_OPTIONS, doc.stage) : null,
              progress.total ? (
                <>
                  <ProgressBar done={progress.done} total={progress.total} />
                  <StatusChip tone={progress.done === progress.total ? "success" : "neutral"} onClick={() => setProgressOpen(true)}>
                    {BUILD_COPY.overview.progress(progress.done, progress.total)}
                  </StatusChip>
                </>
              ) : null,
              <DeployerChip key="deployer" deployer={deployer} funding={funding} onClick={onGoDeployments} />,
            ]}
          />
          {!kit?.shape ? <p className="text-xs text-ink-500">{BUILD_COPY.overview.noShape}</p> : null}
          <PlusLine />
          <div>
            <Button size="sm" variant="outline" onClick={() => setSummaryOpen(true)}>
              <ListChecks aria-hidden className="h-3.5 w-3.5" /> {BUILD_COPY.overview.summary.button}
            </Button>
          </div>
        </CardSection>
        {kit?.shape ? (
          <CardSection>
            <ResourcesLine doc={doc} kit={kit} onOpen={onOpenResources} />
          </CardSection>
        ) : null}
      </Card>

      {paid ? <WeeklyUpdateCard projectId={id} name={doc.name} doc={doc} patch={patch} agentMode={agent.state?.mode ?? "propose"} /> : null}

      <Card>
        <CardSection>
          <AgentFeed agent={agent} doc={doc} paused={paused} />
        </CardSection>
      </Card>

      <McpConnectCard compact target={{ kind: "project", id, name: doc.name, hasKit }} />

      {linkPanel}
      <SummaryDialog open={summaryOpen} onClose={() => setSummaryOpen(false)} name={doc.name} projectId={id} summary={doc.summary ?? null} />
      <ProgressDialog open={progressOpen} onClose={() => setProgressOpen(false)} name={doc.name} projectId={id} kit={kit} onMilestone={onGoMilestone} />
    </div>
  );
}
