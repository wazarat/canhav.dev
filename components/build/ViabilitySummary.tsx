"use client";

import { VIABILITY_COPY } from "@/content/viability";

export interface SummaryLine {
  /** The section's CardSection id, the link target. */
  section: string;
  text: string;
}

/**
 * The card on top of the Viability tab (M162): the sections' answer
 * sentences strung together, each a link to its section. Plain text, no
 * boxes (M137). A tab with no data yet reads one sentence on what will
 * appear here.
 */
export function ViabilitySummary({ lines }: { lines: readonly SummaryLine[] }) {
  const S = VIABILITY_COPY.summary;
  if (lines.length === 0) return <p className="text-sm leading-relaxed text-ink-400">{S.empty}</p>;
  return (
    <p className="max-w-3xl text-base leading-relaxed text-ink-100">
      {lines.map((l, i) => (
        <span key={l.section}>
          {i > 0 ? " " : ""}
          <a
            href={`#${l.section}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(l.section)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="underline decoration-ink-600 underline-offset-4 transition-colors hover:text-ink-50 hover:decoration-ink-300"
          >
            {l.text}
          </a>
        </span>
      ))}
    </p>
  );
}
