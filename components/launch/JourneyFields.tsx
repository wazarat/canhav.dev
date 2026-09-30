"use client";

import { MilestoneListFields } from "@/components/launch/MilestoneListFields";
import { Field, TextArea } from "@/components/ui/Input";
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

      <MilestoneListFields milestones={milestones} onChange={onMilestones} />
    </div>
  );
}
