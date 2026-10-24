"use client";

import { useEffect, useState } from "react";

import { DraftControl, type DraftMeta } from "@/components/build/DraftControl";
import type { AgentWriteMode } from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";
import { PositioningMap } from "@/components/build/PositioningMap";
import { TextField } from "@/components/ideation/TextField";
import { Segmented } from "@/components/ui/Segmented";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { draftCompetitorsPrompt } from "@/lib/agent-prompts-draft";
import { chainInfo } from "@/lib/chains";
import type { Landscape } from "@/lib/competitors/landscape";
import { formatTvl } from "@/lib/competitors/tvl";
import { COMPETITOR_AXES, COMPETITOR_LIMITS, type CompetitorAxis, type Competitors, ageMonths } from "@/lib/competitors/record";

/**
 * The competitor landscape on Decisions (M115): the table of protocols in
 * the subsector on the chain from this month's snapshot, the positioning
 * map with the project on it, the pins, and the differentiator line with
 * Draft. Facts read as plain text; nothing here is a chip.
 */
export function CompetitorsSection({
  projectId,
  name,
  meta,
  patch,
  agentMode,
  createdAt,
  value,
  onChange,
}: {
  projectId: string;
  name: string;
  /** The record's draft requests and marks, the patch that writes them, and the agent mode (M117). */
  meta: DraftMeta;
  patch: (p: Partial<ProjectDoc>) => void;
  agentMode: AgentWriteMode;
  /** ISO time the project was started, for the project's age on the map. */
  createdAt: string;
  value: Competitors | undefined;
  onChange: (next: Competitors) => void;
}) {
  const C = STUDIO_PLUS_COPY.competitors;
  const [landscape, setLandscape] = useState<Landscape | null>(null);
  const [failed, setFailed] = useState(false);
  const current: Competitors = value ?? { differentiator: "" };
  const axes = current.axes ?? { x: "age", y: "tvl" };
  const pinned = new Set(current.pinned ?? []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ideation/projects/${projectId}/competitors`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { landscape: Landscape }) => {
        if (!cancelled) setLandscape(d.landscape);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const togglePin = (slug: string) => {
    const next = new Set(pinned);
    if (next.has(slug)) next.delete(slug);
    else if (next.size < COMPETITOR_LIMITS.pinned.max) next.add(slug);
    onChange({ ...current, pinned: [...next] });
  };
  const setAxis = (which: "x" | "y", v: CompetitorAxis) => onChange({ ...current, axes: { ...axes, [which]: v } });

  const rows = landscape?.rows ?? [];
  const mapRows = [...rows.filter((r) => pinned.has(r.slug)), ...rows.filter((r) => !pinned.has(r.slug))].slice(0, Math.max(COMPETITOR_LIMITS.mapRows, pinned.size));
  const projectAge = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / (30 * 86_400_000)));
  const facts = landscape
    ? [
        C.categories(landscape.categories.join(", ") || "none"),
        landscape.onChain ? C.onChain(chainInfo(landscape.chain).name) : C.anyChain,
        C.month(landscape.month),
        landscape.kitFamilies.length ? C.kit(landscape.kitFamilies.join(", ")) : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      {failed ? (
        <p className="text-xs text-rose-400">{C.failed}</p>
      ) : !landscape ? (
        <p className="text-xs text-ink-500">{C.loading}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-ink-400">{C.none}</p>
      ) : (
        <>
          <p className="text-xs text-ink-400">{facts.join(" · ")}</p>
          <div className="overflow-x-auto rounded-lg border border-ink-700/60">
            <table className="w-full text-left text-xs">
              <thead className="text-ink-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{C.table.name}</th>
                  <th className="px-3 py-2 font-medium">{C.table.category}</th>
                  <th className="px-3 py-2 font-medium">{C.table.tvl}</th>
                  <th className="px-3 py-2 font-medium">{C.table.chains}</th>
                  <th className="px-3 py-2 font-medium">{C.table.listed}</th>
                  <th className="px-3 py-2 font-medium">{C.table.pin}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/40 text-ink-200">
                {rows.slice(0, 20).map((r) => {
                  const age = ageMonths(r.listedAt);
                  return (
                    <tr key={r.slug}>
                      <td className="px-3 py-2">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-ink-100 hover:underline">
                            {r.name}
                          </a>
                        ) : (
                          r.name
                        )}
                      </td>
                      <td className="px-3 py-2 text-ink-400">{r.category}</td>
                      <td className="px-3 py-2 tabular-nums">{formatTvl(r.tvl)}</td>
                      <td className="px-3 py-2 text-ink-400">{r.chains.slice(0, 3).join(", ")}{r.chains.length > 3 ? ` +${r.chains.length - 3}` : ""}</td>
                      <td className="px-3 py-2 text-ink-400">{age === null ? "" : `${age} mo`}</td>
                      <td className="px-3 py-2">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded border-ink-600 bg-ink-900" checked={pinned.has(r.slug)} onChange={() => togglePin(r.slug)} aria-label={`${C.table.pin} ${r.name}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            <PositioningMap rows={mapRows} axes={axes} projectAgeMonths={projectAge} />
            <p className="text-[11px] text-ink-500">{C.mapHint}</p>
          </div>
        </>
      )}
      <div className="space-y-3">
        <TextField label={C.differentiator} hint={C.differentiatorHint} value={current.differentiator} onChange={(v) => onChange({ ...current, differentiator: v })} max={COMPETITOR_LIMITS.differentiator.max} rows={2} />
        <DraftControl<{ differentiator: string }>
          projectId={projectId}
          doc={meta}
          patch={patch}
          agentMode={agentMode}
          kind="competitors"
          label={C.draft}
          onResult={(v) => onChange({ ...current, differentiator: v.differentiator })}
          agentPrompt={draftCompetitorsPrompt(name, projectId)}
        />
      </div>
    </div>
  );
}
