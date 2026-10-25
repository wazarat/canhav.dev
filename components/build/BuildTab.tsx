"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";

import { ReviewPassRow } from "@/components/build/ReviewPassRow";
import { SendToAgent } from "@/components/build/SendToAgent";
import type { AgentChangeRow } from "@/components/build/useAgentChanges";
import { stepPrompt } from "@/lib/agent-prompts";
import { type AgentRequest, agentRequestsFull, findAgentRequest, withAgentRequest, withoutAgentRequest, withoutStepRequests } from "@/lib/agent-requests";
import type { AgentWriteMode, BuildStepsPatch } from "@/lib/agent-writes";
import { type CheckRunView, latestFor } from "@/lib/checks/schema";
import { type StepSend, StepRow } from "@/components/build/StepRow";
import { FeaturesBlock } from "@/components/ideation/kit/FeaturesBlock";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { Select, optionClasses } from "@/components/ui/Select";
import { StatusChip } from "@/components/ui/StatusChip";
import { TAB_WIDTH } from "@/components/build/layout";
import { type LaunchFacts, launchRows as launchRowsOf } from "@/components/build/launch-rows";
import { MetaLine, ProgressBar } from "@/components/ui/MetaLine";
import { usePlan } from "@/components/studio/PlanContext";
import { BUILD_COPY, type BuildTab as BuildTabName } from "@/content/build";
import { removedGroupsFor, sectionsFor } from "@/content/kits/checklists";
import { CHECKLIST_COPY, REVIEW_COPY, shapeLabel } from "@/content/kits/copy";
import { featuresFor } from "@/content/kits/features";
import { REVIEW_PASSES } from "@/content/kits/review-passes";
import { MILESTONES, type Milestone, groupsByMilestone, nowSteps } from "@/lib/build-milestones";
import type { ProjectChain } from "@/lib/chains";
import type { ProjectDoc } from "@/lib/ideation";
import {
  KIT_LIMITS,
  type ProductShape,
  type ProjectKit,
  type StepGroup,
  addCustomStep,
  groupProgress,
  groupState,
  kitShapes,
  restoreSteps,
  reviewPassesFor,
  reviewProgress,
} from "@/lib/kits";

/** What the Build tab needs to hand steps to the agent (M152). */
export interface BuildAgent {
  projectId: string;
  projectName: string;
  mode: AgentWriteMode;
  /** An agent has worked on the project (a session row or any change). */
  connected: boolean;
  /** The open requests on the draft and how to change them. */
  requests: AgentRequest[];
  onRequests: (next: AgentRequest[] | undefined) => void;
  /** The agent changes list, to say when an agent ticked a step. */
  changes: AgentChangeRow[];
}

/** When an applied or accepted agent change ticked any id of the group, the newest, else null. */
function doneByAgentAt(group: StepGroup, changes: AgentChangeRow[]): string | null {
  for (const c of changes) {
    if (c.kind !== "build_steps" || (c.status !== "applied" && c.status !== "accepted")) continue;
    const p = (c.appliedPatch ?? c.patch) as Partial<BuildStepsPatch> | null;
    if (p?.done?.some((id) => group.ids.includes(id))) return c.resolvedAt ?? c.createdAt;
  }
  return null;
}

/**
 * The Build tab (M95): every build step of every chosen shape as one list
 * under four milestones, with a shape filter, a milestone filter and a Now
 * view of the next three open steps. Review passes sit under Review, the
 * Launch rows are derived from the record. Features stay reachable per
 * shape behind a fold since they decide which steps appear.
 */
