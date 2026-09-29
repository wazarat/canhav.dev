"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { AGENT_COPY } from "@/content/ideation";
import {
  type AgentChange,
  type AgentChangeStatus,
  type AgentWriteMode,
  type BuildStepsPatch,
  type ChangeLine,
  applyBuildSteps,
  applyProjectPatch,
  buildStepsPatchSchema,
  changeLines,
  pathLabel,
  projectPatchSchema,
} from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";

type Row = AgentChange & { lines: ChangeLine[] };

interface State {
  available: boolean;
  mode: AgentWriteMode;
  rev: number | null;
  changes: Row[];
}

const POLL_MS = 15_000;

const STATUS_TONE: Record<AgentChangeStatus, StatusTone> = {
  proposed: "info",
  applied: "success",
  accepted: "success",
  rejected: "neutral",
};

/**
 * The owner's side of agent writes, on the project editor. Picks the mode,
 * lists proposals with the draft's current value beside the agent's, and
 * keeps a history of what agents wrote.
 *
 * Accepting a project change merges it into the editor's own copy (so typing
 * in progress is kept and autosave stores both). A token design change is
 * written by the server, since that editor is not open here.
 */
export function AgentChangesPanel({
  projectId,
  doc,
  rev,
  paused,
  onApply,
  onRemoteChange,
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
}) {
  const [state, setState] = useState<State | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const base = `/api/ideation/projects/${projectId}/agent`;
  const remote = useRef(onRemoteChange);
  remote.current = onRemoteChange;
  const held = useRef(rev);
  held.current = rev;

  const load = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as State;
      setState(next);
      if (next.rev !== null && held.current !== undefined && next.rev > held.current)
        remote.current(next.rev);
    } catch {
      // A missed poll is fine, the next one catches up.
    }
  }, [base]);

  useEffect(() => {
    const onMode = () => void load();
    window.addEventListener(AGENT_COPY.modeEvent, onMode);
    return () => window.removeEventListener(AGENT_COPY.modeEvent, onMode);
  }, [load]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (!state) return null;

  async function setMode(mode: AgentWriteMode) {
    setError(null);
    const before = state;
    setState((s) => (s ? { ...s, mode } : s));
    try {
      const res = await fetch(base, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setState(before);
      setError(AGENT_COPY.modeFailed);
    }
  }

  /** The project draft with the change merged in, or null when it no longer parses. */
  function merged(change: Row): ProjectDoc | null {
    if (change.kind === "build_steps") {
      const parsed = buildStepsPatchSchema.safeParse(change.patch);
      return parsed.success ? applyBuildSteps(doc, parsed.data as BuildStepsPatch) : null;
    }
    const parsed = projectPatchSchema.safeParse(change.patch);
    return parsed.success ? applyProjectPatch(doc, parsed.data) : null;
  }

  async function decide(change: Row, action: "accept" | "reject") {
    setWorking(change.id);
    setError(null);
    setNotice(null);
    const inEditor = action === "accept" && change.target === "project";
    const next = inEditor ? merged(change) : null;
    try {
      if (inEditor && !next) throw new Error();
      const res = await fetch(`${base}/${change.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, appliedInEditor: inEditor }),
      });
      if (!res.ok) throw new Error();
      if (next) onApply(next);
      if (action === "accept" && change.target === "token_design")
        setNotice(AGENT_COPY.tokenAccepted);
      await load();
    } catch {
      setError(AGENT_COPY.failed);
    } finally {
      setWorking(null);
    }
  }

  const pending = state.changes.filter((c) => c.status === "proposed");
  const earlier = state.changes.filter((c) => c.status !== "proposed");

  return (
    <section
      id={AGENT_COPY.anchor}
      className="glass mt-10 scroll-mt-24 max-w-2xl rounded-2xl border border-ink-800/70 p-5"
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
            <ChipRadioGroup
              label={AGENT_COPY.modeLabel}
              hint={AGENT_COPY.modeHints[state.mode]}
              value={state.mode}
              onChange={setMode}
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
                <ChangeCard
                  key={change.id}
                  change={change}
                  // The live draft, so "was" reflects typing since the last save.
                  lines={
                    change.target === "project" && change.kind === "fields"
                      ? changeLines(doc, change.patch)
                      : change.lines
                  }
                >
                  <Button
                    size="sm"
                    disabled={working !== null || paused}
                    onClick={() => decide(change, "accept")}
                  >
                    {working === change.id ? AGENT_COPY.busy : AGENT_COPY.accept}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={working !== null}
                    onClick={() => decide(change, "reject")}
                  >
                    {AGENT_COPY.reject}
                  </Button>
                </ChangeCard>
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
                  <ChangeCard key={change.id} change={change} lines={change.lines} />
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

function ChangeCard({
  change,
  lines,
  children,
}: {
  change: Row;
  lines: ChangeLine[];
  children?: React.ReactNode;
}) {
  const resolved = change.status !== "proposed";
  return (
    <div className="space-y-3 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
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
      {change.note ? <p className="text-xs leading-relaxed text-ink-300">{change.note}</p> : null}
      <dl className="space-y-2.5">
        {lines.map((line) => (
          <div key={line.path}>
            <dt className="text-[11px] font-medium text-ink-400">
              {change.kind === "build_steps" ? line.path : pathLabel(line.path)}
            </dt>
            {!resolved ? (
              <dd className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-500">
                <span className="text-ink-500">{AGENT_COPY.was} </span>
                {line.before || AGENT_COPY.empty}
              </dd>
            ) : null}
            <dd className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-100">
              {!resolved ? <span className="text-ink-500">{AGENT_COPY.now} </span> : null}
              {line.after || AGENT_COPY.empty}
            </dd>
          </div>
        ))}
      </dl>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
