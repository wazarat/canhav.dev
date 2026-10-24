"use client";

import { useState } from "react";

import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { LlamaProtocol } from "@/lib/competitors/llama";
import { type CompetitorAxis, ageMonths } from "@/lib/competitors/record";
import { formatTvl } from "@/lib/competitors/tvl";
import { cn } from "@/lib/utils";

const W = 560;
const H = 320;
const PAD = { l: 52, r: 16, t: 16, b: 40 };
const DOT = 4;
const FONT = 11;
const CHAR = 6;
const LINE = 13;

function logTvl(tvl: number): number {
  return Math.log10(Math.max(tvl, 1000));
}

/** A whole power of ten as a tick label, $1K, $10M, $1B. */
function tickTvl(p: number): string {
  if (p >= 9) return `$${10 ** (p - 9)}B`;
  if (p >= 6) return `$${10 ** (p - 6)}M`;
  if (p >= 3) return `$${10 ** (p - 3)}K`;
  return `$${10 ** p}`;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function inside(b: Box): boolean {
  return b.x >= PAD.l && b.x + b.w <= W - PAD.r && b.y >= PAD.t && b.y + b.h <= H - PAD.b;
}

/**
 * The positioning map (M115, redrawn in M156): the protocols as small dots
 * on two axes that never share a metric, TVL on a log scale with $1M style
 * ticks and age in years. Labels are placed right, left, above or below
 * the dot where they fit and hide otherwise, shown on hover and focus with
 * the full name. Pinned protocols are the electric dots; a click pins. The
 * project is never drawn at zero TVL: with age across it is a marker at
 * its age, else a note under the map.
 */
export function PositioningMap({
  rows,
  axes,
  projectAgeMonths,
  projectName,
  projectTvl = null,
  pinned,
  onPin,
}: {
  rows: LlamaProtocol[];
  axes: { x: CompetitorAxis; y: CompetitorAxis };
  /** Months since the project was started in the studio. */
  projectAgeMonths: number;
  projectName: string;
  /** The project's own TVL in USD when it has one; null draws a marker or a note instead of a dot. */
  projectTvl?: number | null;
  pinned: ReadonlySet<string>;
  onPin?: (slug: string) => void;
}) {
  const C = STUDIO_PLUS_COPY.competitors;
  const [active, setActive] = useState<string | null>(null);
  const value = (r: LlamaProtocol, axis: CompetitorAxis): number | null => (axis === "tvl" ? logTvl(r.tvl) : ageMonths(r.listedAt));
  const points = rows
    .map((r) => ({ r, x: value(r, axes.x), y: value(r, axes.y) }))
    .filter((p): p is { r: LlamaProtocol; x: number; y: number } => p.x !== null && p.y !== null);
  const hasYou = projectTvl !== null && projectTvl > 0;
  const you = hasYou ? { x: axes.x === "tvl" ? logTvl(projectTvl) : projectAgeMonths, y: axes.y === "tvl" ? logTvl(projectTvl) : projectAgeMonths } : null;
  const xs = [...points.map((p) => p.x), ...(you ? [you.x] : []), ...(axes.x === "age" ? [projectAgeMonths] : [])];
  const ys = [...points.map((p) => p.y), ...(you ? [you.y] : [])];
  // The domain: whole powers of ten for TVL, whole years for age, so the ticks sit on round values.
  const domain = (vals: number[], axis: CompetitorAxis): [number, number] => {
    if (!vals.length) return axis === "tvl" ? [3, 9] : [0, 12];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (axis === "tvl") return [Math.floor(lo), Math.max(Math.ceil(hi), Math.floor(lo) + 1)];
    return [0, Math.max(12, Math.ceil((hi + 1) / 12) * 12)];
  };
  const [minX, maxX] = domain(xs, axes.x);
  const [minY, maxY] = domain(ys, axes.y);
  const sx = (v: number) => PAD.l + ((v - minX) / (maxX - minX)) * (W - PAD.l - PAD.r);
  const sy = (v: number) => H - PAD.b - ((v - minY) / (maxY - minY)) * (H - PAD.t - PAD.b);
  const ticks = (axis: CompetitorAxis, lo: number, hi: number): Array<{ v: number; label: string }> => {
    if (axis === "tvl") {
      const out: Array<{ v: number; label: string }> = [];
      for (let p = lo; p <= hi; p++) out.push({ v: p, label: tickTvl(p) });
      return out;
    }
    const step = hi > 60 ? 24 : 12;
    const out: Array<{ v: number; label: string }> = [];
    for (let m = lo; m <= hi; m += step) out.push({ v: m, label: m === 0 ? "0" : `${m / 12}y` });
    return out;
  };
  const label = (axis: CompetitorAxis) => (axis === "tvl" ? `${C.axes.tvl} (log)` : `${C.axes.age} (years)`);

  // Label placement: right, left, above, below, else hidden until hover or focus.
  const taken: Box[] = points.map((p) => ({ x: sx(p.x) - DOT, y: sy(p.y) - DOT, w: DOT * 2, h: DOT * 2 }));
  const placed = new Map<string, { x: number; y: number; anchor: "start" | "end" | "middle" }>();
  for (const p of points) {
    const w = Math.min(p.r.name.length, 24) * CHAR;
    const cx = sx(p.x);
    const cy = sy(p.y);
    const candidates: Array<{ box: Box; x: number; y: number; anchor: "start" | "end" | "middle" }> = [
      { box: { x: cx + DOT + 4, y: cy - LINE / 2, w, h: LINE }, x: cx + DOT + 4, y: cy + 4, anchor: "start" },
      { box: { x: cx - DOT - 4 - w, y: cy - LINE / 2, w, h: LINE }, x: cx - DOT - 4, y: cy + 4, anchor: "end" },
      { box: { x: cx - w / 2, y: cy - DOT - 4 - LINE, w, h: LINE }, x: cx, y: cy - DOT - 6, anchor: "middle" },
      { box: { x: cx - w / 2, y: cy + DOT + 4, w, h: LINE }, x: cx, y: cy + DOT + 4 + FONT, anchor: "middle" },
    ];
    const fit = candidates.find((c) => inside(c.box) && !taken.some((t) => overlaps(t, c.box)));
    if (fit) {
      taken.push(fit.box);
      placed.set(p.r.slug, { x: fit.x, y: fit.y, anchor: fit.anchor });
    }
  }
  const short = (name: string) => (name.length > 24 ? `${name.slice(0, 23)}…` : name);
  const activeRow = points.find((p) => p.r.slug === active)?.r ?? null;
  const listed = (r: LlamaProtocol) => (r.listedAt ? new Date(r.listedAt * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "");

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={C.mapTitle} className="block w-full">
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} className="fill-transparent stroke-ink-700" strokeWidth={1} />
        {ticks(axes.x, minX, maxX).map((t) => (
          <g key={`x${t.v}`}>
            <line x1={sx(t.v)} y1={H - PAD.b} x2={sx(t.v)} y2={H - PAD.b + 4} className="stroke-ink-700" />
            <text x={sx(t.v)} y={H - PAD.b + 15} fontSize={10} textAnchor="middle" className="fill-ink-500">
              {t.label}
            </text>
          </g>
        ))}
        {ticks(axes.y, minY, maxY).map((t) => (
          <g key={`y${t.v}`}>
            <line x1={PAD.l - 4} y1={sy(t.v)} x2={PAD.l} y2={sy(t.v)} className="stroke-ink-700" />
            <text x={PAD.l - 7} y={sy(t.v) + 3} fontSize={10} textAnchor="end" className="fill-ink-500">
              {t.label}
            </text>
          </g>
        ))}
        {/* The project at its age when age runs across and it has no TVL yet. */}
        {!you && axes.x === "age" ? (
          <g>
            <line x1={sx(projectAgeMonths)} y1={PAD.t} x2={sx(projectAgeMonths)} y2={H - PAD.b} className="stroke-neon-400" strokeDasharray="3 3" />
            <text x={sx(projectAgeMonths) + 4} y={PAD.t + 12} fontSize={FONT} fontWeight={600} className="fill-neon-400">
              {C.you}
            </text>
          </g>
        ) : null}
        {points.map((p) => {
          const cx = sx(p.x);
          const cy = sy(p.y);
          const isPinned = pinned.has(p.r.slug);
          const isActive = active === p.r.slug;
          const at = placed.get(p.r.slug);
          const showLabel = Boolean(at) || isActive;
          return (
            <g
              key={p.r.slug}
              tabIndex={0}
              role={onPin ? "button" : undefined}
              aria-label={`${p.r.name}${isPinned ? `, ${C.hoveredPinned}` : ""}`}
              aria-pressed={onPin ? isPinned : undefined}
              onMouseEnter={() => setActive(p.r.slug)}
              onMouseLeave={() => setActive((a) => (a === p.r.slug ? null : a))}
              onFocus={() => setActive(p.r.slug)}
              onBlur={() => setActive((a) => (a === p.r.slug ? null : a))}
              onClick={() => onPin?.(p.r.slug)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && onPin) {
                  e.preventDefault();
                  onPin(p.r.slug);
                }
              }}
              className={cn("outline-none", onPin && "cursor-pointer")}
            >
              <circle cx={cx} cy={cy} r={isActive ? DOT + 1 : DOT} className={cn(isPinned ? "fill-electric-400" : "fill-ink-400", isActive && "stroke-ink-100")} strokeWidth={1} />
              {showLabel ? (
                <text
                  x={at ? at.x : cx + DOT + 4}
                  y={at ? at.y : cy + 4}
                  fontSize={FONT}
                  textAnchor={at ? at.anchor : "start"}
                  className={cn("fill-ink-300", isActive && "fill-ink-50")}
                >
                  {isActive ? p.r.name : short(p.r.name)}
                </text>
              ) : null}
              <title>{`${p.r.name}, TVL ${formatTvl(p.r.tvl)}${listed(p.r) ? `, listed ${listed(p.r)}` : ""}`}</title>
            </g>
          );
        })}
        {you ? (
          <g>
            <circle cx={sx(you.x)} cy={sy(you.y)} r={DOT + 4} className="fill-transparent stroke-neon-400" strokeWidth={1.5} />
            <circle cx={sx(you.x)} cy={sy(you.y)} r={DOT + 1} className="fill-neon-400" />
            <text x={sx(you.x) + DOT + 8} y={sy(you.y) + 4} fontSize={FONT} fontWeight={600} className="fill-ink-50">
              {C.you}
            </text>
          </g>
        ) : null}
        <text x={PAD.l + (W - PAD.l - PAD.r) / 2} y={H - 6} fontSize={10} textAnchor="middle" className="fill-ink-500">
          {label(axes.x)}
        </text>
        <text x={12} y={PAD.t + (H - PAD.t - PAD.b) / 2} fontSize={10} textAnchor="middle" transform={`rotate(-90 12 ${PAD.t + (H - PAD.t - PAD.b) / 2})`} className="fill-ink-500">
          {label(axes.y)}
        </text>
      </svg>
      {/* The hovered or focused dot in words (M137), and where the project stands when it has no TVL. */}
      <p className="text-xs text-ink-400" aria-live="polite">
        {activeRow ? `${C.hovered(activeRow.name, formatTvl(activeRow.tvl), listed(activeRow) || "unknown")}${pinned.has(activeRow.slug) ? `, ${C.hoveredPinned}` : ""}` : C.hoverEmpty}
      </p>
      {!you && axes.x !== "age" ? <p className="text-xs text-ink-400">{C.youLater(projectName)}</p> : null}
    </div>
  );
}
