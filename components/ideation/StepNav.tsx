"use client";

import { cn } from "@/lib/utils";

export interface StepDef {
  label: string;
  /** First validation problem for the step, or null when complete. */
  problem: string | null;
}

/**
 * Generalized step pills (the LaunchForm stepper pattern, n steps). Drafts
 * are exploratory, so every step is reachable — completeness shows as a dot,
 * and publishing (not navigation) enforces validity.
 */
export function StepNav({
  steps,
  current,
  onSelect,
}: {
  steps: StepDef[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <button
          key={step.label}
          type="button"
          onClick={() => onSelect(i)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            i === current
              ? "border border-electric-500/50 bg-electric-500/20 text-electric-200"
              : "border border-ink-700/70 text-ink-400 hover:text-ink-200",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              step.problem === null ? "bg-signal-400" : "bg-ink-600",
            )}
          />
          {i + 1}. {step.label}
        </button>
      ))}
    </div>
  );
}
