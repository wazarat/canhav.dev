"use client";

import { CheckItem } from "@/components/ui/CheckItem";
import { InfoTip } from "@/components/ui/InfoTip";
import { StatusChip } from "@/components/ui/StatusChip";
import { CHECKLIST_COPY } from "@/content/kits/copy";
import { gatedStepsFor } from "@/content/kits/checklists";
import { type FeatureItem, type ProductShape, type ProjectKit, featureProgress, hasFeature, toggleFeature } from "@/lib/kits";

/**
 * "What this product includes" (M64), one CheckItem per feature of the
 * shape. A ticked feature adds the steps it gates to the section below and
 * ranks the templates it suggests first. Ticks live in kit.features.
 */
export function FeaturesBlock({
  shape,
  features,
  kit,
  onPatchKit,
}: {
  shape: ProductShape;
  features: readonly FeatureItem[];
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  if (!features.length) return null;
  const progress = featureProgress(features, kit);
  const gated = gatedStepsFor([shape]);
  return (
    <div className="space-y-2 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-xs font-medium text-ink-200">
          {CHECKLIST_COPY.featuresTitle}
          <InfoTip>{CHECKLIST_COPY.featuresHint}</InfoTip>
        </p>
        <StatusChip tone={progress.on ? "info" : "neutral"} className="px-2 py-0.5 text-[11px]">
          {CHECKLIST_COPY.featuresProgress(progress.on, progress.total)}
        </StatusChip>
      </div>
      <ul className="space-y-0.5">
        {features.map((f) => {
          const on = hasFeature(kit, f.id);
          const steps = gated.filter((g) => g.feature === f.id).length;
          const adds = CHECKLIST_COPY.featureAdds(steps, f.templates?.length ?? 0);
          return (
            <li key={f.id}>
              <CheckItem
                checked={on}
                onChange={(v) => onPatchKit(toggleFeature(kit, f.id, v))}
                label={
                  <span className="inline-flex items-center gap-1">
                    <span className={on ? "text-ink-50" : undefined}>{f.title}</span>
                    <InfoTip label={f.title}>{f.detail}</InfoTip>
                  </span>
                }
                description={adds ? <span className="block text-[11px] text-ink-500">{adds}</span> : undefined}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
