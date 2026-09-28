"use client";

import { Badge } from "@/components/ui/Badge";
import { CheckItem } from "@/components/ui/CheckItem";
import { StatusChip } from "@/components/ui/StatusChip";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { checklistFor } from "@/content/kits/checklists";
import { CHECKLIST_COPY, STEP_LABELS_KIT } from "@/content/kits/copy";
import { type ProjectKit, checklistProgress, kitShapes, toggleChecklistItem } from "@/lib/kits";

const TITLE_BY_ID = new Map(KIT_CATALOG.map((r) => [r.id, r] as const));

/**
 * The ordered build steps for a shape. Each row is a checkbox with the step
 * it informs and the resources that help. Done state lives in kit.checklist.
 */
export function BuildChecklist({
  kit,
  onPatchKit,
}: {
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const items = checklistFor(kitShapes(kit));
  if (items.length === 0) {
    return (
      <StatusChip tone="neutral" variant="block" className="mt-3">
        {CHECKLIST_COPY.none}
      </StatusChip>
    );
  }
  const progress = checklistProgress(items, kit);
  return (
    <div className="mt-3 space-y-1">
      <p className="px-2 text-[11px] leading-relaxed text-ink-500">{CHECKLIST_COPY.intro}</p>
      <ol className="mt-1 space-y-0.5">
        {items.map((item, i) => {
          const done = kit.checklist?.[item.id] === true;
          const links = item.resources
            .map((id) => TITLE_BY_ID.get(id))
            .filter((r): r is NonNullable<typeof r> => Boolean(r));
          return (
            <li key={item.id}>
              <CheckItem
                checked={done}
                onChange={(v) => onPatchKit(toggleChecklistItem(kit, item.id, v))}
                label={
                  <span className={done ? "text-ink-400 line-through decoration-ink-600" : undefined}>
                    <span className="mr-1.5 tabular text-ink-500">{i + 1}.</span>
                    {item.title}
                  </span>
                }
                description={
                  <span className="block space-y-1.5">
                    <span className="block">{item.detail}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge className="px-2 py-0 text-[10px]">{STEP_LABELS_KIT[item.step]}</Badge>
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
                  </span>
                }
              />
            </li>
          );
        })}
      </ol>
      <p className="border-t border-ink-800/70 px-2 pt-3 text-[11px] text-ink-500">
        {CHECKLIST_COPY.progress(progress.done, progress.total)}
      </p>
    </div>
  );
}
