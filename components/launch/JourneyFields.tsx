"use client";

import { Plus, Trash2 } from "lucide-react";

import { Field, Input, TextArea } from "@/components/ui/Input";
import { JOURNEY_LIMITS, type JourneyMilestone } from "@/lib/journey";

/** Step 2 of the launch flow: the journey document fields. Parent owns state. */
export function JourneyFields({
  why,
  supplyRationale,
  milestones,
  onWhy,
  onSupplyRationale,
  onMilestones,
}: {
  why: string;
  supplyRationale: string;
  milestones: JourneyMilestone[];
  onWhy: (v: string) => void;
  onSupplyRationale: (v: string) => void;
  onMilestones: (v: JourneyMilestone[]) => void;
}) {
  const L = JOURNEY_LIMITS;

  function updateMilestone(i: number, patch: Partial<JourneyMilestone>) {
    onMilestones(milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }

  return (
    <div className="space-y-5">
      <Field
        label="Why this token"
        required
        hint="What is this token and why does it exist."
        counter={String(why.length)}
        range={`${L.why.min}–${L.why.max.toLocaleString("en-US")}`}
        counterMet={why.length >= L.why.min}
      >
        <TextArea
          value={why}
          rows={5}
          maxLength={L.why.max}
          placeholder="The problem, the idea, and why a token is the right shape for it…"
          className="resize-none"
          onChange={(e) => onWhy(e.target.value)}
        />
      </Field>

      <Field
        label="Supply rationale"
        required
        hint="Why this total supply, and who gets it."
        counter={String(supplyRationale.length)}
        range={`${L.supplyRationale.min}–${L.supplyRationale.max.toLocaleString("en-US")}`}
        counterMet={supplyRationale.length >= L.supplyRationale.min}
      >
        <TextArea
          value={supplyRationale}
          rows={3}
          maxLength={L.supplyRationale.max}
          placeholder="How the number was chosen and how it will be distributed…"
          className="resize-none"
          onChange={(e) => onSupplyRationale(e.target.value)}
        />
      </Field>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-ink-200">
            Roadmap milestones <span className="text-rose-400">*</span>
          </span>
          <span className="tabular text-xs font-medium text-ink-300">
            {L.milestones.min}–{L.milestones.max} dated milestones
          </span>
        </div>

        {milestones.map((m, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-400">Milestone {i + 1}</span>
              {milestones.length > L.milestones.min ? (
                <button
                  type="button"
                  aria-label={`Remove milestone ${i + 1}`}
                  onClick={() => onMilestones(milestones.filter((_, j) => j !== i))}
                  className="text-ink-500 transition-colors hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
              <Input
                type="date"
                value={m.date}
                onChange={(e) => updateMilestone(i, { date: e.target.value })}
              />
              <Input
                value={m.title}
                maxLength={L.milestones.titleMax}
                placeholder="Milestone title"
                onChange={(e) => updateMilestone(i, { title: e.target.value })}
              />
            </div>
            <TextArea
              value={m.description}
              rows={2}
              maxLength={L.milestones.descriptionMax}
              placeholder="What ships, and how anyone can verify it (optional)"
              className="resize-none"
              onChange={(e) => updateMilestone(i, { description: e.target.value })}
            />
          </div>
        ))}

        {milestones.length < L.milestones.max ? (
          <button
            type="button"
            onClick={() =>
              onMilestones([...milestones, { date: "", title: "", description: "" }])
            }
            className="inline-flex items-center gap-1.5 text-xs text-electric-300 transition-colors hover:text-electric-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add milestone
          </button>
        ) : null}
      </div>
    </div>
  );
}
