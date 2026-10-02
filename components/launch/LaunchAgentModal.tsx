"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { MCP_CONNECT } from "@/content/launch";

import { LaunchPrompt } from "./McpConnectCard";

/**
 * The studio popup for one launch (M56). One prompt to paste into an AI IDE
 * that reads the token and, when the launch is linked, its project.
 */
export function LaunchAgentModal({
  open,
  onClose,
  address,
  name,
  committed,
  project,
}: {
  open: boolean;
  onClose: () => void;
  address: string;
  name?: string;
  committed: boolean;
  project?: { id: string; name: string; hasKit?: boolean } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ onClose, containerRef, active: open });

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={MCP_CONNECT.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="glass relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-700/70 p-6 md:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={MCP_CONNECT.close}
          className="absolute right-4 top-4 z-10 rounded-lg border border-ink-700 bg-ink-900/60 p-1.5 text-ink-300 transition-colors hover:text-ink-50"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="pr-10 font-display text-xl font-semibold tracking-tight text-ink-50">
          {MCP_CONNECT.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">{MCP_CONNECT.intro}</p>

        <div className="mt-6 space-y-4">
          <LaunchPrompt target={{ kind: "launch", address, name, committed, project }} />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink-500">
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
    </div>,
    document.body,
  );
}
