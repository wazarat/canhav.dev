"use client";

import { Check, Copy } from "lucide-react";

import { useCopyToClipboard } from "@/components/ui/useCopy";

/** The token address as a pill that copies it. */
export function CopyAddress({ address }: { address: string }) {
  const { copied, copy } = useCopyToClipboard(address);
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label="Copy token address"
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1.5 font-mono text-xs text-ink-200 transition-colors hover:text-ink-50"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-signal-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : `${address.slice(0, 6)}…${address.slice(-4)}`}
    </button>
  );
}
