"use client";

import { useState } from "react";

import { TextField } from "@/components/ideation/TextField";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { BRIEF_LIMITS, type BriefQuestion } from "@/lib/draft/briefs";

/**
 * The brief before a draft (M142): an inline card with one short field
 * per open question, Draft, and Skip. Answers come back to the control,
 * which saves them on the record and runs the action it was asked for.
 */
export function DraftBrief({
  questions,
  initial,
  working,
  onDraft,
  onSkip,
}: {
  questions: BriefQuestion[];
  /** Earlier answers for this kind, prefilled. */
  initial?: Record<string, string>;
  working?: boolean;
  onDraft: (answers: Record<string, string>) => void;
  onSkip: () => void;
}) {
  const C = STUDIO_PLUS_COPY.brief;
  const Q = C.questions as Record<string, { label: string; hint: string }>;
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({ ...(initial ?? {}) }));
  const filled = questions.some((q) => answers[q.id]?.trim());
  return (
    <Card className="max-w-2xl">
      <CardSection className="space-y-4">
        <div className="space-y-1">
          <h3 className="font-display text-sm font-semibold text-ink-50">{C.title}</h3>
          <p className="text-xs leading-relaxed text-ink-400">{C.lead}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {questions.map((q) => (
            <TextField
              key={q.id}
              label={Q[q.id]?.label ?? q.id}
              hint={Q[q.id]?.hint}
              value={answers[q.id] ?? ""}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              max={BRIEF_LIMITS.answer.max}
              rows={2}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => onDraft(answers)} disabled={working || !filled} aria-busy={working}>
            {C.draft}
          </Button>
          <Button size="sm" variant="ghost" onClick={onSkip} disabled={working}>
            {C.skip}
          </Button>
        </div>
      </CardSection>
    </Card>
  );
}
