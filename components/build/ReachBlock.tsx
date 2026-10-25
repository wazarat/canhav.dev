"use client";

import { useEffect, useRef, useState } from "react";

import { SeriesChart } from "@/components/analytics/SeriesChart";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { formatDayShort } from "@/lib/format";
import type { ReachSummary } from "@/lib/reach";
import type { ReachRead, ReachResult } from "@/lib/reach-server";
import type { ProfileKey } from "@/lib/value-canvas";

type State = { kind: "idle" } | { kind: "loading" } | { kind: "refreshing" } | { kind: "ok"; read: ReachRead } | { kind: "needs_assets" } | { kind: "not_configured" } | { kind: "cap" } | { kind: "failed" };

/**
 * Reachable wallets for one ideal customer profile (M168): one large
 * number (the overlap), two smaller ones, the 90 day sparkline of
 * subsector users, the sentence that defines the numbers exactly, the
 * source and read date, and Refresh with the refreshes left this month.
 * A profile with no assets asks for them instead of showing zero. The
 * summary of a read lands on the draft through onSummary.
 */
export function ReachBlock({ projectId, profile, hasAssets, summary, onSummary }: { projectId: string; profile: ProfileKey; hasAssets: boolean; summary?: ReachSummary; onSummary: (s: ReachSummary) => void }) {
  const C = STUDIO_PLUS_COPY.icp.reach;
  const [state, setState] = useState<State>({ kind: "idle" });
  const seq = useRef(0);
  const load = async (refresh = false) => {
    const mine = ++seq.current;
    setState(refresh ? { kind: "refreshing" } : { kind: "loading" });
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/reach?profile=${profile}${refresh ? "&refresh=1" : ""}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { result: ReachResult; summary: ReachSummary | null };
      if (mine !== seq.current) return;
      const r = data.result;
      if (r.kind === "ok") {
        setState({ kind: "ok", read: r.read });
        if (data.summary && (!summary || summary.readAt !== data.summary.readAt)) onSummary(data.summary);
      } else if (r.kind === "cap") setState({ kind: "cap" });
      else if (r.kind === "failed") setState({ kind: "failed" });
      else setState({ kind: r.kind });
    } catch {
      if (mine === seq.current) setState({ kind: "failed" });
    }
  };
  useEffect(() => {
    if (!hasAssets) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, profile, hasAssets]);

  if (!hasAssets) return <Note title={C.title} text={C.needsAssets} />;
  if (state.kind === "needs_assets") return <Note title={C.title} text={C.needsAssets} />;
  if (state.kind === "not_configured") return <Note title={C.title} text={C.notConfigured} />;
  if (state.kind === "loading" || state.kind === "idle") return <Note title={C.title} text={C.loading} />;
  const read = state.kind === "ok" ? state.read : null;
  const fallback = !read && summary ? summary : null;
  const shown = read ?? fallback;
  return (
    <div className="space-y-3 border-t border-ink-700/40 pt-4">
      <p className="text-xs font-medium text-ink-200">{C.title}</p>
      {shown ? (
        <>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="font-display text-3xl font-semibold leading-tight text-ink-50">{shown.overlap.toLocaleString("en-US")}</p>
              <p className="text-xs text-ink-400">{C.overlap}</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold leading-tight text-ink-50">{shown.subsectorUsers.toLocaleString("en-US")}</p>
              <p className="text-xs text-ink-400">{C.users}</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold leading-tight text-ink-50">{shown.assetHolders.toLocaleString("en-US")}</p>
              <p className="text-xs text-ink-400">{C.holders}</p>
            </div>
          </div>
          {read && read.series.length >= 2 ? (
            <div className="space-y-1">
              <p className="text-xs text-ink-400">{C.sparkline(read.chainName)}</p>
              <SeriesChart points={read.series.map((p) => ({ date: p.day, value: p.wallets }))} ariaLabel={C.sparkline(read.chainName)} />
            </div>
          ) : null}
          <p className="text-sm leading-relaxed text-ink-300">{shown.definition}</p>
          <p className="text-xs text-ink-400">
            {C.source(formatDayShort(shown.readAt))}
            {read ? ` · ${C.counted(read.counted.assets, read.counted.protocols)}` : ""}
          </p>
        </>
      ) : null}
      <p className="text-xs text-ink-400">
        {state.kind === "cap" ? C.cap : state.kind === "failed" ? <span className="text-rose-400">{C.failed}</span> : read ? C.left(read.refreshesLeft) : null}
        {state.kind !== "cap" ? (
          <>
            {" "}
            <button type="button" disabled={state.kind === "refreshing"} onClick={() => void load(true)} className="text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline disabled:text-ink-600">
              {state.kind === "refreshing" ? C.refreshing : C.refresh}
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}

function Note({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-1 border-t border-ink-700/40 pt-4">
      <p className="text-xs font-medium text-ink-200">{title}</p>
      <p className="text-sm leading-relaxed text-ink-400">{text}</p>
    </div>
  );
}
