"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { BuildChecklist } from "@/components/ideation/kit/BuildChecklist";
import { KitResourceRow } from "@/components/ideation/kit/KitResourceRow";
import { StatusChip } from "@/components/ui/StatusChip";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { checklistFor } from "@/content/kits/checklists";
import { CHECKLIST_COPY, PRIORITY_LABELS, RAIL_COPY, shapeLabels } from "@/content/kits/credit";
import type { ProjectDoc } from "@/lib/ideation";
import {
  KIT_PRIORITY_ORDER,
  type KitPriority,
  type KitResource,
  type KitStep,
  type ProjectKit,
  checklistProgress,
  effectiveSelection,
  groupByPriority,
  packCounts,
  packFor,
  resetSelection,
  selectAllResources,
  toggleResource,
  kitShapes,
} from "@/lib/kits";
import { cn } from "@/lib/utils";

/**
 * The resource pack for a project's shape. Stateless apart from the two
 * view toggles; every tick lives in doc.kit via onPatchKit. Rendered twice by
 * the project editor, once in the desktop rail and once inside a collapsed
 * details element above the form on small screens.
 */
export function KitRail({
  doc,
  kit,
  step,
  onPatchKit,
}: {
  doc: ProjectDoc;
  kit: ProjectKit | undefined;
  /** The editor step in view. null on Review, which shows everything. */
  step: KitStep | null;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const [scope, setScope] = useState<"step" | "all">("step");
  const [deepOpen, setDeepOpen] = useState(false);
  const [view, setView] = useState<"resources" | "build">("resources");

  const fullPack = useMemo(() => packFor(KIT_CATALOG, kit, doc), [kit, doc]);
  const selection = useMemo(
    () => (kit ? effectiveSelection(fullPack, kit) : new Set<string>()),
    [fullPack, kit],
  );
  const effectiveScope = step === null ? "all" : scope;
  const visible = useMemo(
    () => (effectiveScope === "all" || !step ? fullPack : fullPack.filter((r) => r.steps.includes(step))),
    [fullPack, effectiveScope, step],
  );
  const groups = groupByPriority(visible);
  const counts = packCounts(fullPack, selection);
  const ranks = useMemo(() => {
    const m = new Map<string, number>();
    fullPack.filter((r) => r.priority === "core").forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [fullPack]);

  if (!kit?.shape) {
    return (
      <section aria-label={RAIL_COPY.title} className="glass rounded-2xl p-4">
        <Header title={RAIL_COPY.title} />
        <StatusChip tone="neutral" variant="block" className="mt-3">
          {RAIL_COPY.noShape}
        </StatusChip>
      </section>
    );
  }

  const toggle = (r: KitResource) => {
    onPatchKit(toggleResource(kit, r, selection.has(r.id)));
  };
  const build = checklistProgress(checklistFor(kitShapes(kit)), kit);

  return (
    <section aria-label={RAIL_COPY.title} className="glass rounded-2xl p-4">
      <Header
        title={RAIL_COPY.title}
        right={
          <StatusChip tone="info" className="px-2 py-0.5 text-[11px]">
            {view === "build"
              ? CHECKLIST_COPY.progress(build.done, build.total)
              : RAIL_COPY.selectedOf(counts.selected, counts.total)}
          </StatusChip>
        }
      />
      <p className="mt-1 text-xs text-ink-400">{shapeLabels(kit).join(" · ")}</p>

      <div className="mt-3 flex gap-4 border-b border-ink-800/70 text-xs" role="tablist" aria-label={RAIL_COPY.title}>
        {(["resources", "build"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              "-mb-px border-b-2 px-1 pb-2 font-medium transition-colors",
              view === v ? "border-electric-500 text-ink-50" : "border-transparent text-ink-400 hover:text-ink-200",
            )}
          >
            {v === "build" ? CHECKLIST_COPY.tab : CHECKLIST_COPY.resourcesTab}
          </button>
        ))}
      </div>

      {view === "build" ? (
        <BuildChecklist kit={kit} onPatchKit={onPatchKit} />
      ) : (
        <>
      {step !== null && (
        <div className="mt-3 flex gap-1 rounded-full border border-ink-800/70 p-0.5 text-xs" role="tablist">
          {(["step", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={scope === s}
              onClick={() => setScope(s)}
              className={cn(
                "flex-1 rounded-full px-3 py-1 font-medium transition-colors",
                scope === s ? "bg-ink-800 text-ink-50" : "text-ink-400 hover:text-ink-200",
              )}
            >
              {s === "step" ? RAIL_COPY.thisStep : RAIL_COPY.allSteps}
            </button>
          ))}
        </div>
      )}

      {visible.length > 0 && (
        <div className="mt-3 flex items-center justify-end gap-3 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => onPatchKit(selectAllResources(kit, visible))}
            className="text-ink-400 transition-colors hover:text-ink-50"
          >
            {RAIL_COPY.selectAll}
          </button>
          <button
            type="button"
            onClick={() => onPatchKit(resetSelection())}
            className="text-ink-400 transition-colors hover:text-ink-50"
          >
            {RAIL_COPY.coreOnly}
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-4 text-xs leading-relaxed text-ink-400">{RAIL_COPY.noneForStep}</p>
      ) : (
        <div className="mt-3 space-y-4">
          {KIT_PRIORITY_ORDER.map((p) => (
            <PriorityGroup
              key={p}
              priority={p}
              items={groups[p]}
              collapsed={p === "deep_dive" && !deepOpen}
              onExpand={p === "deep_dive" ? () => setDeepOpen((v) => !v) : undefined}
              selection={selection}
              ranks={ranks}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      <p className="mt-4 border-t border-ink-800/70 pt-3 text-[11px] leading-relaxed text-ink-500">
        {RAIL_COPY.footnote}
      </p>
        </>
      )}
    </section>
  );
}

function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-display text-sm font-semibold text-ink-50">{title}</h2>
      {right}
    </div>
  );
}

function PriorityGroup({
  priority,
  items,
  collapsed,
  onExpand,
  selection,
  ranks,
  onToggle,
}: {
  priority: KitPriority;
  items: KitResource[];
  collapsed: boolean;
  onExpand?: () => void;
  selection: ReadonlySet<string>;
  ranks: ReadonlyMap<string, number>;
  onToggle: (r: KitResource) => void;
}) {
  if (items.length === 0) return null;
  const heading = (
    <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
      {PRIORITY_LABELS[priority]}
      <span className="tabular text-ink-600">{items.length}</span>
    </span>
  );
  return (
    <div>
      {onExpand ? (
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={!collapsed}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-ink-900/40"
        >
          {heading}
          <ChevronDown
            aria-hidden
            className={cn("h-3.5 w-3.5 text-ink-500 transition-transform", !collapsed && "rotate-180")}
          />
        </button>
      ) : (
        <div className="px-2 py-1">{heading}</div>
      )}
      {!collapsed && (
        <div className="mt-1 space-y-0.5">
          {items.map((r) => (
            <KitResourceRow
              key={r.id}
              resource={r}
              checked={selection.has(r.id)}
              rank={ranks.get(r.id)}
              onToggle={() => onToggle(r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
