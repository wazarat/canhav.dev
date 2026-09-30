import { LinkedEntityCard } from "@/components/ideation/LinkedEntityCard";
import { MilestoneList, type VerifiedUpdate } from "@/components/launch/MilestoneList";
import { StatusChip } from "@/components/ui/StatusChip";
import type { LaunchCommitment } from "@/lib/launch-commitment";

type DesignCommitment = Extract<NonNullable<LaunchCommitment>, { source: "design" }>;

/**
 * The commitment block for a token that committed a published design
 * (M48). The design card, whether the snapshot re-hashes to the on-chain
 * value, and the design's milestones with their verified updates, or a
 * note that the snapshot carries none.
 */
export function DesignCommitmentCard({
  commitment,
  updates,
}: {
  commitment: DesignCommitment;
  updates?: Record<number, VerifiedUpdate[]>;
}) {
  return (
    <div className="mt-8 space-y-4">
      <StatusChip tone="success" variant="block">
        Design committed on-chain. The launch transaction recorded this token
        design&apos;s snapshot hash (v{commitment.version}); the document behind
        this token is tamper-evident.
      </StatusChip>
      <LinkedEntityCard
        type="token_design"
        name={commitment.name}
        slug={commitment.slug}
        summary={commitment.doc.rationale.beyondDatabaseRow}
      />
      <div className="card-surface rounded-2xl border border-ink-700/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">Milestones</h2>
          {commitment.verified ? (
            <StatusChip tone="success">Snapshot hash verified against chain</StatusChip>
          ) : (
            <StatusChip tone="error">Hash mismatch. Do not trust</StatusChip>
          )}
        </div>
        {commitment.milestones ? (
          <MilestoneList milestones={commitment.milestones} updates={updates} />
        ) : (
          <StatusChip tone="neutral" variant="block" className="mt-4">
            This design was published without milestones, so this launch
            cannot hold sales, escrow or progress updates. A later republish
            cannot change what the launch committed.
          </StatusChip>
        )}
      </div>
    </div>
  );
}
