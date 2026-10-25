"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { Segmented } from "@/components/ui/Segmented";
import { VIABILITY_COPY } from "@/content/viability";
import { PROJECT_CHAINS, type ProjectChain } from "@/lib/chains";
import { formatDayShort } from "@/lib/format";
import type { GapMap as GapMapData, GapSubsector } from "@/lib/gaps";
import type { Subsector } from "@/lib/sectors";
import { cn } from "@/lib/utils";

const C = VIABILITY_COPY.gaps;

/** Sequential shading on the ink scale (M165): the lightest tile for nothing, then three steps by quartile of the non zero counts. */
function shade(count: number, cuts: readonly number[]): string {
  if (count === 0) return "bg-ink-900";
  if (count <= cuts[0]) return "bg-ink-800";
  if (count <= cuts[1]) return "bg-ink-700";
  return "bg-ink-600";
}

function cutsOf(map: GapMapData): [number, number] {
  const counts = map.sectors.flatMap((s) => s.subsectors.map((x) => x.count)).filter((n) => n > 0).sort((a, b) => a - b);
  if (counts.length === 0) return [0, 0];
  const q = (p: number) => counts[Math.min(counts.length - 1, Math.floor(p * (counts.length - 1)))];
  return [q(1 / 3), q(2 / 3)];
}

