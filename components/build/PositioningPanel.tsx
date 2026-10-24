"use client";

import { PositioningMap } from "@/components/build/PositioningMap";
import { Segmented } from "@/components/ui/Segmented";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { LlamaProtocol } from "@/lib/competitors/llama";
import { COMPETITOR_AXES, COMPETITOR_LIMITS, type CompetitorAxis, type Competitors, DEFAULT_AXES, pickAxis } from "@/lib/competitors/record";

/**
 * The map with its axis pickers (M156): the two metrics can never sit on
 * both axes, picking the one already across swaps them. The pinned rows
 * lead and the largest fill the rest, a dot click pins.
 */
export function PositioningPanel({
  rows,
  value,
  onChange,
  projectAgeMonths,
  projectName,
  projectTvl = null,
}: {
  rows: LlamaProtocol[];
  value: Competitors;
  onChange: (next: Competitors) => void;
  projectAgeMonths: number;
  projectName: string;
  projectTvl?: number | null;
}) {
  const C = STUDIO_PLUS_COPY.competitors;
  const axes = value.axes ?? DEFAULT_AXES;
  const pinned = new Set(value.pinned ?? []);
  const togglePin = (slug: string) => {
    const next = new Set(pinned);
    if (next.has(slug)) next.delete(slug);
    else if (next.size < COMPETITOR_LIMITS.pinned.max) next.add(slug);
    onChange({ ...value, pinned: [...next] });
  };
  const setAxis = (which: "x" | "y", v: CompetitorAxis) => onChange({ ...value, axes: pickAxis(axes, which, v) });
  const mapRows = [...rows.filter((r) => pinned.has(r.slug)), ...rows.filter((r) => !pinned.has(r.slug))].slice(0, Math.max(COMPETITOR_LIMITS.mapRows, pinned.size));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink-200">
          {C.mapTitle} <span className="font-normal text-ink-500">· {C.pinned(pinned.size)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-400">
          <span>{C.axisX}</span>
          <Segmented value={axes.x} onChange={(v) => setAxis("x", v)} ariaLabel={C.axisX} options={COMPETITOR_AXES.map((a) => ({ value: a, label: C.axes[a] }))} />
          <span>{C.axisY}</span>
          <Segmented value={axes.y} onChange={(v) => setAxis("y", v)} ariaLabel={C.axisY} options={COMPETITOR_AXES.map((a) => ({ value: a, label: C.axes[a] }))} />
        </div>
      </div>
      <PositioningMap rows={mapRows} axes={axes} projectAgeMonths={projectAgeMonths} projectName={projectName} projectTvl={projectTvl} pinned={pinned} onPin={togglePin} />
      <p className="text-[11px] text-ink-500">{C.mapHint}</p>
    </div>
  );
}
