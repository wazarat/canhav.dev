import * as React from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

/** Dot color is the only tonal element — the chip surface stays neutral glass. */
const dotClasses: Record<StatusTone, string> = {
  success: "bg-signal-400",
  warning: "bg-amber-400/80",
  error: "bg-rose-400",
  info: "bg-electric-400",
  neutral: "bg-ink-500",
};

/**
 * Unified status surface: translucent glass chip with a thin ink border,
 * neutral text, and a small colored status dot. Use `pill` for one-line
 * states (network, phase, tranche) and `block` for multiline messages
 * (tx results, callouts). Never hand-roll amber/emerald/rose boxes.
 */
export function StatusChip({
  tone = "neutral",
  variant = "pill",
  onClick,
  className,
  children,
  ...props
}: {
  tone?: StatusTone;
  variant?: "pill" | "block";
  onClick?: () => void;
} & React.HTMLAttributes<HTMLElement>) {
  const classes = cn(
    "glass border border-ink-700/60 text-ink-200",
    variant === "pill"
      ? "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs"
      : "flex items-start gap-2 rounded-lg px-3 py-2 text-left text-xs leading-relaxed",
    onClick && "transition-colors hover:bg-ink-700/40",
    className,
  );
  const dot = (
    <span
      aria-hidden
      className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full",
        variant === "block" && "mt-[5px]",
        dotClasses[tone],
      )}
    />
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} {...props}>
        {dot}
        <span className="min-w-0">{children}</span>
      </button>
    );
  }
  const Tag = variant === "pill" ? "span" : "div";
  return (
    <Tag className={classes} {...props}>
      {dot}
      <span className="min-w-0">{children}</span>
    </Tag>
  );
}
