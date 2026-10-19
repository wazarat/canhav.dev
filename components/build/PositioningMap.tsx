import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { LlamaProtocol } from "@/lib/competitors/llama";
import { type CompetitorAxis, ageMonths } from "@/lib/competitors/record";

const W = 560;
const H = 320;
const PAD = { l: 44, r: 16, t: 16, b: 36 };

function logTvl(tvl: number): number {
  return Math.log10(Math.max(tvl, 1000));
}

/**
 * The positioning map (M115): the protocols as dots on two axes, TVL on a
 * log scale or age in months, the project as the bright dot at its own
 * age and no TVL. Pure SVG in the ink palette, no client JS.
 */
export function PositioningMap({
  rows,
  axes,
  projectAgeMonths,
}: {
  rows: LlamaProtocol[];
  axes: { x: CompetitorAxis; y: CompetitorAxis };
  /** Months since the project was started in the studio. */
  projectAgeMonths: number;
}) {
  const C = STUDIO_PLUS_COPY.competitors;
  const value = (r: LlamaProtocol | null, axis: CompetitorAxis): number | null => {
    if (!r) return axis === "tvl" ? 0 : projectAgeMonths;
    return axis === "tvl" ? logTvl(r.tvl) : ageMonths(r.listedAt);
  };
  const points = rows
    .map((r) => ({ r, x: value(r, axes.x), y: value(r, axes.y) }))
    .filter((p): p is { r: LlamaProtocol; x: number; y: number } => p.x !== null && p.y !== null);
  const you = { x: axes.x === "tvl" ? 3 : projectAgeMonths, y: axes.y === "tvl" ? 3 : projectAgeMonths };
  const xs = [...points.map((p) => p.x), you.x];
  const ys = [...points.map((p) => p.y), you.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + 1);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys, minY + 1);
  const sx = (v: number) => PAD.l + ((v - minX) / (maxX - minX)) * (W - PAD.l - PAD.r);
  const sy = (v: number) => H - PAD.b - ((v - minY) / (maxY - minY)) * (H - PAD.t - PAD.b);
  const midX = sx((minX + maxX) / 2);
  const midY = sy((minY + maxY) / 2);
  const label = (axis: CompetitorAxis) => (axis === "tvl" ? `${C.axes.tvl} (log)` : `${C.axes.age} (months)`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={C.mapTitle} className="block w-full">
      <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} className="fill-ink-950/40 stroke-ink-700" strokeWidth={1} />
      <line x1={midX} y1={PAD.t} x2={midX} y2={H - PAD.b} className="stroke-ink-700" strokeDasharray="3 3" />
      <line x1={PAD.l} y1={midY} x2={W - PAD.r} y2={midY} className="stroke-ink-700" strokeDasharray="3 3" />
      {points.map((p) => (
        <g key={p.r.slug}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r={5} className="fill-ink-300" />
          {/* Labels flip to the left near the right edge so they stay inside the frame. */}
          <text x={sx(p.x) + (sx(p.x) > W * 0.72 ? -8 : 8)} y={sy(p.y) + 4} fontSize={10} textAnchor={sx(p.x) > W * 0.72 ? "end" : "start"} className="fill-ink-200">
            {p.r.name.length > 22 ? `${p.r.name.slice(0, 21)}…` : p.r.name}
          </text>
          <title>{`${p.r.name}, TVL ${Math.round(p.r.tvl).toLocaleString("en-US")} USD`}</title>
        </g>
      ))}
      <g>
        <circle cx={sx(you.x)} cy={sy(you.y)} r={6} className="fill-electric-400" />
        <text x={sx(you.x) + 9} y={sy(you.y) + 4} fontSize={11} fontWeight={600} className="fill-ink-50">
          {C.you}
        </text>
      </g>
      <text x={W / 2} y={H - 10} fontSize={10} textAnchor="middle" className="fill-ink-500">
        {label(axes.x)}
      </text>
      <text x={12} y={H / 2} fontSize={10} textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`} className="fill-ink-500">
        {label(axes.y)}
      </text>
    </svg>
  );
}
