import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Styled details (M74): a summary row with a chevron that turns when open.
 * Native, so it works without JavaScript and in server components. Used for
 * "Learn more" rows and collapsed lists.
 */
export function Collapsible({
  summary,
  defaultOpen,
  className,
  summaryClassName,
  children,
  ...props
}: {
  summary: React.ReactNode;
  defaultOpen?: boolean;
  summaryClassName?: string;
} & React.DetailsHTMLAttributes<HTMLDetailsElement>) {
  return (
    <details open={defaultOpen} className={cn("group rounded-lg border border-ink-700/60 bg-ink-900", className)} {...props}>
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink-100 [&::-webkit-details-marker]:hidden",
          summaryClassName,
        )}
      >
        <span className="min-w-0 flex-1">{summary}</span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-ink-700/40 px-4 py-3">{children}</div>
    </details>
  );
}
