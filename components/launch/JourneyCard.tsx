import { BadgeCheck, ShieldAlert } from "lucide-react";

import type { JourneyDoc } from "@/lib/journey";

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
 * Server-rendered journey display for the token page. `verified` means the
 * stored document's recomputed keccak256 equals the journeyHash in the
 * on-chain TokenLaunched event — computed server-side in the page.
 * `updates` maps milestone index → verified progress updates (oldest first).
 */
export function JourneyCard({
  doc,
  verified,
  updates,
}: {
  doc: JourneyDoc;
  verified: boolean;
  updates?: Record<number, VerifiedUpdate[]>;
}) {
  return (
    <div className="card-surface mt-8 rounded-2xl border border-ink-700/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">
          Journey
        </h2>
        {verified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5" /> Hash verified against chain
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
            <ShieldAlert className="h-3.5 w-3.5" /> Hash mismatch — do not trust
          </span>
        )}
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-500">
            Why this token
          </h3>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
            {doc.why}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-500">
            Supply rationale
          </h3>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
            {doc.supplyRationale}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-500">
            Roadmap
          </h3>
          <ol className="mt-2 space-y-3 border-l border-ink-700/70 pl-4">
            {doc.milestones.map((m, i) => (
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
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-200">
                      {u.body}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-500">
                      <BadgeCheck className="h-3 w-3 text-emerald-400" />
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
        </div>
      </div>
    </div>
  );
}
