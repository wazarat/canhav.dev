"use client";

import { useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { StatusChip } from "@/components/ui/StatusChip";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { BUILD_COPY } from "@/content/build";
import { sectionsFor } from "@/content/kits/checklists";
import { CHECKLIST_COPY } from "@/content/kits/copy";
import { continueBuildPrompt } from "@/lib/agent-prompts";
import { MILESTONES, type Milestone, groupsByMilestone } from "@/lib/build-milestones";
import { type ProjectKit, groupProgress, groupState, kitShapes } from "@/lib/kits";

const OPEN_LIMIT = 8;

/**
 * The progress pop up on the Build chip (M104): done of total per
 * milestone with a way into each, the open steps, and the prompt that
 * hands them to the agent.
 */
export function ProgressDialog({
  open,
  onClose,
  name,
  projectId,
  kit,
  onMilestone,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  projectId: string;
  kit: ProjectKit | undefined;
  /** Opens the Build section on one milestone. */
  onMilestone: (m: Milestone) => void;
}) {
  const C = BUILD_COPY.overview.progressDialog;
  const containerRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ onClose, containerRef, active: open });
  const by = useMemo(() => groupsByMilestone(sectionsFor(kitShapes(kit), kit ?? {})), [kit]);
  if (!open) return null;

  const openSteps = MILESTONES.flatMap((m) =>
    by[m].filter((g) => {
      const s = groupState(g, kit);
      return s === "open" || s === "partial";
    }).map((g) => g.title),
  );

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={C.title} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 md:py-14">
      <div className="fixed inset-0 bg-ink-950/80" onClick={onClose} />
      <div ref={containerRef} tabIndex={-1} className="relative z-10 w-full max-w-2xl rounded-xl border border-ink-700/60 bg-ink-900 focus:outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700/40 px-5 py-4 md:px-6">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">{C.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">{C.intro}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={BUILD_COPY.overview.summary.close} className="rounded-lg border border-ink-700/60 p-1.5 text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-5 md:px-6">
          <ul className="space-y-2">
            {MILESTONES.filter((m) => m !== "launch").map((m) => {
              const p = groupProgress(by[m], kit);
              return (
                <li key={m} className="flex flex-wrap items-center gap-3">
                  <span className="w-24 text-sm text-ink-100">{BUILD_COPY.milestones[m].label}</span>
                  <StatusChip tone={p.total && p.done === p.total ? "success" : "neutral"} className="px-2 py-0.5 text-[11px]">
                    {CHECKLIST_COPY.progress(p.done, p.total)}
                  </StatusChip>
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-ink-800">
                    <div className="h-full rounded-full bg-signal-400" style={{ width: p.total ? `${Math.round((p.done / p.total) * 100)}%` : "0%" }} />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onClose();
                      onMilestone(m);
                    }}
                  >
                    {C.open(BUILD_COPY.milestones[m].label)} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
          <div>
            <p className="text-xs font-medium text-ink-200">{C.openSteps}</p>
            {openSteps.length === 0 ? (
              <p className="mt-1 text-xs text-ink-500">{C.allDone}</p>
            ) : (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-300">
                {openSteps.slice(0, OPEN_LIMIT).map((t) => (
                  <li key={t}>{t}</li>
                ))}
                {openSteps.length > OPEN_LIMIT ? <li className="list-none text-xs text-ink-500">{C.more(openSteps.length - OPEN_LIMIT)}</li> : null}
              </ul>
            )}
          </div>
          <CopyBlock label={C.promptLabel} text={continueBuildPrompt(name, projectId, openSteps.slice(0, OPEN_LIMIT))} hint={C.promptHint} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
