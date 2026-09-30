"use client";

import { Plus, Trash2 } from "lucide-react";

import { Input, TextArea } from "@/components/ui/Input";
import { JOURNEY_LIMITS, type JourneyMilestone } from "@/lib/journey";

/**
 * The dated milestone list, shared by the launch form's journey (through
 * JourneyFields) and the token design's Post-launch step (M48). Parent owns
 * state. The same limits as the journey, so a design's milestones are a
 * valid commitment when the launch reads them.
 */
export function MilestoneListFields({
  milestones,
  onChange,
  heading = "Roadmap milestones",
  required = true,
}: {
  milestones: JourneyMilestone[];
  onChange: (v: JourneyMilestone[]) => void;
  heading?: string;
  required?: boolean;
}) {
  const L = JOURNEY_LIMITS;

  function update(i: number, patch: Partial<JourneyMilestone>) {
    onChange(milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-200">
          {heading} {required ? <span className="text-rose-400">*</span> : null}
        </span>
        <span className="tabular text-xs font-medium text-ink-300">
          {L.milestones.min}–{L.milestones.max} dated milestones
        </span>
      </div>

      {milestones.map((m, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-400">Milestone {i + 1}</span>
            {milestones.length > L.milestones.min ? (
              <button
                type="button"
                aria-label={`Remove milestone ${i + 1}`}
                onClick={() => onChange(milestones.filter((_, j) => j !== i))}
                className="text-ink-500 transition-colors hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
            <Input type="date" value={m.date} onChange={(e) => update(i, { date: e.target.value })} />
            <Input
              value={m.title}
              maxLength={L.milestones.titleMax}
              placeholder="Milestone title"
              onChange={(e) => update(i, { title: e.target.value })}
            />
          </div>
          <TextArea
            value={m.description}
            rows={2}
            maxLength={L.milestones.descriptionMax}
            placeholder="What ships, and how anyone can verify it (optional)"
            className="resize-none"
            onChange={(e) => update(i, { description: e.target.value })}
          />
        </div>
      ))}

      {milestones.length < L.milestones.max ? (
        <button
          type="button"
          onClick={() => onChange([...milestones, { date: "", title: "", description: "" }])}
          className="inline-flex items-center gap-1.5 text-xs text-electric-300 transition-colors hover:text-electric-200"
        >
          <Plus className="h-3.5 w-3.5" /> Add milestone
        </button>
      ) : null}
    </div>
  );
}
