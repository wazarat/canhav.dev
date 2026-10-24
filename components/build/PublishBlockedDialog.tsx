"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { BUILD_COPY, type BuildTab } from "@/content/build";
import { type ProblemArea, type ProjectProblems, tabOfArea } from "@/lib/build-readiness";

const AREAS: ReadonlyArray<Exclude<ProblemArea, "overall">> = ["building", "basics", "reality"];

/**
 * What stops publishing, shown only when Publish is pressed (2026-10-19).
 * One line per open area with the section that holds it, and the first
 * problem the validator names.
 */
export function PublishBlockedDialog({
  open,
  onClose,
  problems,
  onGoTab,
}: {
  open: boolean;
  onClose: () => void;
  problems: ProjectProblems;
  onGoTab: (tab: BuildTab) => void;
}) {
  const C = BUILD_COPY.publish.blocked;
  const containerRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ onClose, containerRef, active: open });
  if (!open) return null;
  const areas = AREAS.filter((a) => problems[a] !== null);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={C.title} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 md:py-14">
      <div className="fixed inset-0 bg-ink-950/80" onClick={onClose} />
      <div ref={containerRef} tabIndex={-1} className="relative z-10 w-full max-w-lg rounded-xl border border-ink-700/60 bg-ink-900 focus:outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700/40 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">{C.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">{C.intro}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={C.close} className="rounded-lg border border-ink-700/60 p-1.5 text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          {problems.overall ? <p className="text-sm leading-relaxed text-ink-300">{problems.overall}</p> : null}
          <ul className="space-y-2">
            {areas.map((area) => {
              const tab = tabOfArea(area);
              return (
                <li key={area} className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-200">
                  <span>{problems[area]}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      onGoTab(tab);
                    }}
                  >
                    {BUILD_COPY.publish.openIn(BUILD_COPY.tabs[tab])} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
