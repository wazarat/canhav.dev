"use client";

import { Check, Copy } from "lucide-react";

import { useCopyToClipboard } from "@/components/ui/useCopy";
import { cn } from "@/lib/utils";

/**
 * A labelled line of text with a copy button. Used by the MCP connect card
 * and the resource pack handoff. When the clipboard is unavailable
 * (permissions, insecure context) the button does nothing visible; the text
 * stays selectable. Multi-paragraph text goes in CopyBlock instead.
 */
export function CopyLine({ label, text, mono = true }: { label: string; text: string; mono?: boolean }) {
  const { copied, copy } = useCopyToClipboard(text);

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-ink-200">{label}</span>
      <div className="flex items-stretch gap-2">
        <pre
          className={cn(
            "min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-lg border border-ink-700/60 bg-ink-950/70 px-3 py-2 text-xs text-ink-100",
            mono ? "font-mono" : "whitespace-pre-wrap font-sans",
          )}
        >
          {text}
        </pre>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-2.5 text-xs text-ink-300 transition-colors hover:text-ink-50"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-signal-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
