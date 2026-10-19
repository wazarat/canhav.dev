/**
 * A small area chart for a daily series (M122): pure SVG in the ink palette,
 * no client JS, native title tooltips. The last point reads as a dot so a
 * flat line still shows where today is.
 */
import { formatDayShort } from "@/lib/format";

const VIEW_W = 560;
const VIEW_H = 120;
const PAD = 4;

export function SeriesChart({
  points,
  ariaLabel,
  format = (v) => v.toLocaleString("en-US"),
}: {
  points: Array<{ date: string; value: number }>;
  ariaLabel: string;
  /** How a value reads in the tooltip. */
  format?: (value: number) => string;
}) {
  if (points.length < 2) return <p className="text-xs text-ink-500">{ariaLabel}, no days yet.</p>;
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = (VIEW_W - PAD * 2) / (points.length - 1);
  const y = (v: number) => VIEW_H - PAD - (v / max) * (VIEW_H - PAD * 2);
  const coords = points.map((p, i) => [PAD + i * step, y(p.value)] as const);
  const line = coords.map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${yy.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)} ${VIEW_H - PAD} L${PAD} ${VIEW_H - PAD} Z`;
  const last = coords[coords.length - 1];
  const first = points[0];
  const mid = points[Math.floor(points.length / 2)];
  const end = points[points.length - 1];
  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label={ariaLabel} className="block w-full" preserveAspectRatio="none">
        <path d={area} className="fill-ink-800/60" />
        <path d={line} className="fill-none stroke-ink-300" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <circle cx={last[0]} cy={last[1]} r={3} className="fill-electric-400" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <rect key={p.date} x={PAD + i * step - step / 2} y={0} width={step} height={VIEW_H} className="fill-transparent">
            <title>{`${formatDayShort(p.date)} · ${format(p.value)}`}</title>
          </rect>
        ))}
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-ink-400">
        <span>{formatDayShort(first.date)}</span>
        <span>{formatDayShort(mid.date)}</span>
        <span>{formatDayShort(end.date)}</span>
      </div>
    </div>
  );
}
