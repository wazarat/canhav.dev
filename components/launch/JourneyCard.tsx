import { MilestoneList, type VerifiedUpdate } from "@/components/launch/MilestoneList";
import { StatusChip } from "@/components/ui/StatusChip";
import type { JourneyDoc } from "@/lib/journey";

export type { VerifiedUpdate };

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
          <StatusChip tone="success">Hash verified against chain</StatusChip>
        ) : (
          <StatusChip tone="error">Hash mismatch. Do not trust</StatusChip>
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
          <MilestoneList milestones={doc.milestones} updates={updates} />
        </div>
      </div>
    </div>
  );
}
