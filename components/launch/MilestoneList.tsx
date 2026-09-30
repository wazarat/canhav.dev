import { BadgeCheck } from "lucide-react";

import type { JourneyMilestone } from "@/lib/journey";

/** A creator-authored progress update, already verified server-side: the
 *  author matches the token's creator and the stored body's hash matches the
 *  on-chain MilestoneUpdate anchor. */
export interface VerifiedUpdate {
  body: string;
  /** Unix seconds of the anchoring block. */
  postedAt: number;
  txHash: string;
}

/**
 * The dated milestone list with each milestone's verified updates under it.
 * Shared by the journey card and the design commitment card (M48).
 */
export function MilestoneList({
  milestones,
  updates,
}: {
  milestones: readonly JourneyMilestone[];
  updates?: Record<number, VerifiedUpdate[]>;
}) {
  return (
    <ol className="mt-2 space-y-3 border-l border-ink-700/70 pl-4">
      {milestones.map((m, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[21px] top-1.5 block h-2 w-2 rounded-full bg-electric-500/70" />
          <p className="text-sm text-ink-100">
            <span className="tabular font-mono text-xs text-ink-500">{m.date}</span>
            {"  "}
            <span className="font-medium">{m.title}</span>
          </p>
          {m.description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{m.description}</p>
          ) : null}
          {(updates?.[i] ?? []).map((u) => (
            <div
              key={u.txHash + u.postedAt}
              className="mt-2 rounded-lg border border-ink-700/60 bg-ink-950/50 px-3 py-2"
            >
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-200">{u.body}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-500">
                <BadgeCheck className="h-3 w-3 text-signal-400" />
                Creator update ·{" "}
                {new Date(u.postedAt * 1000).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}{" "}
                · hash anchored on-chain
              </p>
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}
