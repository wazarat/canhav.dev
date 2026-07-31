"use client";

import { useState } from "react";

import { BarChart } from "@/components/ui/BarChart";
import type { ChartMetric } from "@/lib/dune";
import { formatDayShort, formatPct, formatUnit } from "@/lib/format";
import { cn } from "@/lib/utils";

type Range = "24h" | "all";

export function AnalyticsChartCard({ metric }: { metric: ChartMetric }) {
  const [range, setRange] = useState<Range>("24h");
  const points = range === "24h" ? metric.daily14 : metric.allTime;
  const hasData = metric.allTime.length > 0;
  const showDelta = range === "24h" && metric.change24hPct !== null;

  return (
    <div className="glass card-lift rounded-2xl border border-ink-700/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink-50">
            {metric.label}
          </h3>
          <p className="text-xs leading-relaxed text-ink-400">{metric.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-xl font-semibold tracking-tight text-ink-50 tabular">
              {hasData ? formatUnit(metric.latest, metric.unit) : "—"}
            </div>
            {showDelta && (
              <span
                className={cn(
                  "font-mono text-[10px] font-medium",
                  metric.change24hPct! >= 0 ? "text-signal-400" : "text-red-400",
                )}
              >
                {formatPct(metric.change24hPct!)} vs prior day
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <BarChart
          points={points}
          ariaLabel={`${metric.label} — ${range === "24h" ? "last 14 days" : "all time"}`}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="glass inline-flex rounded-full p-0.5" role="group" aria-label="Time range">
          {(["24h", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-electric-500/20 text-ink-50"
                  : "text-ink-300 hover:text-ink-100",
              )}
            >
              {r === "24h" ? "24h" : "All time"}
            </button>
          ))}
        </div>
        {metric.source === "snapshot" ? (
          <span className="font-mono text-[10px] text-ink-400">
            Snapshot as of {formatDayShort(metric.asOf)}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-ink-400">
            Latest complete day {points.length > 0 ? formatDayShort(points[points.length - 1].date) : "—"}
          </span>
        )}
      </div>
    </div>
  );
}