export function BuildTab({
  kit,
  chain,
  facts,
  milestone,
  onMilestone,
  onPatchKit,
  onGoTab,
  checks = [],
  testerKit,
  agent,
}: {
  /** The tester kit block under the Testnet milestone (M125). */
  testerKit?: React.ReactNode;
  /** Send to agent (M152). */
  agent?: BuildAgent;
  kit: ProjectKit | undefined;
  chain: ProjectChain;
  facts: LaunchFacts;
  /** The milestone in view, held in the URL by the page; empty for all. */
  milestone: Milestone | "";
  onMilestone: (m: Milestone | "") => void;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  /** The newest automated check run per tool (M121). */
  checks?: CheckRunView[];
  onGoTab: (tab: BuildTabName) => void;
}) {
  const F = BUILD_COPY.filters;
  const shapes = kitShapes(kit);
  const shapesKey = shapes.join(",");
  const [shape, setShape] = useState<ProductShape | "">("");
  const [view, setView] = useState<"now" | "all">(milestone ? "all" : "now");
  // A shape that left the kit must leave the filter too.
  useEffect(() => setShape(""), [shapesKey]);
  // Picking a milestone (the sidebar, the filter) means seeing every step of it.
  useEffect(() => {
    if (milestone) setView("all");
  }, [milestone]);
  const setMilestone = onMilestone;

  const sections = useMemo(() => sectionsFor(shapes, kit ?? {}), [shapesKey, kit]); // eslint-disable-line react-hooks/exhaustive-deps
  const byMilestone = useMemo(() => groupsByMilestone(sections), [sections]);
  // A step the owner ticked or marked not applicable here answers its own request (M152).
  const requestsDoc = useMemo(() => ({ agentRequests: agent?.requests }), [agent?.requests]);
  useEffect(() => {
    if (!agent || !kit || !agent.requests.some((r) => r.kind === "step")) return;
    const settled = new Set<string>();
    for (const s of sections) for (const g of s.groups) if (groupState(g, kit) === "done" || groupState(g, kit) === "na") settled.add(g.key);
    const left = withoutStepRequests(requestsDoc, settled);
    if ((left?.length ?? 0) !== agent.requests.length) agent.onRequests(left);
  }, [kit, sections, agent, requestsDoc]);
  const sendFor = (g: StepGroup, m: Milestone): StepSend | undefined => {
    if (!agent) return undefined;
    const prompt = stepPrompt(agent.projectName, agent.projectId, { id: g.key, title: g.title, detail: g.detail, milestone: BUILD_COPY.milestones[m].label, resources: g.resources, templates: g.templates });
    return {
      prompt,
      canQueue: agent.connected && agent.mode !== "off",
      full: agentRequestsFull(requestsDoc),
      queuedAt: findAgentRequest(requestsDoc, "step", g.key)?.requestedAt ?? null,
      doneByAgentAt: doneByAgentAt(g, agent.changes),
      onQueue: () => agent.onRequests(withAgentRequest(requestsDoc, "step", g.key)),
      onCancel: () => agent.onRequests(withoutAgentRequest(requestsDoc, "step", g.key)),
    };
  };
  const passes = useMemo(() => reviewPassesFor(REVIEW_PASSES, shapes), [shapesKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const removed = useMemo(() => [...removedGroupsFor(kit).values()].flat(), [kit]);

  if (!kit?.shape) {
    return (
      <div className={`${TAB_WIDTH} space-y-3`}>
        <p className="text-sm text-ink-400">{BUILD_COPY.overview.noShape}</p>
        <Button size="sm" variant="outline" onClick={() => onGoTab("decisions")}>
          {BUILD_COPY.publish.openIn(BUILD_COPY.tabs.decisions)} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  const keep = (g: StepGroup) => !shape || g.shapes.includes(shape);
  const filtered: Record<Milestone, StepGroup[]> = {
    design: byMilestone.design.filter(keep),
    testnet: byMilestone.testnet.filter(keep),
    review: byMilestone.review.filter(keep),
    launch: [],
  };
  const now = view === "now" ? nowSteps(filtered, kit, 3) : null;
  const visible = MILESTONES.filter((m) => !milestone || m === milestone);
  const total = MILESTONES.reduce((n, m) => n + filtered[m].length, 0);

  return (
    <div className={`${TAB_WIDTH} space-y-6`}>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          size="sm"
          ariaLabel={F.now}
          value={view}
          onChange={setView}
          options={[
            { value: "now", label: F.now },
            { value: "all", label: F.all },
          ]}
        />
        {shapes.length > 1 ? (
          <Segmented<ProductShape | "">
            size="sm"
            ariaLabel={F.everyShape}
            value={shape}
            onChange={setShape}
            options={[{ value: "", label: F.everyShape }, ...shapes.map((s) => ({ value: s, label: shapeLabel(s) ?? s }))]}
          />
        ) : null}
      </div>

      {shapes.map((s) => {
        const features = featuresFor([s]);
        if (!features.length) return null;
        return (
          <Collapsible key={s} summary={`${CHECKLIST_COPY.featuresTitle} · ${shapeLabel(s) ?? s}`}>
            <FeaturesBlock shape={s} features={features} kit={kit} onPatchKit={onPatchKit} />
          </Collapsible>
        );
      })}

      {/* The milestone row sits right above the sections it filters (M152, F9); the view and shape rows stay at the top. */}
      {view === "all" ? (
        <Segmented<Milestone | "">
          size="sm"
          ariaLabel={F.everyMilestone}
          value={milestone}
          onChange={setMilestone}
          options={[
            { value: "", label: F.everyMilestone },
            ...MILESTONES.map((m) => ({ value: m, label: BUILD_COPY.milestones[m].label })),
          ]}
        />
      ) : null}

      {now ? (
        <Card>
          <CardSection>
            <h2 className="font-display text-base font-semibold text-ink-50">{F.now}</h2>
            {now.length === 0 ? (
              <p className="mt-2 text-sm text-ink-400">{total === 0 ? F.emptyFiltered : F.empty}</p>
            ) : (
              <ul className="mt-2">
                {now.map((g) => (
                  <StepRow key={g.key} group={g} kit={kit} chain={chain} onPatchKit={onPatchKit} send={sendFor(g, MILESTONES.find((m) => filtered[m].includes(g)) ?? "design")} />
                ))}
              </ul>
            )}
          </CardSection>
        </Card>
      ) : (
        visible.map((m) => (
          <MilestoneSection
            key={m}
            milestone={m}
            groups={filtered[m]}
            passes={m === "review" ? passes : []}
            kit={kit}
            chain={chain}
            facts={m === "launch" ? facts : null}
            onPatchKit={onPatchKit}
            onGoTab={onGoTab}
            checks={checks}
            testerKit={m === "testnet" ? testerKit : undefined}
            sendFor={(g) => sendFor(g, m)}
            sendOpen={
              agent && m !== "launch"
                ? (() => {
                    const open = filtered[m].filter((g) => groupState(g, kit) !== "done" && groupState(g, kit) !== "na");
                    if (!open.length) return null;
                    const prompt = open.map((g) => sendFor(g, m)!.prompt).join("\n\n---\n\n");
                    return {
                      count: open.length,
                      prompt,
                      canQueue: agent.connected && agent.mode !== "off",
                      full: agentRequestsFull(requestsDoc),
                      onQueue: () => {
                        let next: { agentRequests?: AgentRequest[] } = requestsDoc;
                        for (const g of open) next = { agentRequests: withAgentRequest(next, "step", g.key) };
                        agent.onRequests(next.agentRequests);
                      },
                    };
                  })()
                : null
            }
          />
        ))
      )}

      <AddStepRow kit={kit} shapes={shapes} onPatchKit={onPatchKit} />
      {removed.length ? (
        <Collapsible summary={BUILD_COPY.row.removed(removed.length)}>
          <p className="text-xs leading-relaxed text-ink-500">{CHECKLIST_COPY.removedHint}</p>
          <ul className="mt-2 space-y-1.5">
            {removed.map((g) => (
              <li key={g.key} className="flex items-start justify-between gap-3 text-xs text-ink-400">
                <span className="min-w-0">{g.title}</span>
                <button
                  type="button"
                  onClick={() => onPatchKit(restoreSteps(kit, g.ids))}
                  className="shrink-0 text-electric-300 transition-colors hover:text-electric-200"
                >
                  {BUILD_COPY.row.restore}
                </button>
              </li>
            ))}
          </ul>
        </Collapsible>
      ) : null}
    </div>
  );
}

/** One milestone: heading, blurb, progress, its rows. */
function MilestoneSection({
  milestone,
  groups,
  passes,
  kit,
  chain,
  facts,
  onPatchKit,
  onGoTab,
  checks = [],
  testerKit,
  sendFor,
  sendOpen,
}: {
  testerKit?: React.ReactNode;
  /** Send to agent per row and for the whole milestone (M152). */
  sendFor?: (g: StepGroup) => StepSend | undefined;
  sendOpen?: { count: number; prompt: string; canQueue: boolean; full: boolean; onQueue: () => void } | null;
  milestone: Milestone;
  groups: StepGroup[];
  passes: ReturnType<typeof reviewPassesFor>;
  kit: ProjectKit;
  chain: ProjectChain;
  facts: LaunchFacts | null;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  /** The newest automated check run per tool (M121). */
  checks?: CheckRunView[];
  onGoTab: (tab: BuildTabName) => void;
}) {
  // The tester kit is Studio+ work, shown for a Studio+ session only (M136).
  const paid = usePlan().plan === "studio_plus";
  const M = BUILD_COPY.milestones[milestone];
  const progress = groupProgress(groups, kit);
  const review = passes.length ? reviewProgress(passes, kit) : null;
  const launchRows = facts ? launchRowsOf(facts) : [];
  const launchDone = launchRows.filter((r) => r.done).length;
  return (
    <Card>
      <CardSection>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-base font-semibold text-ink-50">{M.label}</h2>
            {sendOpen ? (
              <SendToAgent
                label={BUILD_COPY.row.sendOpen(M.label)}
                queueLabel={BUILD_COPY.row.queueOpen(sendOpen.count)}
                copyLabel={BUILD_COPY.row.copyOpenPrompt}
                prompt={sendOpen.prompt}
                canQueue={sendOpen.canQueue}
                full={sendOpen.full}
                onQueue={sendOpen.onQueue}
              />
            ) : null}
          </div>
          <MetaLine
            items={[
              groups.length ? (
                <>
                  <ProgressBar done={progress.done} total={progress.total} />
                  {CHECKLIST_COPY.progress(progress.done, progress.total)}
                </>
              ) : null,
              review ? REVIEW_COPY.summary(review) : null,
              facts ? CHECKLIST_COPY.progress(launchDone, launchRows.length) : null,
            ]}
          />
        </div>
        <p className="max-w-3xl mt-1 text-xs leading-relaxed text-ink-400">{M.blurb}</p>
      </CardSection>
      <CardSection className="py-2">
        {groups.length === 0 && passes.length === 0 && launchRows.length === 0 ? (
          <p className="py-2 text-xs text-ink-500">{BUILD_COPY.filters.emptyFiltered}</p>
        ) : (
          <ul>
            {passes.map((p) => (
              <ReviewPassRow key={p.id} pass={p} kit={kit} onPatchKit={onPatchKit} run={latestFor(p.id, checks)} />
            ))}
            {groups.map((g) => (
              <StepRow key={g.key} group={g} kit={kit} chain={chain} onPatchKit={onPatchKit} send={sendFor?.(g)} />
            ))}
            {launchRows.map((r) => (
              <li key={r.key} className="flex items-start gap-3 border-t border-ink-800/60 py-3 first:border-t-0">
                <StatusChip tone={r.done ? "success" : "neutral"} className="shrink-0 px-2 py-0.5 text-[11px]">
                  {r.done ? BUILD_COPY.status.done : BUILD_COPY.status.todo}
                </StatusChip>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className={r.done ? "text-sm text-ink-400 line-through decoration-ink-600" : "text-sm text-ink-50"}>{r.title}</p>
                  <p className="max-w-3xl text-xs leading-relaxed text-ink-400">{r.detail}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onGoTab(r.tab)}>
                  {BUILD_COPY.publish.openIn(BUILD_COPY.tabs[r.tab])} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardSection>
      {testerKit && paid ? (
        <CardSection className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-ink-50">{BUILD_COPY.tester.title}</h3>
          {testerKit}
        </CardSection>
      ) : null}
    </Card>
  );
}

/** Add a step under one of the project's shapes (M50), as one row. */
function AddStepRow({
  kit,
  shapes,
  onPatchKit,
}: {
  kit: ProjectKit;
  shapes: ProductShape[];
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const R = BUILD_COPY.row;
  const L = KIT_LIMITS.customSteps;
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [shape, setShape] = useState<ProductShape>(shapes[0]);
  const full = (kit.customSteps?.length ?? 0) >= L.max;
  const canAdd = title.trim().length >= L.titleMin && !full;
  const add = () => {
    if (!canAdd) return;
    onPatchKit(addCustomStep(kit, shape, title, detail));
    setTitle("");
    setDetail("");
  };
  return (
    <Collapsible summary={R.addStep}>
      <div className="space-y-2">
        {full ? <p className="text-xs text-ink-500">{CHECKLIST_COPY.addLimit(L.max)}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Input
            value={title}
            maxLength={L.titleMax}
            disabled={full}
            placeholder={R.addStepTitle}
            aria-label={R.addStepTitle}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            className="min-w-[14rem] flex-1"
          />
          {shapes.length > 1 ? (
            <Select value={shape} aria-label={R.addStepShape} onChange={(e) => setShape(e.target.value as ProductShape)} className="max-w-[12rem]">
              {shapes.map((s) => (
                <option key={s} value={s} className={optionClasses}>
                  {shapeLabel(s) ?? s}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
        <Input
          value={detail}
          maxLength={L.detailMax}
          disabled={full}
          placeholder={R.addStepDetail}
          aria-label={R.addStepDetail}
          onChange={(e) => setDetail(e.target.value)}
        />
        <Button size="sm" variant="outline" disabled={!canAdd} onClick={add}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> {R.add}
        </Button>
      </div>
    </Collapsible>
  );
}
