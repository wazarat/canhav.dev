"use client";

import { ExternalLink } from "lucide-react";

import { InfoTip } from "@/components/ui/InfoTip";
import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { AGENT_COPY } from "@/content/ideation";
import { type AgentSession, type SessionView, planProgress, sessionView } from "@/lib/agent-sessions";
import { cn } from "@/lib/utils";

const VIEW_TONE: Record<SessionView, StatusTone> = {
  working: "info",
  awaiting_input: "warning",
  done: "success",
  error: "error",
  stale: "neutral",
};

/** "just now", "4 minutes ago", "2 hours ago", "3 days ago". */
function ago(iso: string, now = Date.now()): string {
  const S = AGENT_COPY.session;
  const ms = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return S.justNow;
  if (minutes < 60) return S.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return S.hoursAgo(hours);
  return S.daysAgo(Math.floor(hours / 24));
}

/**
 * The live agent session at the top of Agent changes (M86), after Linear's
 * agent sessions. State, title, message, the plan as a checklist, when it
 * last reported and the link to the work. Read only; the agent writes it
 * through report_session.
 */
export function AgentSessionCard({ session }: { session: AgentSession | null }) {
  const S = AGENT_COPY.session;
  const view = session ? sessionView(session) : null;
  const progress = session ? planProgress(session.plan) : null;
  return (
    <section className="rounded-xl border border-ink-800/70 bg-ink-950/40 p-4" aria-label={S.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-200">
          {S.title}
          <InfoTip>{S.hint}</InfoTip>
        </span>
        {session && view ? <StatusChip tone={VIEW_TONE[view]}>{S.states[view]}</StatusChip> : null}
      </div>
      {!session ? (
        <p className="mt-2 text-xs text-ink-500">{S.none}</p>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-ink-50">{session.title?.trim() || S.untitled}</p>
          {session.message?.trim() ? (
            <p className="text-sm leading-relaxed text-ink-300">{session.message}</p>
          ) : null}
          {session.plan.length ? (
            <div>
              <p className="text-xs font-medium text-ink-200">
                {S.plan}
                {progress ? <span className="ml-1.5 text-ink-400">{S.planProgress(progress.done, progress.total)}</span> : null}
              </p>
              <ol className="mt-1.5 space-y-1">
                {session.plan.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        item.status === "done"
                          ? "bg-signal-400"
                          : item.status === "in_progress"
                            ? "bg-electric-400"
                            : item.status === "canceled"
                              ? "bg-ink-700"
                              : "bg-ink-600",
                      )}
                    />
                    <span className={item.status === "done" || item.status === "canceled" ? "text-ink-500 line-through decoration-ink-700" : "text-ink-200"}>
                      {item.content}
                    </span>
                    <span className="sr-only">{S.planStatus[item.status]}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            <span>{S.updated(ago(session.updatedAt))}</span>
            {session.externalUrl ? (
              <a
                href={session.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-electric-300 transition-colors hover:text-electric-200"
              >
                {S.link}
                <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            ) : null}
          </p>
        </div>
      )}
    </section>
  );
}