function monthLabel(month: string | null): string {
  if (!month) return "";
  const d = new Date(`${month}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * The gap map (M165, V2): six sector columns with one tile per subsector,
 * the count as a number, up to three names, shading by count on the ink
 * scale, the project's own subsectors outlined, and a tile's full list
 * under the matrix on hover, focus or tap. Below md the matrix is one
 * list per sector. The sentence above is the text equivalent.
 */
export function GapMapView({ map, yours, className }: { map: GapMapData; yours: ReadonlySet<Subsector>; className?: string }) {
  const [active, setActive] = useState<Subsector | null>(null);
  const [pinned, setPinned] = useState<Subsector | null>(null);
  const cuts = cutsOf(map);
  const all = map.sectors.flatMap((s) => s.subsectors);
  const live = all.filter((x) => x.count > 0).length;
  const shown = all.find((x) => x.subsector === (pinned ?? active)) ?? null;
  const openLabels = map.open.map((o) => all.find((x) => x.subsector === o)?.label ?? o);
  const tile = (x: GapSubsector) => (
    <button
      key={x.subsector}
      type="button"
      aria-pressed={pinned === x.subsector}
      aria-label={C.details(x.label, x.count, map.chainName)}
      onMouseEnter={() => setActive(x.subsector)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(x.subsector)}
      onBlur={() => setActive(null)}
      onClick={() => setPinned((p) => (p === x.subsector ? null : x.subsector))}
      className={cn(
        "flex min-h-[5.5rem] w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-500/60",
        shade(x.count, cuts),
        yours.has(x.subsector) ? "border-electric-400 ring-1 ring-electric-400" : "border-ink-700/40 hover:border-ink-500",
        pinned === x.subsector && "border-ink-300",
      )}
    >
      <span className="text-xs font-medium leading-tight text-ink-50">{x.label}</span>
      <span className={cn("mt-1 font-display text-lg leading-none", x.count === 0 ? "text-ink-400" : "text-ink-50")}>{x.count}</span>
      <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-300">{x.count === 0 ? C.none : x.names.slice(0, 3).map((n) => n.name).join(", ")}</span>
      {yours.has(x.subsector) ? <span className="mt-auto pt-1 text-[10px] text-electric-400">{C.yours}</span> : null}
    </button>
  );
  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-base leading-relaxed text-ink-100">{C.sentence(live, all.length, map.chainName, openLabels)}</p>
      {/* The matrix, six columns from md up. */}
      <div className="hidden gap-2 md:grid md:grid-cols-6">
        {map.sectors.map((s) => (
          <div key={s.sector} className="space-y-2">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-ink-400" title={s.label}>
              {s.label}
            </p>
            {s.subsectors.map(tile)}
          </div>
        ))}
      </div>
      {/* One list per sector below md. */}
      <div className="space-y-4 md:hidden">
        {map.sectors.map((s) => (
          <div key={s.sector} className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{s.label}</p>
            <ul className="space-y-1.5">
              {s.subsectors.map((x) => (
                <li key={x.subsector}>
                  <button
                    type="button"
                    aria-pressed={pinned === x.subsector}
                    onClick={() => setPinned((p) => (p === x.subsector ? null : x.subsector))}
                    className={cn("w-full rounded-lg border px-3 py-2 text-left text-sm leading-relaxed text-ink-200", shade(x.count, cuts), yours.has(x.subsector) ? "border-electric-400" : "border-ink-700/40")}
                  >
                    <span className="font-medium text-ink-50">{x.label}</span>
                    {`, ${x.count === 0 ? C.none.toLowerCase() : `${C.count(x.count)}, ${x.names.slice(0, 3).map((n) => n.name).join(", ")}`}`}
                    {yours.has(x.subsector) ? <span className="text-electric-400">{` · ${C.yours}`}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {shown ? (
        <div className="space-y-1 text-sm leading-relaxed text-ink-200" aria-live="polite">
          <p className="text-ink-100">
            {C.details(shown.label, shown.count, map.chainName)}
            {pinned ? (
              <>
                {" "}
                <button type="button" onClick={() => setPinned(null)} className="text-xs text-ink-400 underline-offset-2 hover:text-ink-50 hover:underline">
                  {C.close}
                </button>
              </>
            ) : null}
          </p>
          {shown.names.length ? (
            <p className="text-ink-300">
              {shown.names.map((n, i) => (
                <span key={`${n.source}:${n.name}`}>
                  {i > 0 ? ", " : ""}
                  {n.url ? (
                    <a href={n.url} target={n.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink-200 underline-offset-2 hover:text-ink-50 hover:underline">
                      {n.name}
                      {n.url.startsWith("/") ? null : <ExternalLink aria-hidden className="h-3 w-3" />}
                    </a>
                  ) : (
                    n.name
                  )}
                  {n.source !== "llama" ? <span className="text-ink-500">{` (${C.sources[n.source]})`}</span> : null}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-ink-400">
        {C.openLine(openLabels)} {map.month && map.readAt ? C.source(monthLabel(map.month), formatDayShort(map.readAt)) : C.noSnapshot}
      </p>
    </div>
  );
}

/** Reads a gap map; `url` builds the request for a chain. */
export function useGapMap(url: (chain: ProjectChain) => string, chain: ProjectChain, enabled = true): { map: GapMapData | null; state: "idle" | "loading" | "failed" } {
  const [map, setMap] = useState<GapMapData | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState("loading");
    fetch(url(chain))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { map: GapMapData }) => {
        if (cancelled) return;
        setMap(d.map);
        setState("idle");
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, enabled]);
  return { map, state };
}

/**
 * The section on the Viability tab: a chain switch, the map for the
 * project's chain by default, and the summary line for the card on top.
 */
export function GapMapSection({ projectId, chain, yourSubsectors, onSummary }: { projectId: string; chain: ProjectChain; yourSubsectors: readonly Subsector[]; onSummary: (line: string | null) => void }) {
  const [picked, setPicked] = useState<ProjectChain>(chain);
  const { map, state } = useGapMap((c) => `/api/ideation/projects/${projectId}/gaps?chain=${c}`, picked);
  const yours = new Set(yourSubsectors);
  useEffect(() => {
    if (!map || picked !== chain) return;
    const all = map.sectors.flatMap((s) => s.subsectors);
    const openYours = all.filter((x) => yours.has(x.subsector) && x.count === 0).map((x) => x.label);
    const openAll = map.open.map((o) => all.find((x) => x.subsector === o)?.label ?? o);
    onSummary(openYours.length ? C.yoursOpen(openYours, map.chainName) : yours.size ? C.yoursLive(map.chainName) : C.yoursNone(openAll, map.chainName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, picked, chain]);
  return (
    <div className="space-y-4">
      <Segmented
        size="sm"
        ariaLabel={C.chainLabel}
        value={picked}
        onChange={setPicked}
        options={PROJECT_CHAINS.map((c) => ({ value: c, label: C.chains[c] }))}
      />
      {map ? <GapMapView map={map} yours={yours} /> : state === "failed" ? <p className="text-sm text-rose-400">{C.failed}</p> : <p className="text-sm text-ink-500">{C.loading}</p>}
    </div>
  );
}
