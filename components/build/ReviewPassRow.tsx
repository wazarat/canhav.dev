"use client";

import { ReadMenu } from "@/components/build/StepRow";
import { InfoTip } from "@/components/ui/InfoTip";
import { Segmented } from "@/components/ui/Segmented";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import { REVIEW_COPY, REVIEW_VERDICT_OPTIONS } from "@/content/kits/copy";
import { type ProjectKit, type ReviewPass, type ReviewVerdict, setReviewVerdict } from "@/lib/kits";

/**
 * One pre-launch review pass as a row under the Review milestone (M95).
 * The verdict is a small segmented control; Clear takes it back to open.
 */
export function ReviewPassRow({
  pass,
  kit,
  onPatchKit,
}: {
  pass: ReviewPass;
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const verdict = kit.review?.[pass.id] ?? "";
  return (
    <li className="flex flex-wrap items-start gap-3 border-t border-ink-800/60 py-3 first:border-t-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="inline-flex items-center gap-1 text-sm text-ink-50">
          {pass.title}
          <InfoTip label={REVIEW_COPY.title}>{pass.detail}</InfoTip>
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip tone="neutral" className="px-2 py-0 text-[10px]">
            {REVIEW_COPY.title}
          </StatusChip>
          <ReadMenu ids={pass.resources} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Segmented<ReviewVerdict>
          size="sm"
          ariaLabel={pass.title}
          value={verdict}
          onChange={(v) => onPatchKit(setReviewVerdict(kit, pass.id, v))}
          options={REVIEW_VERDICT_OPTIONS}
        />
        {verdict ? (
          <button
            type="button"
            onClick={() => onPatchKit(setReviewVerdict(kit, pass.id, null))}
            className="text-[11px] text-ink-400 transition-colors hover:text-ink-100"
          >
            {BUILD_COPY.row.undo}
          </button>
        ) : null}
      </div>
    </li>
  );
}
