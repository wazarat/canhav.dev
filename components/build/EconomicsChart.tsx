"use client";

import { useState } from "react";

import { ECONOMICS_COPY } from "@/content/economics";
import { type EconValues, type EconomicsFamily, SCENARIOS, type Scenario, computeEconomics, formatScale, seriesFor } from "@/lib/economics";
import { cn } from "@/lib/utils";

const W = 560;
const H = 300;
const PAD = { l: 56, r: 20, t: 24, b: 40 };
const FLOOR = 100;

const STROKE: Record<Scenario, string> = { low: "stroke-ink-400", base: "stroke-electric-400", high: "stroke-neon-400" };
const FILL: Record<Scenario, string> = { low: "fill-ink-400", base: "fill-electric-400", high: "fill-neon-400" };
const DOT: Record<Scenario, string> = { low: "bg-ink-400", base: "bg-electric-400", high: "bg-neon-400" };

function tick(p: number): string {
  if (p >= 9) return `$${10 ** (p - 9)}B`;
  if (p >= 6) return `$${10 ** (p - 6)}M`;
  if (p >= 3) return `$${10 ** (p - 3)}K`;
  return `$${10 ** p}`;
}

/**
 * Monthly revenue and monthly cost against the scale (M167), both axes
 * log so a linear model reads as a straight line and the cost as a flat
 * one, with the break even of each scenario marked where they cross.
 * Three scenarios in ink, electric and neon, 2px lines, small marks with
 * a surface ring, placed labels, ticks on both axes, a legend row, and
 * the marks keyboard reachable with their values read under the chart.
 * The sentence above is the text equivalent.
 */
