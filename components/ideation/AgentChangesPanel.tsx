"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { Input, inputClasses } from "@/components/ui/Input";
import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { AGENT_COPY } from "@/content/ideation";
import { AgentSessionCard } from "@/components/ideation/AgentSessionCard";
import { type AgentChangeRow, useAgentChanges } from "@/components/build/useAgentChanges";
import {
  type AgentActivity,
  type AgentChangeStatus,
  type BuildStepsPatch,
  type ChangeLine,
  type LeafSpec,
  buildStepKeys,
  buildStepsPatchSchema,
  changeLines,
  leafSpec,
  pathLabel,
  projectPatchSchema,
  tokenDesignPatchSchema,
} from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";
import { cn } from "@/lib/utils";

type Row = AgentChangeRow;

/** The owner's per-card decision (M44): unticked lines and edited values. */
interface CardDecision {
  dropped: Set<string>;
  edits: Record<string, unknown>;
}

const STATUS_TONE: Record<AgentChangeStatus, StatusTone> = {
  proposed: "info",
  applied: "success",
  accepted: "success",
  rejected: "neutral",
  withdrawn: "neutral",
};

/**
 * The owner's side of agent writes, on the project editor. Picks the mode,
 * lists proposals with the draft's current value beside the agent's, and
 * keeps a history of what agents wrote.
 *
 * The poll, the mode switch and accept or reject live in useAgentChanges
 * (M93), shared with the BUILD page. This panel keeps the per line editing
 * (M44): each pending line has a checkbox and, for a plain value, an inline
 * editor, and the decided patch goes to the hook, which re-validates it
 * through the same schema the agent's input passed and merges it into the
 * editor's own copy for a project change (so typing in progress is kept and
 * autosave stores both) or has the server write a token design change.
 */
