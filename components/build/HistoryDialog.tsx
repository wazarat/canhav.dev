"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { BUILD_COPY } from "@/content/build";
import { pathLabel } from "@/lib/agent-writes";
import type { RevisionSummary } from "@/lib/revisions";

interface HistoryData {
  plus: boolean;
  snapshots: Array<{ version: number; hash: string; createdAt: string }>;
  revisions: RevisionSummary[];
}

function authorLabel(author: string): string {
  const A = BUILD_COPY.history.authors;
  if (author === "owner") return A.owner;
  if (author === "agent") return A.agent;
  if (author.startsWith("member:")) return A.member(author.slice(7)); // copy-ok
  if (author.startsWith("restore:")) return A.restore(Number(author.slice(8))); // copy-ok
  return author;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * The version history pop up (M110): the draft's revisions, newest first,
 * with who saved and which fields changed, and Restore on each. A free
 * account sees the published versions under the Studio+ gate.
 */
export function HistoryDialog({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const C = BUILD_COPY.history;
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HistoryData | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  useModalBehavior({ onClose, containerRef, active: open });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setData(null);
    setFailed(false);
    fetch(`/api/ideation/projects/${projectId}/revisions`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: HistoryData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  if (!open) return null;

  const restore = async (rev: number) => {
    setState("busy");
    const res = await fetch(`/api/ideation/projects/${projectId}/revisions/${rev}/restore`, { method: "POST" });
    if (!res.ok) {
      setState("failed");
      return;
    }
    setState("done");
    window.setTimeout(() => window.location.reload(), 600);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={C.title} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 md:py-14">
      <div className="fixed inset-0 bg-ink-950/80" onClick={onClose} />
      <div ref={containerRef} tabIndex={-1} className="relative z-10 w-full max-w-2xl rounded-xl border border-ink-700/60 bg-ink-900 focus:outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700/40 px-5 py-4 md:px-6">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">{C.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">{C.intro}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={C.close} className="rounded-lg border border-ink-700/60 p-1.5 text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-5 md:px-6">
          {failed ? (
            <p className="text-xs text-rose-400">{C.failed}</p>
          ) : !data ? (
            <p className="text-sm text-ink-500">{C.loading}</p>
          ) : (
            <>
              {state === "done" ? <p className="text-xs text-ink-200">{C.restored}</p> : null}
              {state === "failed" ? <p className="text-xs text-rose-400">{C.failed}</p> : null}
              {data.plus ? (
                data.revisions.length === 0 ? (
                  <p className="text-sm text-ink-500">{C.empty}</p>
                ) : (
                  <ul className="divide-y divide-ink-700/40 rounded-lg border border-ink-700/60">
                    {data.revisions.map((r) => (
                      <li key={r.rev} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-50">
                            {C.row(r.rev)} <span className="font-normal text-ink-400">· {authorLabel(r.author)} · {when(r.createdAt)}</span>
                          </p>
                          <p className="mt-0.5 truncate text-xs text-ink-500">
                            {r.changed.length ? C.changed(r.changed.map((k) => pathLabel(k)).join(", ")) : C.unchanged}
                          </p>
                        </div>
                        {confirm === r.rev ? (
                          <span className="flex flex-wrap items-center gap-2 text-xs text-ink-300">
                            <span className="max-w-xs">{C.restoreConfirm(r.rev)}</span>
                            <Button size="sm" onClick={() => void restore(r.rev)} disabled={state === "busy"}>
                              {state === "busy" ? C.busy : C.yes}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)} disabled={state === "busy"}>
                              {C.no}
                            </Button>
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setConfirm(r.rev)} disabled={state === "busy"}>
                            {C.restore}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <PlusGate feature="version_history" />
              )}
              <div>
                <p className="text-xs font-medium text-ink-200">{C.publishedTitle}</p>
                {data.snapshots.length === 0 ? (
                  <p className="mt-1 text-xs text-ink-500">{C.publishedNone}</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-xs text-ink-400">
                    {data.snapshots.map((s) => (
                      <li key={s.hash}>{C.publishedRow(s.version, new Date(s.createdAt).toLocaleDateString("en-US"))}</li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end border-t border-ink-700/40 px-5 py-3 md:px-6">
          <Button size="sm" variant="ghost" onClick={onClose}>
            {C.close}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
