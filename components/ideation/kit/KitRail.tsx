"use client";

import { projectChainOf } from "@/lib/chains";
import { flagsOnChain } from "@/lib/kits";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import Link from "next/link";

import { KitResourceRow } from "@/components/ideation/kit/KitResourceRow";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { StatusChip } from "@/components/ui/StatusChip";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { PRIORITY_LABELS, RAIL_COPY, shapeLabels } from "@/content/kits/copy";
import { templateById } from "@/content/templates";
import { TEMPLATE_COPY, TEMPLATE_KIND_LABELS } from "@/content/templates/copy";
import type { ProjectDoc } from "@/lib/ideation";
import {
  KIT_PRIORITY_ORDER,
  type KitPriority,
  type KitResource,
  type KitStep,
  type ProjectKit,
  effectiveSelection,
  groupByPriority,
  packCounts,
  packFor,
  resetSelection,
  selectAllResources,
  toggleResource,
} from "@/lib/kits";
import { cn } from "@/lib/utils";

/**
 * The resource pack for a project's shape. Stateless apart from the scope
 * toggle; every tick lives in doc.kit via onPatchKit. Rendered twice by the
 * project editor, once in the desktop rail and once inside a collapsed
 * details element above the form on small screens. Build steps left the
 * rail in M43 and are product sections of the editor.
 */
export function KitRail({
  doc,
  kit,
  step,
  onPatchKit,
}: {
  doc: ProjectDoc;
  kit: ProjectKit | undefined;
  /** The editor step in view. null on Review and on a product section, which show everything. */
  step: KitStep | null;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const [scope, setScope] = useState<"step" | "all">("step");
  const [deepOpen, setDeepOpen] = useState(false);

  // Flags are shown as they hold on the project's chain (M52).
  const fullPack = useMemo(() => {
    const chain = projectChainOf(doc);
    return packFor(KIT_CATALOG, kit, doc).map((r) => ({ ...r, flags: flagsOnChain(r, chain) }));
  }, [kit, doc]);
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
      <section aria-label={RAIL_COPY.title} className="glass rounded-xl p-4">
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

  return (
    <section aria-label={RAIL_COPY.title} className="glass rounded-xl p-4">
      <Header
        title={RAIL_COPY.title}
        right={
          <StatusChip tone="info" className="px-2 py-0.5 text-[11px]">
            {RAIL_COPY.selectedOf(counts.selected, counts.total)}
          </StatusChip>
        }
      />
      <p className="mt-1 text-xs text-ink-400">{shapeLabels(kit).join(" · ")}</p>

      <AcceptedTemplates kit={kit} />

      {step !== null && (
        <Segmented
          className="mt-3"
          size="sm"
          role="tablist"
          fill
          value={scope}
          onChange={setScope}
          options={[
            { value: "step", label: RAIL_COPY.thisStep },
            { value: "all", label: RAIL_COPY.allSteps },
          ]}
        />
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
    </section>
  );
}

/** The templates the team accepted across its build steps (M63), with the way to the full catalog. */
function AcceptedTemplates({ kit }: { kit: ProjectKit }) {
  const accepted = Object.entries(kit.templates ?? {})
    .filter(([, d]) => d === "accepted")
    .map(([id]) => templateById(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const list = (
    <ul className="mt-2 space-y-1">
      {accepted.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center gap-1.5 text-xs">
          <a href={t.repoUrl} target="_blank" rel="noreferrer" className="text-ink-100 transition-colors hover:text-electric-200">
            {t.name}
          </a>
          <Badge className="px-1.5 py-0 text-[10px]">{TEMPLATE_KIND_LABELS[t.kind]}</Badge>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="mt-3 border-b border-ink-800/70 pb-3">
      <Header
        title={TEMPLATE_COPY.railTitle}
        right={
          accepted.length ? (
            <StatusChip tone="success" className="px-2 py-0.5 text-[11px]">
              {TEMPLATE_COPY.railCount(accepted.length)}
            </StatusChip>
          ) : undefined
        }
      />
      {accepted.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-500">{TEMPLATE_COPY.railNone}</p>
      ) : accepted.length > 5 ? (
        <details>
          <summary className="mt-2 cursor-pointer text-xs text-ink-400 transition-colors hover:text-ink-200">
            {TEMPLATE_COPY.railCount(accepted.length)}
          </summary>
          {list}
        </details>
      ) : (
        list
      )}
      <Link href="/studio/templates" className="mt-2 inline-block text-[11px] text-electric-300 transition-colors hover:text-electric-200">
        {TEMPLATE_COPY.browse}
      </Link>
    </div>
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
