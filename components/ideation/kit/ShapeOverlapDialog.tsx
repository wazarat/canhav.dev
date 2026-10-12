"use client";

import { useMemo, useRef, useState } from "react";
import { Layers, X } from "lucide-react";

import { StatusChip } from "@/components/ui/StatusChip";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { FIELD_INTROS } from "@/content/ideation-resources";
import { KIT_COPY, shapeLabel } from "@/content/kits/copy";
import type { ProjectDoc } from "@/lib/ideation";
import { shapeOverlap } from "@/lib/kit-overlap";

/**
 * "How the shapes relate" on the Basics step (M68 follow-up). Opens a dialog
 * that lists the chosen shapes with what each brings on its own and what
 * they share, over the research pack, the build steps and the contract
 * templates, then the stack prose from content/ideation-resources.ts.
 */
export function ShapeOverlapDialog({ doc }: { doc: ProjectDoc }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink-700/60 bg-ink-900/60 px-2.5 py-1 text-[11px] font-medium text-ink-300 transition-colors hover:border-electric-500/40 hover:text-ink-50"
      >
        <Layers aria-hidden className="h-3 w-3 text-electric-400" />
        {KIT_COPY.overlapTrigger}
      </button>
      {open ? <Dialog doc={doc} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Dialog({ doc, onClose }: { doc: ProjectDoc; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ onClose, containerRef, active: true });
  const overlap = useMemo(() => shapeOverlap(doc), [doc]);
  const intro = FIELD_INTROS["project.kit.shape"];
  const cols = KIT_COPY.overlapColumns;
  const cell = (only: number, total: number) => (
    <td className="px-2 py-1.5 text-right tabular-nums">
      <span className="text-ink-100">{only}</span>
      <span className="text-ink-500"> of {total}</span>
    </td>
  );
  return (
    <div role="dialog" aria-modal="true" aria-label={KIT_COPY.overlapTrigger} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="glass relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-700/70 animate-fade-in-up"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-lg border border-ink-700 bg-ink-900/60 p-1.5 text-ink-300 transition-colors hover:text-ink-50"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative overflow-hidden border-b border-ink-800/60 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(61,123,255,0.18),transparent_65%)] p-5 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-900/80">
            <Layers className="h-4 w-4 text-electric-400" />
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-ink-50">{KIT_COPY.overlapTrigger}</h3>
        </div>
        <div className="space-y-4 p-5">
          {overlap ? (
            <>
              <div className="flex flex-wrap gap-2">
                {overlap.shapes.map((s) => (
                  <StatusChip key={s.shape} tone="success">
                    {s.label}
                  </StatusChip>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-ink-200">{KIT_COPY.overlapLead(overlap.shapes.length)}</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-ink-500">
                    <th className="py-1.5 text-left font-medium"></th>
                    <th className="px-2 py-1.5 text-right font-medium">{cols.resources}</th>
                    <th className="px-2 py-1.5 text-right font-medium">{cols.steps}</th>
                    <th className="px-2 py-1.5 text-right font-medium">{cols.templates}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800/60">
                  {overlap.shapes.map((s) => (
                    <tr key={s.shape}>
                      <td className="py-1.5 pr-2 text-ink-300">{KIT_COPY.overlapOnly(s.label)}</td>
                      {cell(s.only.resources, s.total.resources)}
                      {cell(s.only.steps, s.total.steps)}
                      {cell(s.only.templates, s.total.templates)}
                    </tr>
                  ))}
                  {overlap.shapes.length > 1 ? (
                    <tr>
                      <td className="py-1.5 pr-2 font-medium text-ink-100">{KIT_COPY.overlapShared}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-ink-100">{overlap.shared.resources}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-ink-100">{overlap.shared.steps.length}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-ink-100">{overlap.shared.templates.length}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {overlap.shapes.length > 1 ? (
                overlap.shared.steps.length || overlap.shared.templates.length ? (
                  <div className="space-y-3 text-xs">
                    {overlap.shared.steps.length ? (
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{KIT_COPY.overlapSharedSteps}</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-300">
                          {overlap.shared.steps.map((st) => (
                            <li key={st.key}>
                              {st.title}{" "}
                              <span className="text-ink-500">({st.shapes.map((x) => shapeLabel(x) ?? x).join(", ")})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {overlap.shared.templates.length ? (
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{KIT_COPY.overlapSharedTemplates}</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-300">
                          {overlap.shared.templates.map((t) => (
                            <li key={t.id}>{t.name}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <StatusChip tone="neutral" variant="block">
                    {KIT_COPY.overlapNone}
                  </StatusChip>
                )
              ) : null}
            </>
          ) : null}
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{KIT_COPY.overlapHow}</p>
          <p className="text-sm leading-relaxed text-ink-200">{intro.body}</p>
          {intro.example ? (
            <p className="rounded-xl border border-ink-800/70 bg-ink-950/50 p-3.5 text-sm leading-relaxed text-ink-400">{intro.example}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
