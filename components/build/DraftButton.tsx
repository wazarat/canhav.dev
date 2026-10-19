"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { PlusGate } from "@/components/studio/PlusGate";
import { usePlan } from "@/components/studio/PlanContext";
import { Button } from "@/components/ui/Button";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { DRAFT_KIND_FEATURES, type DraftKind } from "@/lib/draft/limits";
import { type DraftRequest, type Drafted, withDrafted, withRequest, withoutRequest } from "@/lib/draft/requests";
import type { ProjectDoc } from "@/lib/ideation";

/** The slice of the record the button reads and writes. */
export type DraftMeta = Pick<ProjectDoc, "draftRequests" | "drafted">;

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * The Draft button, agent-first (M117). With an agent allowed on the
 * project, a click queues a request on the draft that the connected IDE
 * agent reads first on its next call and answers through update_project;
 * the paste prompt is there for other editors. CanHav's server draft is
 * the fallback: first when agent writes are off, otherwise a second
 * action. Under the button, who drafted the field and when, as plain
 * text. A free account sees the Studio+ gate instead.
 */
export function DraftButton<T>({
  projectId,
  kind,
  body,
  label,
  onResult,
  agentPrompt,
  doc,
  patch,
  agentMode = "propose",
  size = "sm",
  variant = "primary",
  gate = true,
}: {
  projectId: string;
  kind: DraftKind;
  body?: Record<string, unknown>;
  label?: string;
  onResult: (value: T) => void;
  /** The paste prompt for the owner's agent. */
  agentPrompt?: string;
  /** The record's requests and drafted marks, and the patch that writes them. */
  doc?: DraftMeta;
  patch?: (p: Partial<ProjectDoc>) => void;
  /** The project's agent write mode; off means no agent, so CanHav drafts first. */
  agentMode?: AgentWriteMode;
  size?: "sm" | "md";
  variant?: "primary" | "outline" | "ghost";
  /** False to render the button alone, when a parent already gates. */
  gate?: boolean;
}) {
  const C = STUDIO_PLUS_COPY.draft;
  const plan = usePlan();
  const [working, setWorking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const feature = DRAFT_KIND_FEATURES[kind];

  if (gate && !(plan.plan === "studio_plus" && plan.hasFeature(feature))) return <PlusGate feature={feature} />;

  const canQueue = Boolean(doc && patch) && agentMode !== "off";
  const open: DraftRequest | undefined = doc?.draftRequests?.find((r) => r.kind === kind);
  const drafted: Drafted[DraftKind] | undefined = doc?.drafted?.[kind];

  const queue = () => {
    if (!doc || !patch) return;
    patch({ draftRequests: withRequest(doc, kind, body, "owner") });
    setAskOpen(true);
  };
  const cancel = () => {
    if (!doc || !patch) return;
    patch({ draftRequests: withoutRequest(doc, kind) });
    setAskOpen(false);
  };

  const server = async () => {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/draft/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = (await res.json()) as { value?: T; remaining?: number; error?: string };
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (!res.ok || data.value === undefined) {
        setError(data.error ?? C.failed);
        return;
      }
      onResult(data.value);
      if (doc && patch) patch({ drafted: withDrafted(doc, kind, "canhav"), draftRequests: withoutRequest(doc, kind) });
      setAskOpen(false);
    } catch {
      setError(C.failed);
    } finally {
      setWorking(false);
    }
  };

  const serverButton = (primary: boolean) => (
    <Button size={size} variant={primary ? variant : "ghost"} onClick={() => void server()} disabled={working} aria-busy={working}>
      <Sparkles aria-hidden className="h-3.5 w-3.5" /> {working ? C.working : primary ? (label ?? C.draft) : C.serverNow}
    </Button>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {canQueue && !open ? (
          <Button size={size} variant={variant} onClick={queue}>
            <Sparkles aria-hidden className="h-3.5 w-3.5" /> {label ?? C.queue}
          </Button>
        ) : null}
        {canQueue && open ? (
          <Button size={size} variant="ghost" onClick={cancel}>
            {C.cancel}
          </Button>
        ) : null}
        {serverButton(!canQueue)}
        {remaining !== null ? <span className="text-xs text-ink-400">{C.remaining(remaining)}</span> : null}
        {agentPrompt && !open ? (
          <Button size={size} variant="ghost" onClick={() => setAskOpen((o) => !o)}>
            {C.askAgent}
          </Button>
        ) : null}
      </div>
      {open ? <p className="text-xs text-ink-400">{C.queued(when(open.requestedAt))}</p> : null}
      {!canQueue && gate ? <p className="text-xs text-ink-500">{C.serverFirst}</p> : null}
      {drafted ? <p className="text-xs text-ink-500">{C.by[drafted.by](when(drafted.at))}</p> : null}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      {askOpen && agentPrompt ? <CopyBlock label={C.askAgentLabel} text={agentPrompt} hint={kind === "weekly" ? C.askAgentHintTool("set_weekly_update") : C.askAgentHint} /> : null}
    </div>
  );
}
