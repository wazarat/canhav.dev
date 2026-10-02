"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { REFERENCES_COPY } from "@/content/ideation";
import { PROJECT_LIMITS, type ProjectReference, referenceIsLink } from "@/lib/ideation";

/**
 * The team's own files for a project, by reference (M53). Each row is a
 * title, where the file lives (a link or a path on the team's machine) and
 * an optional line on what it is for. Nothing is uploaded and nothing here
 * is published; the list reaches the team's agent through the project's MCP
 * server and the draft exports.
 */
export function ReferencesEditor({
  references,
  onChange,
}: {
  references: ProjectReference[];
  onChange: (references: ProjectReference[]) => void;
}) {
  const L = PROJECT_LIMITS;
  const atMax = references.length >= L.references.max;
  const update = (i: number, patch: Partial<ProjectReference>) =>
    onChange(references.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-medium text-ink-200">{REFERENCES_COPY.label}</span>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">{REFERENCES_COPY.hint}</p>
      </div>
      <div className="space-y-3">
        {references.map((ref, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-ink-700/60 bg-ink-950/50 p-3">
            <div className="flex items-start gap-2">
              <Input
                value={ref.title}
                onChange={(e) => update(i, { title: e.target.value })}
                maxLength={L.referenceTitle.max}
                placeholder={REFERENCES_COPY.titlePlaceholder}
                aria-label={REFERENCES_COPY.titleLabel}
                className="flex-1"
              />
              {ref.location.trim() ? (
                <StatusChip tone="neutral">
                  {referenceIsLink(ref) ? REFERENCES_COPY.link : REFERENCES_COPY.local}
                </StatusChip>
              ) : null}
              <button
                type="button"
                onClick={() => onChange(references.filter((_, j) => j !== i))}
                aria-label={REFERENCES_COPY.remove(ref.title)}
                title={REFERENCES_COPY.removeTitle}
                className="mt-1.5 rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              value={ref.location}
              onChange={(e) => update(i, { location: e.target.value })}
              maxLength={L.referenceLocation.max}
              placeholder={REFERENCES_COPY.locationPlaceholder}
              aria-label={REFERENCES_COPY.locationLabel}
              className="font-mono text-xs"
            />
            <Input
              value={ref.note}
              onChange={(e) => update(i, { note: e.target.value })}
              maxLength={L.referenceNote.max}
              placeholder={REFERENCES_COPY.notePlaceholder}
              aria-label={REFERENCES_COPY.noteLabel}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={atMax}
        onClick={() => onChange([...references, { title: "", location: "", note: "" }])}
      >
        {REFERENCES_COPY.add}
      </Button>
      {atMax ? <p className="text-xs text-ink-500">{REFERENCES_COPY.limit(L.references.max)}</p> : null}
    </div>
  );
}
