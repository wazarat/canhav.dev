"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { PlusGate } from "@/components/studio/PlusGate";
import { usePlan } from "@/components/studio/PlanContext";
import { Button } from "@/components/ui/Button";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { StatusChip } from "@/components/ui/StatusChip";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { DRAFT_KIND_FEATURES, type DraftKind } from "@/lib/draft/limits";

/**
 * The Draft button (M112). Calls the draft route, hands the value to the
 * caller, which applies it through the record's patch, and shows the
 * drafts left this month. Beside it, the prompt that asks the owner's own
 * agent to write the same thing over MCP, so the field never depends on
 * CanHav's allowance. A free account sees the Studio+ gate instead.
 */
export function DraftButton<T>({
  projectId,
  kind,
  body,
  label,
  onResult,
  agentPrompt,
  size = "sm",
  variant = "primary",
  gate = true,
}: {
  projectId: string;
  kind: DraftKind;
  body?: Record<string, unknown>;
  label?: string;
  onResult: (value: T) => void;
  /** The paste prompt for the owner's agent, shown under Or ask your agent. */
  agentPrompt?: string;
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

  const run = async () => {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/draft/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = (await res.json()) as { value?: T; remaining?: number; error?: string };
      if (!res.ok || data.value === undefined) {
        setError(data.error ?? C.failed);
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        return;
      }
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      onResult(data.value);
    } catch {
      setError(C.failed);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size={size} variant={variant} onClick={() => void run()} disabled={working} aria-busy={working}>
          <Sparkles aria-hidden className="h-3.5 w-3.5" /> {working ? C.working : (label ?? C.draft)}
        </Button>
        {remaining !== null ? <StatusChip tone="neutral">{C.remaining(remaining)}</StatusChip> : null}
        {agentPrompt ? (
          <Button size={size} variant="ghost" onClick={() => setAskOpen((o) => !o)}>
            {C.askAgent}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      {askOpen && agentPrompt ? <CopyBlock label={C.askAgentLabel} text={agentPrompt} hint={C.askAgentHint} /> : null}
    </div>
  );
}
