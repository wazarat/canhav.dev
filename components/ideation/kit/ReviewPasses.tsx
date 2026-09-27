"use client";

import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { StatusChip } from "@/components/ui/StatusChip";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { REVIEW_COPY, REVIEW_VERDICT_OPTIONS } from "@/content/kits/credit";
import { REVIEW_PASSES } from "@/content/kits/review-passes";
import {
  type ProjectKit,
  type ReviewVerdict,
  reviewPassesFor,
  reviewProgress,
  setReviewVerdict,
  kitShapes,
} from "@/lib/kits";

const BY_ID = new Map(KIT_CATALOG.map((r) => [r.id, r] as const));

/**
 * Pre-launch review passes under the Security declarations. One verdict per
 * pass, pass, fail or not applicable, stored in kit.review. Clicking the
 * chosen verdict again clears it.
 */
export function ReviewPasses({
  kit,
  onPatchKit,
}: {
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const passes = reviewPassesFor(REVIEW_PASSES, kitShapes(kit));
  if (passes.length === 0) return null;
  const p = reviewProgress(passes, kit);
  return (
    <section className="space-y-4 border-t border-ink-800/70 pt-6" aria-label={REVIEW_COPY.title}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-ink-50">{REVIEW_COPY.title}</h3>
          <StatusChip tone={p.fail > 0 ? "warning" : p.open > 0 ? "neutral" : "success"} className="px-2 py-0.5 text-[11px]">
            {REVIEW_COPY.summary(p)}
          </StatusChip>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">{REVIEW_COPY.intro}</p>
      </div>
      <ol className="space-y-5">
        {passes.map((pass, i) => {
          const verdict = kit.review?.[pass.id] ?? "";
          const links = pass.resources
            .map((id) => BY_ID.get(id))
            .filter((r): r is NonNullable<typeof r> => Boolean(r));
          return (
            <li key={pass.id} className="space-y-2">
              <ChipRadioGroup<ReviewVerdict>
                label={`${i + 1}. ${pass.title}`}
                hint={pass.detail}
                value={verdict}
                onChange={(v) => onPatchKit(setReviewVerdict(kit, pass.id, v === verdict ? null : v))}
                options={REVIEW_VERDICT_OPTIONS}
              />
              <p className="-mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                {links.map((r) => (
                  <a
                    key={r.id}
                    href={r.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-electric-400 transition-colors hover:text-ink-50"
                  >
                    {r.title}
                  </a>
                ))}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
