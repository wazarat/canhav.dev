"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CheckItem } from "@/components/ui/CheckItem";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { Field, TextArea } from "@/components/ui/Input";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { BUILD_COPY } from "@/content/build";
import { askSummaryPrompt, reviseSummaryPrompt } from "@/lib/agent-prompts";
import type { ProjectSummary } from "@/lib/ideation";

/**
 * The summary pop up (M104): the agent's built and building lists, each
 * line tickable, a note on what should be different, and the prompt that
 * carries both back to the IDE. Without a summary it offers the prompt
 * that asks for one.
 */
export function SummaryDialog({
  open,
  onClose,
  name,
  projectId,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  projectId: string;
  summary: ProjectSummary | null;
}) {
  const C = BUILD_COPY.overview.summary;
  const containerRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  useModalBehavior({ onClose, containerRef, active: open });
  if (!open) return null;

  const toggle = (line: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  const list = (title: string, lines: string[]) => (
    <div>
      <p className="text-xs font-medium text-ink-200">{title}</p>
      {lines.length === 0 ? (
        <p className="mt-1 text-xs text-ink-500">{BUILD_COPY.overview.progressDialog.allDone}</p>
      ) : (
        <ul className="mt-1">
          {lines.map((line) => (
            <li key={line}>
              <CheckItem checked={picked.has(line)} onChange={() => toggle(line)} label={<span className="text-sm text-ink-100">{line}</span>} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={C.title} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 md:py-14">
      <div className="fixed inset-0 bg-ink-950/80" onClick={onClose} />
      <div ref={containerRef} tabIndex={-1} className="relative z-10 w-full max-w-2xl rounded-xl border border-ink-700/60 bg-ink-900 focus:outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700/40 px-5 py-4 md:px-6">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">{C.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">{C.intro}</p>
            {summary ? <p className="mt-1 text-[11px] text-ink-500">{C.updated(new Date(summary.updatedAt).toLocaleDateString("en-US"))}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={C.close} className="rounded-lg border border-ink-700/60 p-1.5 text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-5 md:px-6">
          {summary ? (
            <>
              {list(C.built, summary.built)}
              {list(C.building, summary.building)}
              <Field label={C.noteLabel}>
                <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={C.notePlaceholder} maxLength={600} />
              </Field>
              <CopyBlock label={`${C.promptLabel}, ${C.picked(picked.size)}`} text={reviseSummaryPrompt(name, projectId, [...picked], note)} hint={C.promptHint} />
            </>
          ) : (
            <>
              <p className="text-sm text-ink-400">{C.none}</p>
              <CopyBlock label={C.askLabel} text={askSummaryPrompt(name, projectId)} />
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
