"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AGENT_COPY } from "@/content/ideation";
import { type AgentSession, sessionEvent } from "@/lib/agent-sessions";
import {
  type AgentActivity,
  type AgentChange,
  type AgentWriteMode,
  type BuildStepsPatch,
  type ChangeLine,
  type Decision,
  type ProjectPatch,
  applyBuildSteps,
  applyProjectPatch,
  buildStepsPatchSchema,
  decidePatch,
  firstIssue,
  newChangeCounts,
  projectPatchProblem,
  projectPatchSchema,
  tokenDesignPatchSchema,
} from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";

/** One row of the agent changes list as the API sends it. */
export type AgentChangeRow = AgentChange & { lines: ChangeLine[]; dependsOnEarlier?: boolean };

export interface AgentChangesState {
  available: boolean;
  mode: AgentWriteMode;
  rev: number | null;
  /** The newest agent session (M86), null before the first report. */
  session?: AgentSession | null;
  changes: AgentChangeRow[];
}

const POLL_MS = 15_000;

/** Nothing dropped, nothing edited. The whole patch as the agent proposed it. */
const AS_PROPOSED: Decision = { dropped: new Set(), edits: {} };

export interface UseAgentChangesOptions {
  projectId: string;
  /** The live draft, so a project change merges into typing in progress. */
  doc: ProjectDoc;
  /** The agent revision the page holds. Undefined before the database update. */
  rev: number | undefined;
  /** An accepted project change, merged into the draft. Autosave stores it. */
  onApply: (next: ProjectDoc) => void;
  /** An agent wrote to the project draft after the page loaded. */
  onRemoteChange: (rev: number) => void;
  /** New rows since the last poll, or what is waiting on the first load (M79). */
  onActivity?: (activity: AgentActivity) => void;
}

export interface AgentChangesHandle {
  /** Null until the first poll answers. */
  state: AgentChangesState | null;
  pending: AgentChangeRow[];
  earlier: AgentChangeRow[];
  /** The id of the change being decided, null when idle. */
  working: string | null;
  /** A failure that is not about one card. */
  error: string | null;
  /** A one line notice after an accepted token design change. */
  notice: string | null;
  setMode: (mode: AgentWriteMode) => Promise<void>;
  /**
   * Accept a proposal. Without a decision the whole patch lands as
   * proposed; the old panel passes its per line decision. Resolves to a
   * message for the card when the patch cannot be accepted, else null.
   */
  accept: (change: AgentChangeRow, decision?: Decision) => Promise<string | null>;
  reject: (change: AgentChangeRow) => Promise<string | null>;
  /** Poll now. */
  reload: () => Promise<void>;
}

/**
 * The owner's side of agent writes (M93): one poll of the project's agent
 * endpoint, the write mode switch and accept or reject. Lifted out of the
 * old editor's panel (removed in M129); AgentFeed on the Studio project page
 * is its one user and hands each decision in here.
 */