export function AgentChangesPanel({
  projectId,
  doc,
  rev,
  paused,
  onApply,
  onRemoteChange,
  onActivity,
}: {
  projectId: string;
  doc: ProjectDoc;
  /** The agent revision the editor holds. Undefined before the database update. */
  rev: number | undefined;
  /** Saving is paused on a stale draft, so nothing can be accepted into it. */
  paused: boolean;
  onApply: (next: ProjectDoc) => void;
  /** An agent wrote to the project draft after the editor loaded. */
  onRemoteChange: (rev: number) => void;
  /** New rows since the last poll, or what is waiting on the first load (M79). */
  onActivity?: (activity: AgentActivity) => void;
}) {
  const agent = useAgentChanges({ projectId, doc, rev, onApply, onRemoteChange, onActivity });
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, CardDecision>>({});

  if (!agent.state) return null;
  const state = agent.state;

  const decisionOf = (id: string): CardDecision => decisions[id] ?? { dropped: new Set(), edits: {} };
  const setDecision = (id: string, next: CardDecision) => setDecisions((d) => ({ ...d, [id]: next }));

  async function decide(change: Row, action: "accept" | "reject") {
    setCardErrors((e) => ({ ...e, [change.id]: "" }));
    const message = action === "accept" ? await agent.accept(change, decisionOf(change.id)) : await agent.reject(change);
    if (message) setCardErrors((e) => ({ ...e, [change.id]: message }));
  }

  const { pending, earlier, working, error, notice } = agent;

  return (
    <section
      id={AGENT_COPY.anchor}
      className="glass mt-10 scroll-mt-24 max-w-2xl rounded-xl border border-ink-800/70 p-5"
      aria-label={AGENT_COPY.title}
    >
      <h3 className="text-sm font-medium text-ink-100">{AGENT_COPY.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{AGENT_COPY.body}</p>

      {!state.available ? (
        <StatusChip tone="neutral" variant="block" className="mt-4">
          {AGENT_COPY.unavailable}
        </StatusChip>
      ) : (
        <>
          <div className="mt-4">
            <AgentSessionCard session={state.session ?? null} />
          </div>
          <div className="mt-4">
            <ChipRadioGroup
              label={AGENT_COPY.modeLabel}
              hint={AGENT_COPY.modeHints[state.mode]}
              value={state.mode}
              onChange={(m) => void agent.setMode(m)}
              options={AGENT_COPY.modes}
            />
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-xs font-medium text-ink-200">
              {AGENT_COPY.pending}
              {pending.length ? <span className="ml-1.5 text-ink-400">{pending.length}</span> : null}
            </p>
            {pending.length === 0 ? (
              <p className="text-xs text-ink-500">{AGENT_COPY.nonePending}</p>
            ) : (
              pending.map((change) => (
                <PendingCard
                  key={change.id}
                  change={change}
                  // The live draft, so "was" reflects typing since the last save.
                  lines={
                    change.target === "project" && change.kind === "fields"
                      ? changeLines(doc, change.patch)
                      : change.lines
                  }
                  decision={decisionOf(change.id)}
                  onDecision={(d) => setDecision(change.id, d)}
                  working={working === change.id}
                  disabled={working !== null}
                  paused={paused}
                  error={cardErrors[change.id] || null}
                  hint={change.dependsOnEarlier ? AGENT_COPY.dependsOnEarlier : null}
                  onAccept={() => decide(change, "accept")}
                  onReject={() => decide(change, "reject")}
                />
              ))
            )}
          </div>

          {earlier.length > 0 ? (
            <details className="mt-5">
              <summary className="cursor-pointer text-xs text-ink-400 transition-colors hover:text-ink-200">
                {AGENT_COPY.history}
                <span className="ml-1.5 text-ink-500">{earlier.length}</span>
              </summary>
              <div className="mt-3 space-y-3">
                {earlier.map((change) => (
                  <HistoryCard key={change.id} change={change} />
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}

      {notice ? (
        <StatusChip tone="success" variant="block" className="mt-4">
          {notice}
        </StatusChip>
      ) : null}
      {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}
    </section>
  );
}

function CardHeader({ change }: { change: Row }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusChip tone={STATUS_TONE[change.status]}>
        {AGENT_COPY.statuses[change.status]}
      </StatusChip>
      <StatusChip tone="neutral">
        {AGENT_COPY.targets[change.target]} · {AGENT_COPY.kinds[change.kind]}
      </StatusChip>
      <span className="text-[11px] text-ink-500">
        {new Date(change.createdAt).toLocaleString("en-US")}
      </span>
    </div>
  );
}

/** A proposal waiting for the owner, decided line by line. */
function PendingCard({
  change,
  lines,
  decision,
  onDecision,
  working,
  disabled,
  paused,
  error,
  hint,
  onAccept,
  onReject,
}: {
  change: Row;
  lines: ChangeLine[];
  decision: CardDecision;
  onDecision: (d: CardDecision) => void;
  working: boolean;
  disabled: boolean;
  paused: boolean;
  error: string | null;
  /** A line under the card, for a proposal that depends on earlier ones (M81). */
  hint?: string | null;
  onAccept: () => void;
  onReject: () => void;
}) {
  const buildSteps = change.kind === "build_steps";
  const schema = change.target === "project" ? projectPatchSchema : tokenDesignPatchSchema;
  const stored =
    buildSteps
      ? buildStepsPatchSchema.safeParse(change.patch).success
      : schema.safeParse(change.patch).success;
  // Build step lines carry the step title as path; the id is what we decide on.
  const ids = buildSteps
    ? (() => {
        const p = buildStepsPatchSchema.safeParse(change.patch);
        return p.success ? buildStepKeys(p.data as BuildStepsPatch) : [];
      })()
    : lines.map((l) => l.path);
  const keyOf = (i: number) => ids[i] ?? lines[i].path;
  const total = lines.length;
  const selected = lines.filter((_, i) => !decision.dropped.has(keyOf(i))).length;
  const editedCount = Object.keys(decision.edits).length;
  const whole = selected === total && editedCount === 0;

  const toggle = (key: string, on: boolean) => {
    const dropped = new Set(decision.dropped);
    if (on) dropped.delete(key);
    else dropped.add(key);
    onDecision({ ...decision, dropped });
  };
  const edit = (key: string, value: unknown, original: unknown) => {
    const edits = { ...decision.edits };
    if (JSON.stringify(value) === JSON.stringify(original)) delete edits[key];
    else edits[key] = value;
    onDecision({ ...decision, edits });
  };

  return (
    <div className="space-y-3 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
      <CardHeader change={change} />
      {change.note ? <p className="text-xs leading-relaxed text-ink-300">{change.note}</p> : null}
      {!stored ? (
        <StatusChip tone="error" variant="block">
          {AGENT_COPY.unparseable}
        </StatusChip>
      ) : (
        <>
          <p className="text-[11px] text-ink-500">{AGENT_COPY.lineHint}</p>
          <div className="space-y-2.5">
            {lines.map((line, i) => {
              const key = keyOf(i);
              const on = !decision.dropped.has(key);
              const original = buildSteps ? undefined : valueOf(change.patch, key);
              const spec: LeafSpec = buildSteps ? { kind: "structured" } : leafSpec(schema, key);
              const value = key in decision.edits ? decision.edits[key] : original;
              return (
                <div key={key} className={cn("flex items-start gap-3", !on && "opacity-60")}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={disabled}
                    onChange={(e) => toggle(key, e.target.checked)}
                    aria-label={buildSteps ? line.path : pathLabel(line.path)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-700 bg-ink-950 accent-electric-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-ink-400">
                      {buildSteps ? line.path : pathLabel(line.path)}
                      {key in decision.edits ? (
                        <span className="ml-1.5 text-signal-400">{AGENT_COPY.edited}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-500">
                      <span>{AGENT_COPY.was} </span>
                      {line.before || AGENT_COPY.empty}
                    </p>
                    {on && spec.kind !== "structured" && spec.kind !== "boolean" ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-ink-500">{AGENT_COPY.now}</span>
                        <LeafEditor
                          spec={spec}
                          value={value}
                          disabled={disabled}
                          onChange={(v) => edit(key, v, original)}
                        />
                      </div>
                    ) : (
                      <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-100">
                        <span className="text-ink-500">{AGENT_COPY.now} </span>
                        {line.after || AGENT_COPY.empty}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {hint ? <p className="text-xs text-ink-400">{hint}</p> : null}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      {selected === 0 && stored ? <p className="text-xs text-ink-500">{AGENT_COPY.nothingSelected}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {stored ? (
          <Button size="sm" disabled={disabled || paused || selected === 0} onClick={onAccept}>
            {working ? AGENT_COPY.busy : whole ? AGENT_COPY.acceptAll : AGENT_COPY.acceptSelected(selected, total)}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" disabled={disabled} onClick={onReject}>
          {AGENT_COPY.rejectAll}
        </Button>
      </div>
    </div>
  );
}

/** The raw value at a dotted path of the stored proposal. */
function valueOf(patch: unknown, path: string): unknown {
  let cur: unknown = patch;
  for (const part of path.split(".")) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

const EDITOR_INPUT = "h-8 min-w-0 flex-1 px-2.5 py-1 text-xs";

function LeafEditor({
  spec,
  value,
  disabled,
  onChange,
}: {
  spec: Exclude<LeafSpec, { kind: "structured" } | { kind: "boolean" }>;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  if (spec.kind === "enum") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClasses, "appearance-none", EDITOR_INPUT)}
      >
        {spec.options.map((o) => (
          <option key={o} value={o} className="bg-ink-950 text-ink-50">
            {enumLabel(o)}
          </option>
        ))}
      </select>
    );
  }
  if (spec.kind === "number") {
    return (
      <Input
        type="number"
        value={typeof value === "number" ? String(value) : ""}
        min={spec.min}
        max={spec.max}
        step={spec.int ? 1 : "any"}
        disabled={disabled}
        onChange={(e) => {
          const n = e.target.value === "" ? Number.NaN : Number(e.target.value);
          onChange(Number.isFinite(n) ? n : value);
        }}
        className={EDITOR_INPUT}
      />
    );
  }
  const text = typeof value === "string" ? value : "";
  if ((spec.max ?? 0) > 200) {
    return (
      <textarea
        value={text}
        maxLength={spec.max}
        rows={3}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClasses, "min-w-0 flex-1 px-2.5 py-1.5 text-xs")}
      />
    );
  }
  return (
    <Input
      value={text}
      maxLength={spec.max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={EDITOR_INPUT}
    />
  );
}

/** "upgradeable_proxy" reads as "Upgradeable proxy". */
function enumLabel(v: string): string {
  const words = v.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A decided change. Dropped lines are struck through, edited ones show both values. */
function HistoryCard({ change }: { change: Row }) {
  const decided = change.status === "accepted" && change.appliedPatch !== null;
  const applied = change.lines.filter((l) => l.applied !== false).length;
  const edited = change.lines.filter((l) => l.edited === true).length;
  return (
    <div className="space-y-3 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
      <CardHeader change={change} />
      {change.note ? <p className="text-xs leading-relaxed text-ink-300">{change.note}</p> : null}
      {decided && change.lines.length ? (
        <p className="text-[11px] text-ink-500">{AGENT_COPY.decision(applied, change.lines.length, edited)}</p>
      ) : null}
      <dl className="space-y-2.5">
        {change.lines.map((line) => {
          const dropped = line.applied === false;
          return (
            <div key={line.path} className={cn(dropped && "opacity-60")}>
              <dt className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-ink-400">
                <span className={cn(dropped && "line-through decoration-ink-600")}>
                  {change.kind === "build_steps" ? line.path : pathLabel(line.path)}
                </span>
                {dropped ? (
                  <StatusChip tone="neutral" className="px-1.5 py-0 text-[10px]">
                    {AGENT_COPY.notApplied}
                  </StatusChip>
                ) : null}
              </dt>
              {line.edited ? (
                <dd className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-500">
                  <span>{AGENT_COPY.proposed} </span>
                  {line.before || AGENT_COPY.empty}
                </dd>
              ) : null}
              <dd
                className={cn(
                  "mt-0.5 whitespace-pre-line text-xs leading-relaxed",
                  dropped ? "text-ink-500 line-through decoration-ink-600" : "text-ink-100",
                )}
              >
                {line.edited ? <span className="text-ink-500">{AGENT_COPY.applied} </span> : null}
                {line.after || AGENT_COPY.empty}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
