"use client";

import { useState } from "react";
import { ListChecks, Pencil } from "lucide-react";

import { AgentFeed } from "@/components/build/AgentFeed";
import { deployerState } from "@/components/build/deployer-state";
import { ProgressDialog } from "@/components/build/ProgressDialog";
import { SummaryDialog } from "@/components/build/SummaryDialog";
import { WeeklyUpdateCard } from "@/components/build/WeeklyUpdateCard";
import { TAB_WIDTH } from "@/components/build/layout";
import { usePlan } from "@/components/studio/PlanContext";
import { useProjectPlan } from "@/components/studio/ProjectPlanContext";
import { ResourcesLine } from "@/components/build/ResourcesLine";
import { TextField } from "@/components/ideation/TextField";
import type { AgentChangesHandle } from "@/components/build/useAgentChanges";
import type { DeployerFunding } from "@/components/build/useDeployerBalances";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { MetaLine, ProgressBar } from "@/components/ui/MetaLine";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import { STAGE_OPTIONS, optionLabel } from "@/content/ideation";
import { shapeLabels } from "@/content/kits/copy";
import { buildProgress } from "@/content/kits/checklists";
import { chainInfo, projectChainOf } from "@/lib/chains";
import type { DeployerView } from "@/lib/deployer";
import { PROJECT_LIMITS, type ProjectDoc } from "@/lib/ideation";
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
  const { label, tone } = deployerState(deployer, funding);
  return (
    <StatusChip tone={tone} onClick={onClick}>
      {label}
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
  /** The description being edited in place, null while it is read (owner feedback 2026-10-25). */
  const [editing, setEditing] = useState<string | null>(null);
  const O = BUILD_COPY.overview.description;
  const shapes = shapeLabels(kit);
  const line = oneLine(doc.whatItDoes);
  // Studio+ surfaces show for a Studio+ session only (M136); a free account gets one sentence.
  const paid = usePlan().plan === "studio_plus";
  const projectPlan = useProjectPlan();
  return (
    <div className={`${TAB_WIDTH} space-y-6`}>
      <Card>
        <CardSection className="space-y-3">
          {/* What it does, edited in place (owner feedback 2026-10-25); the full field is also on Publish. */}
          {editing !== null ? (
            <div className="max-w-3xl space-y-3">
              <TextField
                label={O.editLabel}
                required
                value={editing}
                onChange={setEditing}
                min={PROJECT_LIMITS.whatItDoes.min}
                max={PROJECT_LIMITS.whatItDoes.max}
                rows={5}
                placeholder={O.editPlaceholder}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={editing.trim().length < PROJECT_LIMITS.whatItDoes.min}
                  onClick={() => {
                    patch({ whatItDoes: editing.trim() });
                    setEditing(null);
                  }}
                >
                  {O.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  {O.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              {line ? <p className="max-w-3xl text-sm leading-relaxed text-ink-200">{line}</p> : <p className="text-sm text-ink-500">{O.empty}</p>}
              <Button size="sm" variant="ghost" className="shrink-0" onClick={() => setEditing(doc.whatItDoes)}>
                <Pencil aria-hidden className="h-3.5 w-3.5" /> {O.edit}
              </Button>
            </div>
          )}
          {/* The rail carries these facts on wide screens (M173). */}
          <MetaLine
            className="2xl:hidden"
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

      {paid && projectPlan.plus && projectPlan.orgId && !doc.teamSafe ? (
        <p className="flex flex-wrap items-center gap-x-1 text-xs text-ink-400">
          <span>{BUILD_COPY.deployments.teamSafe.overview}</span>
          <InfoTip title={BUILD_COPY.deployments.teamSafe.explainLabel} label={BUILD_COPY.deployments.teamSafe.explainLabel}>{BUILD_COPY.deployments.teamSafe.explain}</InfoTip>
          <button type="button" onClick={onGoDeployments} className="ml-1 text-ink-200 hover:underline">
            {BUILD_COPY.tabs.deployments}
          </button>
        </p>
      ) : null}
      {paid ? <WeeklyUpdateCard projectId={id} name={doc.name} doc={doc} patch={patch} agentMode={agent.state?.mode ?? "propose"} /> : null}

      <Card>
        <CardSection>
          <AgentFeed agent={agent} doc={doc} paused={paused} />
        </CardSection>
      </Card>

      {linkPanel}
      <SummaryDialog open={summaryOpen} onClose={() => setSummaryOpen(false)} name={doc.name} projectId={id} summary={doc.summary ?? null} />
      <ProgressDialog open={progressOpen} onClose={() => setProgressOpen(false)} name={doc.name} projectId={id} kit={kit} onMilestone={onGoMilestone} />
    </div>
  );
}
