import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  source?: string;
  /** % change vs prior day; renders a colored pill. Hidden when null/undefined. */
  delta?: number | null;
  className?: string;
}

export function StatCard({ label, value, hint, source, delta, className }: StatCardProps) {
  return (
    <div className={cn("glass rounded-xl px-5 py-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-300">{label}</p>
        {source && (
          <span className="rounded-md border border-ink-700/60 bg-ink-800/50 px-2 py-0.5 text-[10px] font-medium text-ink-400">
            {source}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="font-display text-2xl font-semibold tracking-tight text-ink-50 tabular">
          {value}
        </div>
        {delta !== null && delta !== undefined && (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium",
              delta >= 0
                ? "bg-signal-500/15 text-signal-400"
                : "bg-red-500/15 text-red-400",
            )}
          >
            {formatPct(delta)}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
