import * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "electric" | "signal" | "neon";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const SURFACE = /^(-?(px|py|p|pl|pr|pt|pb|bg|border|rounded|shadow|ring)(-|$))/;

/**
 * A label as plain secondary text (M137). The tones are kept for the old
 * call sites and ignored; a label says what it is in words. Padding,
 * borders, backgrounds and radii passed by older callers are dropped.
 */
export function Badge({ tone: _tone, className, ...props }: BadgeProps) {
  void _tone;
  const rest = className
    ?.split(/\s+/)
    .filter((c) => c && !SURFACE.test(c))
    .join(" ");
  return <span className={cn("text-xs text-ink-400", rest)} {...props} />;
}
