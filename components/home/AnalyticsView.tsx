"use client";

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

import { BarChart } from "@/components/ui/BarChart";
import { buttonClasses } from "@/components/ui/Button";
import { DUNE_DASHBOARD_URL } from "@/content/analytics";
import type { AnalyticsData, ChartMetric } from "@/lib/dune";
import { formatAsOf, formatDayShort, formatPct, formatUnit } from "@/lib/format";
import { cn } from "@/lib/utils";

type Range = "24h" | "all";

function DeltaLine({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  return (
    <p className={cn("text-xs font-medium", pct >= 0 ? "text-signal-400" : "text-red-400")}>
      {formatPct(pct)} from prior day
    </p>
  );
}

function RangeToggle({ range, onChange }: { range: Range; onChange: (r: Range) => void }) {
  return (
    <div className="glass inline-flex rounded-full p-0.5" role="group" aria-label="Time range">
      {(["24h", "all"] as const).map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={range === r}
          onClick={() => onChange(r)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
            range === r ? "bg-electric-500/25 text-ink-50" : "text-ink-300 hover:text-ink-100",
          )}
        >
          {r === "24h" ? "24h" : "All time"}
        </button>
      ))}
    </div>
  );
}

function ChartCard({ metric, range }: { metric: ChartMetric; range: Range }) {
  const points = range === "24h" ? metric.daily14 : metric.allTime;
  const hasData = metric.allTime.length > 0;

  return (
    <div className="glass card-lift rounded-2xl border border-ink-700/60 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink-50">
            {metric.label}
          </h3>
          <p className="text-xs leading-relaxed text-ink-400">
            {range === "24h"
              ? "Recent daily context with the latest completed day highlighted."
              : metric.description}
          </p>
        </div>
        <div className="font-display text-xl font-semibold tracking-tight text-ink-50 tabular">
          {hasData ? formatUnit(metric.latest, metric.unit) : "—"}
        </div>
      </div>
      <div className="mt-5">
        <BarChart
          points={points}
          ariaLabel={`${metric.label} — ${range === "24h" ? "last 14 days" : "all time"}`}
        />
      </div>
    </div>
  );
}

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const [range, setRange] = useState<Range>("24h");

  const latestCompleteDay = data.charts.find((c) => c.daily14.length > 0)?.daily14.at(-1)?.date;
  const caption = data.updatedAt
    ? `Updated ${formatAsOf(data.updatedAt)}${latestCompleteDay ? `, latest complete day ${formatDayShort(latestCompleteDay)} UTC` : ""}`
    : "Live data unavailable — showing last captured snapshot.";

  return (
    <section className="space-y-6">
      {/* Summary card: header, stat strip, provenance footnote */}
      <div className="glass rounded-2xl border border-ink-700/60 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <p className="kicker">Protocol analytics</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
              Robinhood Chain, live from the chain.
            </h2>
            <p className="text-sm leading-relaxed text-ink-300">
              Independent onchain reporting for Robinhood Chain, indexed by Dune.
            </p>
            <p className="pt-1 font-mono text-[11px] text-ink-400">{caption}</p>
          </div>
          <div className="flex items-center gap-3">
            <RangeToggle range={range} onChange={setRange} />
            <a
              href={DUNE_DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              View on Dune
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* gap-px over a divider-colored backdrop draws clean cell borders at every breakpoint */}
        <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-ink-700/60 bg-ink-700/60 sm:grid-cols-2 lg:grid-cols-4">
          {data.stats.map((stat) => (
            <div key={stat.id} className="space-y-1.5 bg-ink-900 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-300">
                {stat.label}
              </p>
              <p className="font-display text-3xl font-semibold tracking-tight text-ink-50 tabular">
                {stat.formatted}
              </p>
              <DeltaLine pct={stat.change24hPct} />
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-500">
          Data is supplied by Dune and DefiLlama from indexed onchain activity. The 24h
          view uses the latest completed UTC day. Asset market cap and tokenized value
          are periodic snapshots from the Entropy Advisors dashboard.
        </p>
      </div>

      {/* Chart cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.charts.map((chart) => (
          <ChartCard key={chart.id} metric={chart} range={range} />
        ))}
      </div>
    </section>
  );
}
