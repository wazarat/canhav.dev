"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheckItem } from "@/components/ui/CheckItem";
import { StatusChip } from "@/components/ui/StatusChip";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { CHECKLIST_COPY, STEP_LABELS_KIT, shapeBlurb, shapeLabel } from "@/content/kits/copy";
import {
  KIT_LIMITS,
  type ProductSection,
  type ProjectKit,
  type StepGroup,
  addCustomStep,
  groupProgress,
  groupState,
  removeStepGroup,
  restoreSteps,
  toggleStepGroup,
} from "@/lib/kits";

const TITLE_BY_ID = new Map(KIT_CATALOG.map((r) => [r.id, r] as const));

/**
 * One product section of the editor (M43): the ordered build steps for one
 * shape the builder chose. A step shared with other chosen shapes is listed
 * once, under the first of them, with a note; ticking it ticks every
 * underlying per-shape id. Done state lives in kit.checklist. The builder
 * can remove any step (a catalog step can be restored) and add their own
 * under the shape (M50); both live on the kit.
 */
export function ProductStepSection({
  section,
  removed = [],
  kit,
  onPatchKit,
}: {
  section: ProductSection;
  /** Catalog steps the team removed from this section (M50). */
  removed?: readonly StepGroup[];
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const L = KIT_LIMITS.customSteps;
  const full = (kit.customSteps?.length ?? 0) >= L.max;
  const canAdd = title.trim().length >= L.titleMin && !full;
  const add = () => {
    if (!canAdd) return;
    onPatchKit(addCustomStep(kit, section.shape, title, detail));
    setTitle("");
    setDetail("");
  };
  const label = shapeLabel(section.shape) ?? section.shape;
  const progress = groupProgress(section.groups, kit);
  const other = (g: StepGroup) => g.shapes.filter((s) => s !== section.shape).map((s) => shapeLabel(s) ?? s);
  const aboveHomes = [...new Set(section.sharedAbove.map((g) => shapeLabel(g.shapes[0]) ?? g.shapes[0]))];

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink-50">{label}</h2>
          {section.groups.length ? (
            <StatusChip tone={progress.done === progress.total ? "success" : "neutral"}>
              {CHECKLIST_COPY.progress(progress.done, progress.total)}
            </StatusChip>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-400">{shapeBlurb(section.shape)}</p>
      </div>

      <StatusChip tone="info" variant="block">
        <span className="block">{CHECKLIST_COPY.productIntro}</span>
        <span className="mt-1 block text-ink-400">{CHECKLIST_COPY.intro}</span>
      </StatusChip>

      {section.groups.length === 0 && section.sharedAbove.length === 0 ? (
        <StatusChip tone="neutral" variant="block">
          {CHECKLIST_COPY.none}
        </StatusChip>
      ) : (
        <ol className="space-y-1">
          {section.groups.map((group, i) => {
            const state = groupState(group, kit);
            const done = state === "done";
            const links = group.resources
              .map((id) => TITLE_BY_ID.get(id))
              .filter((r): r is NonNullable<typeof r> => Boolean(r));
            const others = other(group);
            return (
              <li key={group.key} className="flex items-start gap-1">
                <CheckItem
                  className="min-w-0 flex-1"
                  checked={done}
                  onChange={(v) => onPatchKit(toggleStepGroup(kit, group, v))}
                  label={
                    <span className={done ? "text-ink-400 line-through decoration-ink-600" : undefined}>
                      <span className="mr-1.5 tabular text-ink-500">{i + 1}.</span>
                      {group.title}
                    </span>
                  }
                  description={
                    <span className="block space-y-1.5">
                      <span className="block">{group.detail}</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge className="px-2 py-0 text-[10px]">
                          {group.custom ? CHECKLIST_COPY.customBadge : STEP_LABELS_KIT[group.step]}
                        </Badge>
                        {links.map((r) => (
                          <a
                            key={r.id}
                            href={r.href}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-electric-400 transition-colors hover:text-ink-50"
                          >
                            {r.title}
                          </a>
                        ))}
                      </span>
                      {others.length ? (
                        <span className="block text-[11px] text-ink-500">{CHECKLIST_COPY.sharedNote(others)}</span>
                      ) : null}
                      {state === "partial" ? (
                        <StatusChip tone="neutral" className="px-2 py-0.5 text-[11px]">
                          {CHECKLIST_COPY.partial(
                            group.ids.filter((id) => kit.checklist?.[id] === true).length,
                            group.ids.length,
                          )}
                        </StatusChip>
                      ) : null}
                    </span>
                  }
                />
                <button
                  type="button"
                  aria-label={CHECKLIST_COPY.remove(group.title)}
                  title={CHECKLIST_COPY.remove(group.title)}
                  onClick={() => onPatchKit(removeStepGroup(kit, group))}
                  className="mt-2 shrink-0 rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-900/40 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-2 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
        <p className="text-xs font-medium text-ink-200">{CHECKLIST_COPY.addTitle}</p>
        <p className="text-xs leading-relaxed text-ink-500">
          {full ? CHECKLIST_COPY.addLimit(L.max) : CHECKLIST_COPY.addHint}
        </p>
        <Input
          value={title}
          maxLength={L.titleMax}
          disabled={full}
          placeholder={CHECKLIST_COPY.addPlaceholder}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Input
          value={detail}
          maxLength={L.detailMax}
          disabled={full}
          placeholder={CHECKLIST_COPY.addDetailPlaceholder}
          onChange={(e) => setDetail(e.target.value)}
        />
        <Button size="sm" variant="outline" disabled={!canAdd} onClick={add}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> {CHECKLIST_COPY.addButton}
        </Button>
      </div>

      {removed.length ? (
        <details>
          <summary className="cursor-pointer text-xs text-ink-400 transition-colors hover:text-ink-200">
            {CHECKLIST_COPY.removedTitle}
            <span className="ml-1.5 text-ink-500">{removed.length}</span>
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">{CHECKLIST_COPY.removedHint}</p>
          <ul className="mt-2 space-y-1.5">
            {removed.map((group) => {
              const others = other(group);
              return (
                <li key={group.key} className="flex items-start justify-between gap-3 text-xs text-ink-400">
                  <span className="min-w-0">
                    {group.title}
                    {others.length ? (
                      <span className="block text-[11px] text-ink-500">{CHECKLIST_COPY.removedShared(others)}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPatchKit(restoreSteps(kit, group.ids))}
                    className="shrink-0 text-electric-300 transition-colors hover:text-electric-200"
                  >
                    {CHECKLIST_COPY.restore}
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}

      {section.sharedAbove.length ? (
        <p className="border-t border-ink-800/70 pt-3 text-xs leading-relaxed text-ink-500">
          {CHECKLIST_COPY.sharedAbove(section.sharedAbove.length, aboveHomes)}
        </p>
      ) : null}
    </div>
  );
}
