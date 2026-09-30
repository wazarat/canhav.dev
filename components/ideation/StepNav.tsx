"use client";

import { cn } from "@/lib/utils";

export interface StepDef {
  label: string;
  /** First validation problem for the step, or null when complete. */
  problem: string | null;
  /** React key. Falls back to the label. */
  key?: string;
  /** "product" pills belong to a product shape, not the project record (M43). */
  variant?: "doc" | "product";
  /** Small uppercase word before the label on a product pill. */
  kicker?: string;
}

/**
 * Generalized step pills (the LaunchForm stepper pattern, n steps). Drafts
 * are exploratory, so every step is reachable — completeness shows as a dot,
 * and publishing (not navigation) enforces validity. Doc pills are numbered
 * and electric; product pills carry a kicker instead of a number and the
 * violet accent, so a builder sees which pills are the project record and
 * which are the product they are building.
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
  let n = 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => {
        const product = step.variant === "product";
        if (!product) n += 1;
        const number = n;
        return (
          <button
            key={step.key ?? step.label}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              product
                ? i === current
                  ? "border border-neon-500/50 bg-neon-500/20 text-neon-200"
                  : "border border-neon-500/30 text-ink-400 hover:text-ink-200"
                : i === current
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
            {product ? (
              <>
                {step.kicker ? (
                  <span className="text-[10px] uppercase tracking-wide opacity-80">{step.kicker}</span>
                ) : null}
                {step.label}
              </>
            ) : (
              <>
                {number}. {step.label}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
