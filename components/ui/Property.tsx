import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A label and value list (M137), the way a properties sidebar reads: the
 * label in muted text, the value beside it. Use PropertyList around rows.
 */
export function PropertyList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <dl className={cn("space-y-2 text-sm", className)}>{children}</dl>;
}

export function Property({ label, value, className, labelClassName }: { label: React.ReactNode; value: React.ReactNode; className?: string; labelClassName?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-0.5", className)}>
      <dt className={cn("w-32 shrink-0 text-ink-500", labelClassName)}>{label}</dt>
      <dd className="min-w-0 flex-1 text-ink-200">{value}</dd>
    </div>
  );
}
