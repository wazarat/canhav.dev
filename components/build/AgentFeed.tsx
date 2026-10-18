"use client";

import { AgentSessionCard } from "@/components/ideation/AgentSessionCard";
import type { AgentChangeRow, AgentChangesHandle } from "@/components/build/useAgentChanges";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { Segmented } from "@/components/ui/Segmented";
import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { AGENT_COPY } from "@/content/ideation";
import { type AgentChangeStatus, type ChangeLine, changeLines, pathLabel } from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<AgentChangeStatus, StatusTone> = {
  proposed: "info",
  applied: "success",
  accepted: "success",
  rejected: "neutral",
  withdrawn: "neutral",
};

/**
 * The agent's side of the Overview tab (M94): the session card, the write
 * mode, the proposals waiting with the draft's value beside the agent's,
 * and the earlier changes. A proposal is accepted or rejected whole; the
 * per line editing of the old panel is gone. Keeps the `agent-changes`
 * anchor the studio list and the guide modal link to.
 */
export function AgentFeed({
  agent,
  doc,
  paused,
}: {
  agent: AgentChangesHandle;
  doc: ProjectDoc;
  /** Saving is paused on a stale draft, so nothing can be accepted into it. */
  paused: boolean;
}) {
  const { state, pending, earlier, working, error, notice } = agent;
  return (
    <section id={AGENT_COPY.anchor} className="scroll-mt-24 space-y-4" aria-label={AGENT_COPY.title}>
      <AgentSessionCard session={state?.session ?? null} />
      {state && !state.available ? (
        <StatusChip tone="neutral" variant="block">
          {AGENT_COPY.unavailable}
        </StatusChip>
      ) : state ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-ink-200">{AGENT_COPY.modeLabel}</span>
            <Segmented
              size="sm"
              ariaLabel={AGENT_COPY.modeLabel}
              value={state.mode}
              onChange={(m) => void agent.setMode(m)}
              options={AGENT_COPY.modes}
            />
            <span className="text-xs text-ink-500">{AGENT_COPY.modeHints[state.mode]}</span>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-ink-200">
              {AGENT_COPY.pending}
              {pending.length ? <span className="ml-1.5 text-ink-400">{pending.length}</span> : null}
            </p>
            {pending.length === 0 ? (
              <p className="text-xs text-ink-500">{AGENT_COPY.nonePending}</p>
            ) : (
              pending.map((change) => (
                <ChangeCard
                  key={change.id}
                  change={change}
                  lines={
                    change.target === "project" && change.kind === "fields" ? changeLines(doc, change.patch) : change.lines
                  }
                  footer={
                    <div className="flex flex-wrap items-center gap-2">
                      {change.dependsOnEarlier ? (
                        <span className="text-[11px] text-ink-500">{AGENT_COPY.dependsOnEarlier}</span>
                      ) : null}
                      <Button
                        size="sm"
                        disabled={working !== null || paused || change.dependsOnEarlier === true}
                        aria-busy={working === change.id}
                        onClick={() => void agent.accept(change)}
                      >
                        {AGENT_COPY.acceptAll}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={working !== null} onClick={() => void agent.reject(change)}>
                        {AGENT_COPY.rejectAll}
                      </Button>
                    </div>
                  }
                />
              ))
            )}
          </div>

          {earlier.length > 0 ? (
            <Collapsible
              summary={
                <>
                  {AGENT_COPY.history}
                  <span className="ml-1.5 text-ink-500">{earlier.length}</span>
                </>
              }
            >
              <div className="space-y-3">
                {earlier.map((change) => (
                  <ChangeCard key={change.id} change={change} lines={change.lines} />
                ))}
              </div>
            </Collapsible>
          ) : null}
        </>
      ) : null}
      {notice ? (
        <StatusChip tone="success" variant="block">
          {notice}
        </StatusChip>
      ) : null}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </section>
  );
}

/** One change, waiting or decided: the header chips, the note, each line as was and now. */
function ChangeCard({
  change,
  lines,
  footer,
}: {
  change: AgentChangeRow;
  lines: ChangeLine[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone={STATUS_TONE[change.status]}>{AGENT_COPY.statuses[change.status]}</StatusChip>
        <StatusChip tone="neutral">
          {AGENT_COPY.targets[change.target]} · {AGENT_COPY.kinds[change.kind]}
        </StatusChip>
        <span className="text-[11px] text-ink-500">{new Date(change.createdAt).toLocaleString("en-US")}</span>
      </div>
      {change.note ? <p className="text-xs leading-relaxed text-ink-300">{change.note}</p> : null}
      <dl className="space-y-2.5">
        {lines.map((line) => {
          const dropped = line.applied === false;
          return (
            <div key={line.path} className={cn(dropped && "opacity-60")}>
              <dt className="text-[11px] font-medium text-ink-400">
                <span className={cn(dropped && "line-through decoration-ink-600")}>
                  {change.kind === "build_steps" ? line.path : pathLabel(line.path)}
                </span>
                {dropped ? (
                  <StatusChip tone="neutral" className="ml-1.5 px-1.5 py-0 text-[10px]">
                    {AGENT_COPY.notApplied}
                  </StatusChip>
                ) : null}
              </dt>
              {change.status === "proposed" && line.before !== undefined ? (
                <dd className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-500 line-through decoration-ink-700">
                  {line.before || AGENT_COPY.empty}
                </dd>
              ) : null}
              <dd
                className={cn(
                  "mt-0.5 whitespace-pre-line text-xs leading-relaxed",
                  dropped ? "text-ink-500 line-through decoration-ink-600" : "text-ink-100",
                )}
              >
                {line.after || AGENT_COPY.empty}
              </dd>
            </div>
          );
        })}
      </dl>
      {footer}
    </div>
  );
}
