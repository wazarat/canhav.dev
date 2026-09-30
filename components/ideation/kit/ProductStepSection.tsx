"use client";

import { Badge } from "@/components/ui/Badge";
import { CheckItem } from "@/components/ui/CheckItem";
import { StatusChip } from "@/components/ui/StatusChip";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { CHECKLIST_COPY, STEP_LABELS_KIT, shapeBlurb, shapeLabel } from "@/content/kits/copy";
import {
  type ProductSection,
  type ProjectKit,
  type StepGroup,
  groupProgress,
  groupState,
  toggleStepGroup,
} from "@/lib/kits";

const TITLE_BY_ID = new Map(KIT_CATALOG.map((r) => [r.id, r] as const));

/**
 * One product section of the editor (M43): the ordered build steps for one
 * shape the builder chose. A step shared with other chosen shapes is listed
 * once, under the first of them, with a note; ticking it ticks every
 * underlying per-shape id. Done state lives in kit.checklist.
 */
export function ProductStepSection({
  section,
  kit,
  onPatchKit,
}: {
  section: ProductSection;
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
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
              <li key={group.key}>
                <CheckItem
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
                        <Badge className="px-2 py-0 text-[10px]">{STEP_LABELS_KIT[group.step]}</Badge>
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
              </li>
            );
          })}
        </ol>
      )}

      {section.sharedAbove.length ? (
        <p className="border-t border-ink-800/70 pt-3 text-xs leading-relaxed text-ink-500">
          {CHECKLIST_COPY.sharedAbove(section.sharedAbove.length, aboveHomes)}
        </p>
      ) : null}
    </div>
  );
}
