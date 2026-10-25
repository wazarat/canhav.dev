"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

import { AssetsEditor } from "@/components/build/AssetsEditor";
import { VIABILITY_COPY } from "@/content/viability";
import { BUILD_COPY } from "@/content/build";
import type { AssetEntry } from "@/lib/assets";
import { formatDayShort } from "@/lib/format";
import { KIT_LIMITS, type ProjectKit, addCustomStep } from "@/lib/kits";
import { cn } from "@/lib/utils";
import type { DependencyCheck } from "@/lib/viability/check";
import type { DependencyGroup, DependencyRow } from "@/lib/viability/dependencies";

const GROUPS: readonly DependencyGroup[] = ["protocols", "assets", "chain"];

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 10) return VIABILITY_COPY.dependencies.justNow;
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? "a minute ago" : `${m} minutes ago`;
  const h = Math.round(m / 60);
  return h === 1 ? "an hour ago" : `${h} hours ago`;
}

/**
 * Can it be built here (M163, V1). The summary sentence on top, the assets
 * the check reads, then the rows grouped Protocols, Assets and Chain,
 * each one sentence that starts with its state in words (M137), the
 * source as a text link with its read date, and for a missing or
 * workaround row "Add as a step", which lands a custom step under the
 * right milestone tagged as coming from the check. The check runs on
 * mount and again when the assets change; Check again takes a new pools
 * snapshot.
 */
export function DependenciesSection({
  projectId,
  assets,
  kit,
  onPatchKit,
  onSummary,
  assetsEditor,
}: {
  projectId: string;
  assets: readonly AssetEntry[];
  kit: ProjectKit | undefined;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  /** The summary sentence for the card on top, null while nothing has been checked. */
  onSummary: (sentence: string | null) => void;
  /** The assets editor, rendered under the lead so the check sits around it. */
  assetsEditor: React.ReactNode;
}) {
  const C = VIABILITY_COPY.dependencies;
  const [check, setCheck] = useState<DependencyCheck | null>(null);
  const [state, setState] = useState<"idle" | "checking" | "failed">("idle");
  const [now, setNow] = useState(() => Date.now());
  const seq = useRef(0);

  const run = async (refresh = false) => {
    const mine = ++seq.current;
    setState("checking");
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/dependencies`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refresh, assets: assets.map((a) => ({ id: a.id, symbol: a.symbol, role: a.role, ...(a.address ? { address: a.address } : {}) })) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { check: DependencyCheck };
      if (mine !== seq.current) return;
      setCheck(data.check);
      setState("idle");
      onSummary(data.check.summary.total > 0 ? data.check.summary.sentence : null);
    } catch {
      if (mine === seq.current) setState("failed");
    }
  };

  // The check runs on mount and again when the assets change, after a short pause for typing.
  const key = JSON.stringify(assets.map((a) => [a.id, a.symbol, a.role, a.address ?? ""]));
  useEffect(() => {
    const t = setTimeout(() => void run(), check ? 800 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, projectId]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const customSteps = kit?.customSteps ?? [];
  const stepsFull = customSteps.length >= KIT_LIMITS.customSteps.max;
  const added = (row: DependencyRow) => customSteps.find((c) => c.source === "dependency" && c.title === row.step?.title);
  const addStep = (row: DependencyRow) => {
    if (!row.step || !kit || stepsFull) return;
    onPatchKit(addCustomStep(kit, row.step.shape, row.step.title, row.step.detail, { milestone: row.step.milestone, source: "dependency" }));
  };

  const rows = check?.rows ?? [];
  return (
    <div className="space-y-5">
      {check ? (
        <p className="text-base leading-relaxed text-ink-100">{check.summary.sentence}</p>
      ) : state === "failed" ? (
        <p className="text-sm text-rose-400">{C.failed}</p>
      ) : (
        <p className="text-sm leading-relaxed text-ink-400">{VIABILITY_COPY.sections.dependencies.empty}</p>
      )}

      <div className="space-y-2 border-t border-ink-700/40 pt-4">
        <h3 className="text-sm font-medium text-ink-100">{VIABILITY_COPY.assets.title}</h3>
        {assetsEditor}
      </div>

      {check ? (
        <div className="space-y-5 border-t border-ink-700/40 pt-4">
          {GROUPS.map((g) => {
            const list = rows.filter((r) => r.group === g);
            return (
              <div key={g} className="space-y-2">
                <h3 className="text-sm font-medium text-ink-100">{C.groups[g]}</h3>
                {list.length === 0 ? (
                  <p className="text-sm text-ink-500">{g === "protocols" ? C.noShape : g === "assets" ? C.noAssets : ""}</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((r) => {
                      const done = added(r);
                      return (
                        <li key={r.key} className="text-sm leading-relaxed text-ink-300">
                          <span className={cn("font-medium", r.state === "missing" ? "text-rose-400" : "text-ink-100")}>{C.states[r.state]}.</span>{" "}
                          <span className="text-ink-100">{r.title}</span>
                          {`, ${r.reason}`}
                          {r.source ? (
                            <>
                              {" "}
                              {r.source.url ? (
                                <a href={r.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-400 underline-offset-2 hover:text-ink-50 hover:underline">
                                  {C.source(r.source.label, r.source.readAt ? formatDayShort(r.source.readAt) : "")}
                                  <ExternalLink aria-hidden className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-ink-400">{C.source(r.source.label, r.source.readAt ? formatDayShort(r.source.readAt) : "")}</span>
                              )}
                            </>
                          ) : null}
                          {r.step && kit ? (
                            <>
                              {" "}
                              {done ? (
                                <span className="text-xs text-ink-400">{C.addedStep(BUILD_COPY.milestones[r.step.milestone].label)}</span>
                              ) : (
                                <button type="button" onClick={() => addStep(r)} disabled={stepsFull} title={stepsFull ? C.stepsFull : undefined} className="text-xs text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline disabled:cursor-not-allowed disabled:text-ink-600 disabled:no-underline">
                                  {C.addStep}
                                </button>
                              )}
                            </>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
          <p className="text-xs text-ink-400">
            {state === "checking" ? C.checking : C.checkedAgo(ago(check.readAt, now))}
            {" · "}
            <button type="button" onClick={() => void run(true)} disabled={state === "checking"} className="text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline disabled:text-ink-600">
              {C.checkAgain}
            </button>
          </p>
        </div>
      ) : null}
    </div>
  );
}
