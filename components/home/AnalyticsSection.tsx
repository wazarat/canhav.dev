import { ArrowUpRight } from "lucide-react";

import { AnalyticsChartCard } from "@/components/home/AnalyticsChartCard";
import { StatCard } from "@/components/ui/StatCard";
import { DUNE_DASHBOARD_URL, SNAPSHOT_DATE } from "@/content/analytics";
import { getAnalytics } from "@/lib/dune";
import { formatAsOf, formatDayShort } from "@/lib/format";

export async function AnalyticsSection() {
  const data = await getAnalytics();

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <p className="kicker">Protocol analytics</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            Robinhood Chain, live from the chain.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-ink-300 md:text-base">
            Independent onchain reporting for Robinhood Chain — asset landscape,
            stablecoins, real-world assets and network activity, indexed by Dune.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <a
            href={DUNE_DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-ink-100 transition-colors hover:text-white"
          >
            View on Dune
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <span className="font-mono text-[11px] text-ink-400">
            {data.updatedAt
              ? `Dune · updated ${formatAsOf(data.updatedAt)}`
              : `Snapshot as of ${formatDayShort(SNAPSHOT_DATE)}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.formatted}
            hint={stat.source === "snapshot" ? `Snapshot as of ${formatDayShort(stat.asOf)}` : stat.hint}
            source="Dune"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.charts.map((chart) => (
          <AnalyticsChartCard key={chart.id} metric={chart} />
        ))}
      </div>
    </section>
  );
}
