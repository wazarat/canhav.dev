"use client";

import { useEffect, useState } from "react";

import { SeriesChart } from "@/components/analytics/SeriesChart";
import type { DeployedToken } from "@/components/build/DeploymentsTab";
import { PlusGate } from "@/components/studio/PlusGate";
import { Segmented } from "@/components/ui/Segmented";
import { BUILD_COPY } from "@/content/build";
import { type TokenAnalytics, formatEthWei } from "@/lib/analytics";

/**
 * Token analytics on Deployments (M122, Studio+): holders, traders, volume
 * and new wallets over 90 days for the project's tokens, read from the
 * indexer through the project route. Facts as one text line, three small
 * charts, states as sentences. PlusGate for a free account.
 */
export function AnalyticsSection({ projectId, tokens }: { projectId: string; tokens: DeployedToken[] }) {
  return (
    <PlusGate feature="analytics">
      <AnalyticsInner projectId={projectId} tokens={tokens} />
    </PlusGate>
  );
}

function AnalyticsInner({ projectId, tokens }: { projectId: string; tokens: DeployedToken[] }) {
  const A = BUILD_COPY.analytics;
  const [address, setAddress] = useState(tokens[0]?.address ?? "");
  const [state, setState] = useState<{ status: "loading" } | { status: "unavailable" } | { status: "failed" } | { status: "ok"; value: TokenAnalytics }>({ status: "loading" });

  useEffect(() => {
    if (!address) return;
    let live = true;
    setState({ status: "loading" });
    fetch(`/api/ideation/projects/${projectId}/analytics?token=${address}`)
      .then(async (res) => {
        if (!live) return;
        if (!res.ok) {
          setState({ status: "failed" });
          return;
        }
        const body = (await res.json()) as { analytics: TokenAnalytics | null };
        setState(body.analytics ? { status: "ok", value: body.analytics } : { status: "unavailable" });
      })
      .catch(() => live && setState({ status: "failed" }));
    return () => {
      live = false;
    };
  }, [projectId, address]);

  if (tokens.length === 0) return <p className="text-xs text-ink-500">{A.noToken}</p>;

  return (
    <div className="space-y-4">
      {tokens.length > 1 ? (
        <Segmented
          value={address}
          onChange={setAddress}
          options={tokens.slice(0, 4).map((t) => ({ value: t.address, label: t.symbol ? `$${t.symbol}` : t.name }))}
          aria-label={A.pick}
        />
      ) : null}
      {state.status === "loading" ? <p className="text-xs text-ink-500">{A.loading}</p> : null}
      {state.status === "unavailable" ? <p className="text-xs text-ink-500">{A.unavailable}</p> : null}
      {state.status === "failed" ? <p className="text-xs text-rose-400">{A.failed}</p> : null}
      {state.status === "ok" ? <Charts value={state.value} /> : null}
    </div>
  );
}

function Charts({ value }: { value: TokenAnalytics }) {
  const A = BUILD_COPY.analytics;
  const quiet = value.totals.trades === 0 && value.holders === 0;
  const change = value.holdersBefore === null ? null : value.holders - value.holdersBefore;
  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-400">
        {A.facts(value.holders, value.traders, formatEthWei(value.totals.volumeWei), value.totals.trades)}
        {change !== null ? ` · ${A.holdersChange(change)}` : ""}
      </p>
      {quiet ? <p className="text-xs text-ink-500">{A.quiet}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Series title={A.holders} points={value.days.map((d) => ({ date: d.date, value: d.holders }))} />
        <Series title={A.volume} points={value.days.map((d) => ({ date: d.date, value: Number(BigInt(d.volumeWei)) / 1e18 }))} format={(v) => `${v.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH`} />
        <Series title={A.trades} points={value.days.map((d) => ({ date: d.date, value: d.trades }))} />
        <Series title={A.newTraders} points={value.days.map((d) => ({ date: d.date, value: d.newTraders }))} />
      </div>
      <p className="text-xs text-ink-500">{A.window}</p>
    </div>
  );
}

function Series({ title, points, format }: { title: string; points: Array<{ date: string; value: number }>; format?: (v: number) => string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink-200">{title}</p>
      <SeriesChart points={points} ariaLabel={title} format={format} />
    </div>
  );
}