export function EconomicsChart({ family, scenarios, chosen }: { family: EconomicsFamily; scenarios: Record<Scenario, EconValues>; chosen: Scenario }) {
  const C = ECONOMICS_COPY;
  const [active, setActive] = useState<Scenario | null>(null);
  const outputs = Object.fromEntries(SCENARIOS.map((s) => [s, computeEconomics(family, scenarios[s])])) as Record<Scenario, ReturnType<typeof computeEconomics>>;
  const label = outputs.base?.scaleLabel ?? "";
  const sentence = C.chartSentence(
    SCENARIOS.map((s) => {
      const o = outputs[s];
      return o && o.breakEvenScale !== null ? C.chartCase(C.scenarios[s], formatScale(o.breakEvenScale), label) : C.chartCaseNever(C.scenarios[s]);
    }),
  );
  // One shared log range across the scenarios so the three lines sit on one chart.
  const anchors = SCENARIOS.flatMap((s) => [outputs[s]?.scale ?? 0, outputs[s]?.breakEvenScale ?? 0]).filter((n) => n > 0);
  const centre = Math.max(...anchors, 1_000);
  const lo = Math.max(100, Math.min(...anchors, centre) / 50);
  const hi = Math.max(...anchors, centre) * 20;
  const series = Object.fromEntries(SCENARIOS.map((s) => [s, seriesFor(family, scenarios[s], 48, { min: lo, max: hi })])) as Record<Scenario, ReturnType<typeof seriesFor>>;
  const xs = series.base.map((p) => p.scale);
  const ys = SCENARIOS.flatMap((s) => series[s].flatMap((p) => [p.revenue, p.cost])).filter((n) => n > 0);
  const xMin = Math.floor(Math.log10(Math.min(...xs)));
  const xMax = Math.ceil(Math.log10(Math.max(...xs)));
  const yMin = Math.floor(Math.log10(Math.max(FLOOR, Math.min(...ys))));
  const yMax = Math.ceil(Math.log10(Math.max(...ys, FLOOR * 10)));
  // Coordinates round to a tenth so the server and the client render the same attributes (log maths differs in the last digit).
  const tenth = (n: number) => Math.round(n * 10) / 10;
  const x = (v: number) => tenth(PAD.l + ((Math.log10(Math.max(v, 1)) - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r));
  const y = (v: number) => tenth(H - PAD.b - ((Math.log10(Math.max(v, FLOOR)) - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b));
  const path = (pts: Array<[number, number]>) => pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const xTicks = Array.from({ length: xMax - xMin + 1 }, (_, i) => xMin + i).filter((p, i, a) => a.length <= 7 || i % 2 === 0);
  const yTicks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i).filter((p, i, a) => a.length <= 6 || i % 2 === 0);
  const costs = [...new Set(SCENARIOS.map((s) => outputs[s]?.costMonthly ?? 0))];
  // Marks with labels placed above right, staggered when two sit close.
  const marks = SCENARIOS.flatMap((s) => {
    const o = outputs[s];
    if (!o || o.breakEvenScale === null) return [];
    return [{ s, cx: x(o.breakEvenScale), cy: y(o.costMonthly), text: `${C.scenarios[s]} ${formatScale(o.breakEvenScale)}` }];
  }).sort((a, b) => a.cx - b.cx);
  // Labels sit above their mark; marks within a label's width of each other take their own row so the texts never cross.
  const placed = marks.map((m, i) => {
    let row = 0;
    for (let j = 0; j < i; j++) if (m.cx - marks[j].cx < 96) row += 1;
    const lx = tenth(Math.max(PAD.l + 2, Math.min(m.cx + 8, W - PAD.r - m.text.length * 6.2)));
    return { ...m, lx, ly: tenth(m.cy - 12 - row * 14) };
  });
  const shown = active ? outputs[active] : null;
  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-ink-200">{sentence}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
        {SCENARIOS.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("inline-block h-2 w-2 rounded-full", DOT[s])} />
            {C.scenarios[s]} {C.revenueLabel}
            {s === chosen ? <span className="text-ink-500">(chosen)</span> : null}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0 w-4 border-t border-dashed border-ink-300" />
          {C.costLabel}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={C.chartAria} className="block w-full">
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} className="fill-none stroke-ink-700/60" />
        {yTicks.map((p) => (
          <g key={`y${p}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(10 ** p)} y2={y(10 ** p)} className="stroke-ink-700/30" />
            <text x={PAD.l - 6} y={y(10 ** p) + 3} textAnchor="end" className="fill-ink-400" fontSize={10}>
              {tick(p)}
            </text>
          </g>
        ))}
        {xTicks.map((p) => (
          <g key={`x${p}`}>
            <line y1={H - PAD.b} y2={H - PAD.b + 4} x1={x(10 ** p)} x2={x(10 ** p)} className="stroke-ink-500" />
            <text x={x(10 ** p)} y={H - PAD.b + 16} textAnchor="middle" className="fill-ink-400" fontSize={10}>
              {tick(p)}
            </text>
          </g>
        ))}
        <text x={W - PAD.r} y={H - 4} textAnchor="end" className="fill-ink-500" fontSize={10}>
          {label}
        </text>
        {costs.map((c) => (
          <line key={`c${c}`} x1={PAD.l} x2={W - PAD.r} y1={y(c)} y2={y(c)} strokeDasharray="4 4" className="stroke-ink-300" strokeWidth={1.5} />
        ))}
        {SCENARIOS.map((s) => (
          <path key={s} d={path(series[s].filter((p) => p.revenue >= FLOOR).map((p) => [x(p.scale), y(p.revenue)]))} className={cn("fill-none", STROKE[s], s === chosen ? "opacity-100" : "opacity-70")} strokeWidth={2} strokeLinejoin="round" />
        ))}
        {placed.map((m) => (
          <g key={m.s}>
            <circle
              cx={m.cx}
              cy={m.cy}
              r={active === m.s ? 6 : 4.5}
              tabIndex={0}
              role="img"
              aria-label={`${C.scenarios[m.s]}, ${C.chartCase(C.scenarios[m.s].toLowerCase(), formatScale(outputs[m.s]!.breakEvenScale!), label)}`}
              onMouseEnter={() => setActive(m.s)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(m.s)}
              onBlur={() => setActive(null)}
              className={cn(FILL[m.s], "stroke-ink-900 outline-none focus-visible:stroke-ink-50")}
              strokeWidth={2}
            />
            <text x={m.lx} y={m.ly} className="fill-ink-200" fontSize={11}>
              {m.text}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-xs text-ink-400" aria-live="polite">
        {shown && active && shown.breakEvenScale !== null
          ? C.chartHover(C.scenarios[active], formatScale(shown.breakEvenScale), formatScale(shown.costMonthly), formatScale(shown.costMonthly))
          : C.chartHint}
      </p>
    </div>
  );
}
