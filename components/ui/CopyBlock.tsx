"use client";

import { Check, Copy } from "lucide-react";

import { useCopyToClipboard } from "@/components/ui/useCopy";

/**
 * A labelled block of prose with a copy button in its corner, for text that
 * runs to several paragraphs (the prompt a builder pastes into Claude).
 * Wraps and scrolls; CopyLine is the one-line sibling.
 */
export function CopyBlock({ label, text, hint }: { label: string; text: string; hint?: string }) {
  const { copied, copy } = useCopyToClipboard(text);

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-ink-200">{label}</span>
      <div className="relative">
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-ink-700/60 bg-ink-950/70 px-3 py-2.5 pr-24 font-sans text-xs leading-relaxed text-ink-100">
          {text}
        </pre>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2.5 py-1 text-xs text-ink-300 transition-colors hover:text-ink-50"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-signal-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint ? <p className="text-xs leading-relaxed text-ink-500">{hint}</p> : null}
    </div>
  );
}
