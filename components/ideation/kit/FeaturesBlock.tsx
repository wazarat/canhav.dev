"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CheckItem } from "@/components/ui/CheckItem";
import { InfoTip } from "@/components/ui/InfoTip";
import { Input } from "@/components/ui/Input";
import { CHECKLIST_COPY } from "@/content/kits/copy";
import { gatedStepsFor } from "@/content/kits/checklists";
import {
  type FeatureItem,
  KIT_LIMITS,
  type ProjectKit,
  type ShapeId,
  addCustomStep,
  addOwnFeature,
  featureProgress,
  hasFeature,
  isProductShape,
  removeOwnFeature,
  toggleFeature,
} from "@/lib/kits";

/**
 * "What this product includes" (M64): one line per catalog feature of the
 * shape, ticked when it applies, and the lines the team or its agent added
 * (M179). Every line lists the steps behind it, the ones a catalog feature
 * switches on and the steps the team linked to it, and can take a new step
 * of its own. Ticks live in kit.features, own lines in kit.ownFeatures.
 */
export function FeaturesBlock({
  shape,
  features,
  kit,
  onPatchKit,
}: {
  shape: ShapeId;
  /** Our catalog features for the shape (the copied one for an own shape); may be empty. */
  features: readonly FeatureItem[];
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const C = CHECKLIST_COPY;
  const progress = featureProgress(features, kit);
  // Catalog steps a feature switches on, from the shape whose features these are.
  const featureShape = features[0] ? features[0].id.slice(0, features[0].id.indexOf(".")) : null;
  const gated = featureShape && isProductShape(featureShape) ? gatedStepsFor([featureShape]) : [];
  const own = (kit.ownFeatures ?? []).filter((f) => f.shape === shape);
  const linked = (id: string) => (kit.customSteps ?? []).filter((c) => c.feature === id).map((c) => c.title);
  return (
    <div className="space-y-3 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-xs font-medium text-ink-200">
          {C.featuresTitle}
          <InfoTip>{C.featuresHint}</InfoTip>
        </p>
        <p className="text-[11px] text-ink-400">
          {[features.length ? C.featuresProgress(progress.on, progress.total) : null, own.length ? C.featuresOwn(own.length) : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      <ul className="space-y-2">
        {features.map((f) => {
          const on = hasFeature(kit, f.id);
          const steps = [...gated.filter((g) => g.feature === f.id).map((g) => g.title), ...linked(f.id)];
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
                description={<FeatureSteps steps={steps} pending={!on && steps.length > 0} />}
              />
              {on ? <AddStepFor kit={kit} shape={shape} feature={f.id} onPatchKit={onPatchKit} /> : null}
            </li>
          );
        })}
        {own.map((f) => (
          <li key={f.id} className="flex items-start gap-3">
            <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink-400" />
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-sm text-ink-50">
                {f.title}
                <span className="text-[11px] text-ink-500">{C.featureYours}</span>
                {f.detail ? <InfoTip label={f.title}>{f.detail}</InfoTip> : null}
              </p>
              <FeatureSteps steps={linked(f.id)} />
              <AddStepFor kit={kit} shape={shape} feature={f.id} onPatchKit={onPatchKit} />
            </div>
            <button
              type="button"
              aria-label={C.featureRemove(f.title)}
              title={C.featureRemove(f.title)}
              onClick={() => onPatchKit(removeOwnFeature(kit, f.id))}
              className="rounded p-1 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <AddOwnFeature kit={kit} shape={shape} onPatchKit={onPatchKit} />
    </div>
  );
}

/** The steps behind a line, by name; a catalog feature's read as added once ticked. */
function FeatureSteps({ steps, pending = false }: { steps: readonly string[]; pending?: boolean }) {
  const C = CHECKLIST_COPY;
  return (
    <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-500">
      {steps.length ? `${pending ? C.featureWhenTicked : C.featureSteps}. ${steps.join(" · ")}` : C.featureNoSteps}
    </span>
  );
}

/** A new step that delivers this line, on the shape, linked so the line lists it. */
function AddStepFor({ kit, shape, feature, onPatchKit }: { kit: ProjectKit; shape: ShapeId; feature: string; onPatchKit: (partial: Partial<ProjectKit>) => void }) {
  const C = CHECKLIST_COPY;
  const L = KIT_LIMITS.customSteps;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const full = (kit.customSteps?.length ?? 0) >= L.max;
  const add = () => {
    if (title.trim().length < L.titleMin || full) return;
    onPatchKit(addCustomStep(kit, [shape], title, "", { feature }));
    setTitle("");
    setOpen(false);
  };
  if (!open)
    return full ? null : (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-400 hover:text-ink-100">
        <Plus aria-hidden className="h-3 w-3" /> {C.featureAddStep}
      </button>
    );
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <Input
        autoFocus
        value={title}
        maxLength={L.titleMax}
        placeholder={C.featureStepPlaceholder}
        aria-label={C.featureAddStep}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        className="h-8 min-w-[16rem] flex-1 text-xs"
      />
      <Button size="sm" disabled={title.trim().length < L.titleMin} onClick={add}>
        {C.featureAdd}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        {C.featureCancel}
      </Button>
    </div>
  );
}

/** A line of the team's own, added to what the shape includes. */
function AddOwnFeature({ kit, shape, onPatchKit }: { kit: ProjectKit; shape: ShapeId; onPatchKit: (partial: Partial<ProjectKit>) => void }) {
  const C = CHECKLIST_COPY;
  const L = KIT_LIMITS.ownFeatures;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  if ((kit.ownFeatures?.length ?? 0) >= L.max) return null;
  const add = () => {
    if (title.trim().length < L.titleMin) return;
    onPatchKit(addOwnFeature(kit, shape, title, detail).patch);
    setTitle("");
    setDetail("");
    setOpen(false);
  };
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-ink-300 hover:text-ink-50">
        <Plus aria-hidden className="h-3.5 w-3.5" /> {C.featureAddOwn}
      </button>
    );
  return (
    <div className="space-y-2 border-t border-ink-700/40 pt-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Input autoFocus value={title} maxLength={L.titleMax} placeholder={C.featureOwnTitlePlaceholder} aria-label={C.featureOwnTitle} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" />
        <Input value={detail} maxLength={L.detailMax} placeholder={C.featureOwnDetail} aria-label={C.featureOwnDetail} onChange={(e) => setDetail(e.target.value)} className="h-9 text-sm" />
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" disabled={title.trim().length < L.titleMin} onClick={add}>
          {C.featureAdd}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {C.featureCancel}
        </Button>
      </div>
    </div>
  );
}
