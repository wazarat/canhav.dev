"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusChip } from "@/components/ui/StatusChip";
import { TOKEN_PAGE_COPY } from "@/content/launch";
import { formatPct } from "@/lib/format";
import { formatEthAmount, type PricePoint } from "@/lib/market";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "5M", seconds: 300 },
  { key: "1H", seconds: 3600 },
  { key: "6H", seconds: 21_600 },
  { key: "1D", seconds: 86_400 },
  { key: "ALL", seconds: null },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const W = 720;
const H = 300;
const PAD = { top: 16, right: 76, bottom: 28, left: 8 };

/**
 * Market cap over time, in ETH, drawn from the execution price of each
 * trade (M58). Hand-written SVG like components/ui/BarChart, no chart
 * library. The last known price carries into a quiet range, so a range with
 * no trades draws a flat line rather than nothing, and the line ends on the
 * price the market quotes now. `now` comes from the
 * server so the first paint matches on hydration.
 */
export function PriceChart({
  points,
  supply,
  current,
  now,
}: {
  /** Oldest first. */
  points: PricePoint[];
  /** Whole tokens, for market cap. */
  supply: number;
  /** The price the market quotes right now, so the line ends on the Price tile's number. */
  current: number | null;
  now: number;
}) {
  const C = TOKEN_PAGE_COPY.chart;
  const [range, setRange] = useState<RangeKey>("ALL");
  const [hover, setHover] = useState<number | null>(null);
  // Local clock times are client only, so the axis waits for the mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const series = useMemo(() => {
    const span = RANGES.find((r) => r.key === range)!.seconds;
    if (points.length === 0) return [];
    const start = span === null ? points[0].t : now - span;
    const inside = points.filter((p) => p.t >= start);
    const before = [...points].reverse().find((p) => p.t < start);
    const out = before ? [{ t: start, p: before.p }, ...inside] : inside;
    const last = out[out.length - 1];
    // End on the live quote, or carry the last trade's price to now.
    if (last && last.t < now) out.push({ t: now, p: current ?? last.p });
    return out;
  }, [points, range, now, current]);

  const tabs = (
    <div role="tablist" aria-label={C.rangeLabel} className="flex rounded-full border border-ink-700/70 p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          role="tab"
          aria-selected={range === r.key}
          onClick={() => {
            setRange(r.key);
            setHover(null);
          }}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs transition-colors",
            range === r.key ? "bg-electric-500/20 text-electric-200" : "text-ink-400 hover:text-ink-200",
          )}
        >
          {r.key}
        </button>
      ))}
    </div>
  );

  if (points.length === 0)
    return (
      <div className="mt-6">
        <StatusChip tone="neutral" variant="block">
          {C.empty}
        </StatusChip>
      </div>
    );

  const caps = series.map((s) => s.p * supply);
  const first = caps[0];
  const last = caps[caps.length - 1];
  const change = first > 0 ? ((last - first) / first) * 100 : null;

  const t0 = series[0].t;
  const t1 = series[series.length - 1].t;
  const lo = Math.min(...caps);
  const hi = Math.max(...caps);
  // A flat series still needs a band to sit in.
  const pad = hi === lo ? hi * 0.1 || 1 : (hi - lo) * 0.12;
  const yMin = Math.max(0, lo - pad);
  const yMax = hi + pad;
  const x = (t: number) =>
    PAD.left + (t1 === t0 ? 0 : ((t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  const line = series.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.t).toFixed(1)},${y(caps[i]).toFixed(1)}`).join(" ");
  const area = `${line} L${x(t1).toFixed(1)},${H - PAD.bottom} L${x(t0).toFixed(1)},${H - PAD.bottom} Z`;
  const grid = [0.25, 0.5, 0.75].map((f) => yMin + (yMax - yMin) * f);
  const ticks = [0, 1 / 3, 2 / 3, 1].map((f) => t0 + (t1 - t0) * f);
  const clock = (t: number) => {
    const d = new Date(t * 1000);
    return t1 - t0 > 86_400
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const shown = hover ?? series.length - 1;
  const up = change === null || change >= 0;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    for (let i = 1; i < series.length; i++)
      if (Math.abs(x(series[i].t) - px) < Math.abs(x(series[best].t) - px)) best = i;
    setHover(best);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tabular font-display text-3xl font-semibold tracking-tight text-ink-50">
            {formatEthAmount(caps[shown])} <span className="text-base font-normal text-ink-400">ETH</span>
          </p>
          <p className="tabular mt-0.5 text-xs text-ink-500">
            {hover !== null ? (
              <>
                {formatEthAmount(series[shown].p)} ETH {C.perToken}
                {mounted ? ` · ${clock(series[shown].t)}` : ""}
              </>
            ) : change === null ? (
              C.marketCap
            ) : (
              <>
                <span className={up ? "text-signal-400" : "text-rose-400"}>{formatPct(change)}</span> {range} ·{" "}
                {C.marketCap}
              </>
            )}
          </p>
        </div>
        {tabs}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={C.aria}
        className="mt-4 w-full touch-none rounded-xl border border-ink-800/70 bg-ink-950/40"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="price-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3D7BFF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3D7BFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(124,132,153,0.18)"
              strokeDasharray="4 6"
            />
            <text x={W - PAD.right + 8} y={y(v) + 4} fontSize="11" fill="#7C8499">
              {formatEthAmount(v)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#price-area)" />
        <path d={line} fill="none" stroke="#5B93FF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(series[shown].t)} cy={y(caps[shown])} r="4" fill="#22D3EE" />
        {hover !== null ? (
          <line
            x1={x(series[shown].t)}
            x2={x(series[shown].t)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="rgba(124,132,153,0.35)"
          />
        ) : null}
        {mounted
          ? ticks.map((t, i) => (
              <text
                key={t}
                x={x(t)}
                y={H - 8}
                fontSize="11"
                fill="#7C8499"
                textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
              >
                {clock(t)}
              </text>
            ))
          : null}
      </svg>
      <p className="mt-2 text-xs text-ink-500">{C.note}</p>
    </div>
  );
}
