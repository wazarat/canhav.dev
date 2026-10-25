import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Facts on one line in secondary text, joined by middle dots (M137): the
 * shapes, the chain and the stage of a project, the counts under a
 * heading. Empty items are left out, so callers can pass conditionals.
 */
export function MetaLine({ items, className }: { items: ReadonlyArray<React.ReactNode>; className?: string }) {
  const shown = items.filter((i) => i !== null && i !== undefined && i !== false && i !== "");
  if (shown.length === 0) return null;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400", className)}>
      {shown.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <span aria-hidden>·</span> : null}
          <span className="inline-flex items-center gap-1.5">{item}</span>
        </React.Fragment>
      ))}
    </p>
  );
}

/** A thin progress bar beside a count, the one shape that stays a pill (M137). `fill` colours the bar (M175, the rail's milestones). */
export function ProgressBar({ done, total, className, fill }: { done: number; total: number; className?: string; fill?: string }) {
  const pct = total > 0 ? Math.round((Math.min(done, total) / total) * 100) : 0;
  return (
    <span aria-hidden className={cn("inline-block h-1 w-16 overflow-hidden rounded-full bg-ink-800 align-middle", className)}>
      <span className={cn("block h-1 rounded-full", !fill && "bg-ink-400")} style={{ width: `${pct}%`, ...(fill ? { backgroundColor: fill } : {}) }} />
    </span>
  );
}
