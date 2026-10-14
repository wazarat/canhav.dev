"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { StatusChip } from "@/components/ui/StatusChip";
import { AGENT_COPY } from "@/content/ideation";
import type { AgentActivity } from "@/lib/agent-writes";

const HIDE_MS = 10_000;

/**
 * The small notice at the bottom right of the project editor when an agent
 * proposed or wrote something (M79). Fed by AgentChangesPanel's poll; the
 * panel itself sits at the bottom of the page, so Review scrolls there.
 * Hides on its own after ten seconds unless the pointer is over it.
 */
export function AgentActivityToast({ activity, onDismiss }: { activity: AgentActivity; onDismiss: () => void }) {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered) return;
    const timer = setTimeout(onDismiss, HIDE_MS);
    return () => clearTimeout(timer);
  }, [hovered, onDismiss]);

  const T = AGENT_COPY.toast;
  const lines: string[] = [];
  if (activity.waiting) lines.push(T.waiting(activity.waiting));
  if (activity.proposed) lines.push(T.proposed(activity.proposed));
  if (activity.written) lines.push(T.written(activity.written));
  const tone = activity.written && !activity.proposed && !activity.waiting ? "success" : "info";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 max-w-sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <StatusChip tone={tone} variant="block" className="bg-ink-900 shadow-none">
        <span className="flex items-start gap-3">
          <span className="min-w-0">
            {lines.join(" ")}{" "}
            <a
              href={`#${AGENT_COPY.anchor}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(AGENT_COPY.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
                onDismiss();
              }}
              className="text-electric-300 transition-colors hover:text-electric-200"
            >
              {T.review}
            </a>
          </span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={T.dismiss}
            className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </span>
      </StatusChip>
    </div>
  );
}
