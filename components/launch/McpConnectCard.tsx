"use client";

import { useEffect, useState } from "react";
import { Cable, Check, Copy } from "lucide-react";

import { MCP_CONNECT } from "@/content/launch";
import { cn } from "@/lib/utils";

/**
 * The MCP connection card shown on launch surfaces. Static copy plus three
 * copy-to-clipboard lines. No wallet, no auth, no network. When the
 * clipboard is unavailable (permissions, insecure context) the button simply
 * does nothing visible; the text is still selectable.
 */

function CopyLine({ label, text, mono = true }: { label: string; text: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      return;
    } catch {
      // Async clipboard denied. Fall through to the selection-based copy.
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      if (ok) setCopied(true);
    } catch {
      // Nothing else to try. The line stays selectable for manual copy.
    }
  }

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

export function McpConnectCard({
  address,
  committed = true,
  compact = false,
  className,
}: {
  /** Lowercase token address. Omit for a generic card. */
  address?: string;
  /** False for a launch that recorded the zero journey hash. */
  committed?: boolean;
  /** Only the add command and the prompt, for the launch success screen. */
  compact?: boolean;
  className?: string;
}) {
  const prompt = address ? MCP_CONNECT.promptFor(address, committed) : MCP_CONNECT.promptAny;
  const askLabel = address ? MCP_CONNECT.steps.ask : MCP_CONNECT.steps.askAny;

  return (
    <div className={cn("glass rounded-2xl border border-ink-700/70 p-5 md:p-6", className)}>
      <div className="flex items-center gap-2">
        <Cable className="h-4 w-4 text-neon-300" aria-hidden />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          {MCP_CONNECT.title}
        </h3>
      </div>
      {!compact ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-300">{MCP_CONNECT.intro}</p>
      ) : null}

      <div className="mt-4 space-y-4">
        {!compact ? (
          <CopyLine label={MCP_CONNECT.steps.install} text={MCP_CONNECT.installCommand} />
        ) : null}
        <CopyLine label={MCP_CONNECT.steps.add} text={MCP_CONNECT.addCommand} />
        <CopyLine label={askLabel} text={prompt} mono={false} />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        {MCP_CONNECT.desktopNote}{" "}
        <a
          href={MCP_CONNECT.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-electric-300 transition-colors hover:text-electric-200"
        >
          {MCP_CONNECT.docsLabel} →
        </a>
      </p>
    </div>
  );
}
