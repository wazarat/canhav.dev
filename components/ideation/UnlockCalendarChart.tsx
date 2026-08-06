import type { MonthUnlock, UnlockCohort } from "@/lib/tokenDesign";
import { cn } from "@/lib/utils";

/**
 * The unlock calendar: stacked monthly bars by cohort, months since TGE.
 * Pure SVG in the BarChart.tsx conventions — no client JS, native <title>
 * tooltips — so it renders identically in the editor rail and on the public
 * token page. Cluster months get an amber band behind the stack (tint only;
 * the message goes through StatusChip / WarningResourceCard beside it).
 */

const VIEW_W = 560;
const VIEW_H = 180;
const GAP_RATIO = 0.25;

const COHORT_COLORS: Record<UnlockCohort, string> = {
  team: "#5C92FF",
  investors: "#8B5CF6",
  advisors: "#22D3EE",
  public: "#3D7BFF",
  liquidity: "#A78BFA",
};

const COHORT_LABELS: Record<UnlockCohort, string> = {
  team: "Team",
  investors: "Investors",
  advisors: "Advisors",
  public: "Public",
  liquidity: "Liquidity",
};

const COHORT_ORDER: UnlockCohort[] = ["public", "liquidity", "team", "investors", "advisors"];

export function UnlockCalendarChart({
  calendar,
  clusterMonths,
}: {
  calendar: MonthUnlock[];
  clusterMonths: number[];
}) {
  const hasUnlocks = calendar.some((m) => m.totalPct > 0);
  if (!hasUnlocks) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-xl border border-ink-800/60 bg-ink-950/40">
        <p className="text-xs text-ink-400">No unlocks to plot yet</p>
      </div>
    );
  }

  const max = Math.max(...calendar.map((m) => m.totalPct), 1);
  const slot = VIEW_W / calendar.length;
  const barW = Math.min(slot * (1 - GAP_RATIO), 30);
  const cluster = new Set(clusterMonths);
  const usedCohorts = COHORT_ORDER.filter((c) =>
    calendar.some((m) => (m.byCohort[c] ?? 0) > 0),
  );
  const fmt = (n: number) =>
    n >= 10 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString();

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Unlock calendar: percent of supply unlocking per month"
        className="block w-full"
        preserveAspectRatio="none"
      >
        {calendar.map((m) => {
          if (cluster.has(m.month)) {
            return (
              <rect
                key={`band-${m.month}`}
                x={m.month * slot}
                y={0}
                width={slot}
                height={VIEW_H}
                fill="#FBBF24"
                opacity={0.1}
              />
            );
          }
          return null;
        })}
        {calendar.map((m) => {
          if (m.totalPct <= 0) return null;
          const x = m.month * slot + (slot - barW) / 2;
          let y = VIEW_H;
          return (
            <g key={m.month}>
              {COHORT_ORDER.map((cohort) => {
                const v = m.byCohort[cohort] ?? 0;
                if (v <= 0) return null;
                const h = Math.max((v / max) * (VIEW_H - 10), 1.5);
                y -= h;
                return (
                  <rect
                    key={cohort}
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={COHORT_COLORS[cohort]}
                    opacity={cluster.has(m.month) ? 0.95 : 0.75}
                  >
                    <title>{`Month ${m.month} · ${COHORT_LABELS[cohort]} · ${fmt(v)}% of supply`}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-ink-400">
        <span>M0</span>
        {calendar.length > 4 && <span>M{calendar[Math.floor(calendar.length / 2)].month}</span>}
        <span>M{calendar[calendar.length - 1].month}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {usedCohorts.map((cohort) => (
          <span key={cohort} className="inline-flex items-center gap-1.5 text-[10px] text-ink-400">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: COHORT_COLORS[cohort] }}
            />
            {COHORT_LABELS[cohort]}
          </span>
        ))}
        {clusterMonths.length > 0 && (
          <span className={cn("inline-flex items-center gap-1.5 text-[10px] text-ink-400")}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
            Cluster month
          </span>
        )}
      </div>
    </div>
  );
}
