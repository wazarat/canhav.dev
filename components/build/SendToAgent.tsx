"use client";

import { Bot, Check, ChevronDown, Copy } from "lucide-react";

import { Menu, MenuItem } from "@/components/ui/Menu";
import { useCopyToClipboard } from "@/components/ui/useCopy";
import { BUILD_COPY } from "@/content/build";
import type { AgentWriteMode } from "@/lib/agent-writes";

/**
 * Hand a build step, or every open step of a milestone, to the connected
 * agent (M152, F10). One small control with two options, the same shape
 * as the Draft control from M141: queue it on the project so the agent
 * reads it first on get_project_status, or copy a prompt to paste into
 * the IDE by hand. The queue option is hidden when writes are off or no
 * agent has worked on the project yet.
 */
export function SendToAgent({
  label = BUILD_COPY.row.sendToAgent,
  queueLabel = BUILD_COPY.row.queueIt,
  copyLabel = BUILD_COPY.row.copyPrompt,
  prompt,
  canQueue,
  full = false,
  onQueue,
  disabled = false,
}: {
  label?: string;
  queueLabel?: string;
  copyLabel?: string;
  prompt: string;
  /** An agent has worked on the project and writes are not off. */
  canQueue: boolean;
  /** The request cap is reached. */
  full?: boolean;
  onQueue?: () => void;
  disabled?: boolean;
}) {
  const R = BUILD_COPY.row;
  const { copied, copy } = useCopyToClipboard(prompt);
  return (
    <Menu
      align="left"
      width="w-72"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-[11px] text-ink-300 transition-colors hover:text-ink-50 disabled:cursor-not-allowed disabled:text-ink-600"
        >
          <Bot aria-hidden className="h-3 w-3" />
          {copied ? R.copied : label}
          <ChevronDown aria-hidden className="h-3 w-3 text-ink-500" />
        </button>
      )}
    >
      {canQueue ? (
        <MenuItem onSelect={onQueue} disabled={full}>
          <span className="min-w-0">
            {queueLabel}
            {full ? <span className="mt-0.5 block text-xs text-ink-500">{R.capReached}</span> : null}
          </span>
        </MenuItem>
      ) : null}
      <MenuItem onSelect={() => void copy()}>
        {copied ? <Check aria-hidden className="h-3.5 w-3.5 text-signal-400" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}
        {copyLabel}
      </MenuItem>
    </Menu>
  );
}