export function useAgentChanges({
  projectId,
  doc,
  rev,
  onApply,
  onRemoteChange,
  onActivity,
}: UseAgentChangesOptions): AgentChangesHandle {
  const [state, setState] = useState<AgentChangesState | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const base = `/api/ideation/projects/${projectId}/agent`;
  const remote = useRef(onRemoteChange);
  remote.current = onRemoteChange;
  const apply = useRef(onApply);
  apply.current = onApply;
  const held = useRef(rev);
  held.current = rev;
  const liveDoc = useRef(doc);
  liveDoc.current = doc;
  const activity = useRef(onActivity);
  activity.current = onActivity;
  /** Ids seen by the previous poll; null until the first load (M79). */
  const seen = useRef<Set<string> | null>(null);
  /** The session the previous poll saw; undefined until the first load (M86). */
  const seenSession = useRef<AgentSession | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as AgentChangesState;
      setState(next);
      const counts = newChangeCounts(seen.current, next.changes);
      seen.current = new Set(next.changes.map((c) => c.id));
      const moved = sessionEvent(seenSession.current, next.session ?? null);
      seenSession.current = next.session ?? null;
      const fresh = moved ? { ...(counts ?? { proposed: 0, written: 0, waiting: 0 }), session: moved } : counts;
      if (fresh) activity.current?.(fresh);
      if (next.rev !== null && held.current !== undefined && next.rev > held.current) remote.current(next.rev);
    } catch {
      // A missed poll is fine, the next one catches up.
    }
  }, [base]);

  // The guide modal changes the mode too and says so on the window.
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

  const setMode = useCallback(
    async (mode: AgentWriteMode) => {
      setError(null);
      const before = stateRef.current;
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
    },
    [base],
  );

  /** The patch to send, validated against the schema the agent's input passed. */
  const decided = useCallback(
    (change: AgentChangeRow, decision: Decision): { ok: true; patch: unknown } | { ok: false; message: string } => {
      const patch = decidePatch(change.kind, change.patch, decision);
      const schema =
        change.kind === "build_steps"
          ? buildStepsPatchSchema
          : change.target === "project"
            ? projectPatchSchema
            : tokenDesignPatchSchema;
      const parsed = schema.safeParse(patch);
      if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
      // Dropping a line can leave the rest without what it relied on (M51).
      if (change.kind === "fields" && change.target === "project") {
        const problem = projectPatchProblem(liveDoc.current, parsed.data as ProjectPatch);
        if (problem) return { ok: false, message: problem };
      }
      return { ok: true, patch: parsed.data };
    },
    [],
  );

  /** The project draft with the decided patch merged in. */
  const merged = useCallback((change: AgentChangeRow, patch: unknown): ProjectDoc | null => {
    if (change.kind === "build_steps") {
      const parsed = buildStepsPatchSchema.safeParse(patch);
      return parsed.success ? applyBuildSteps(liveDoc.current, parsed.data as BuildStepsPatch) : null;
    }
    const parsed = projectPatchSchema.safeParse(patch);
    return parsed.success ? applyProjectPatch(liveDoc.current, parsed.data) : null;
  }, []);

  const decide = useCallback(
    async (change: AgentChangeRow, action: "accept" | "reject", decision: Decision): Promise<string | null> => {
      setWorking(change.id);
      setError(null);
      setNotice(null);
      const inEditor = action === "accept" && change.target === "project";
      let body: Record<string, unknown> = { action, appliedInEditor: inEditor };
      let next: ProjectDoc | null = null;
      if (action === "accept") {
        const result = decided(change, decision);
        if (!result.ok) {
          setWorking(null);
          return result.message;
        }
        body = { ...body, patch: result.patch };
        if (inEditor) {
          next = merged(change, result.patch);
          if (!next) {
            setWorking(null);
            return AGENT_COPY.invalidDecision;
          }
        }
      }
      try {
        const res = await fetch(`${base}/${change.id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          if (res.status === 400 && json?.error) return json.error;
          throw new Error();
        }
        if (next) apply.current(next);
        if (action === "accept" && change.target === "token_design") setNotice(AGENT_COPY.tokenAccepted);
        await load();
        return null;
      } catch {
        setError(AGENT_COPY.failed);
        return null;
      } finally {
        setWorking(null);
      }
    },
    [base, decided, merged, load],
  );

  const accept = useCallback(
    (change: AgentChangeRow, decision: Decision = AS_PROPOSED) => decide(change, "accept", decision),
    [decide],
  );
  const reject = useCallback((change: AgentChangeRow) => decide(change, "reject", AS_PROPOSED), [decide]);

  const changes = state?.changes ?? [];
  return {
    state,
    pending: changes.filter((c) => c.status === "proposed"),
    earlier: changes.filter((c) => c.status !== "proposed"),
    working,
    error,
    notice,
    setMode,
    accept,
    reject,
    reload: load,
  };
}
