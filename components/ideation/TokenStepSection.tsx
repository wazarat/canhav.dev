"use client";

import { Badge } from "@/components/ui/Badge";
import { CheckItem } from "@/components/ui/CheckItem";
import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { CHECKLIST_COPY } from "@/content/kits/copy";
import { TOKEN_STEPS, TOKEN_STEPS_COPY, TOKEN_STEP_LABELS, tokenBuildProgressOf, tokenBuildRowsOf } from "@/content/token-steps";
import type { TokenDesignDoc } from "@/lib/ideation";
import {
  type TokenBuildRow,
  type TokenLaunchFacts,
  type TokenStepKey,
  type TokenStepLink,
  toggleTokenStep,
} from "@/lib/token-steps";

const STATE_TONE: Record<TokenBuildRow["state"], StatusTone> = {
  done: "success",
  open: "neutral",
  na: "neutral",
};

/** Editor step index for a design step badge, so it can jump there. */
const STEP_INDEX: Partial<Record<TokenStepKey, number>> = {
  rationale: 0,
  supply: 1,
  vesting: 2,
  distribution: 3,
  market: 4,
  governance: 5,
  legal: 6,
  postLaunch: 7,
};

/**
 * The token build steps section of the token design editor (M46). Design
 * rows are checkboxes with a badge that jumps to the editor step they
 * inform. Launch rows are either checkboxes for the post-launch
 * commitments or, for what the platform can see, a chip read from the
 * facts the page gathered. Ticks live in doc.checklist.
 */
export function TokenStepSection({
  doc,
  facts,
  designId,
  slug,
  linkedProjectId,
  onPatch,
  onJump,
}: {
  doc: TokenDesignDoc;
  facts: TokenLaunchFacts;
  designId: string;
  slug: string | null;
  linkedProjectId: string | null;
  onPatch: (partial: Pick<TokenDesignDoc, "checklist">) => void;
  onJump: (stepIndex: number) => void;
}) {
  const rows = tokenBuildRowsOf(doc, facts);
  const progress = tokenBuildProgressOf(doc, facts);
  const naCount = rows.filter((r) => r.state === "na").length;
  const href = (link: TokenStepLink): string | null => {
    switch (link) {
      case "publicPage":
        return facts.published && slug ? `/t/${slug}` : null;
      case "project":
        return linkedProjectId ? `/studio/project/${linkedProjectId}` : null;
      case "launch":
        return facts.published ? `/launch?design=${designId}` : null;
      case "tokenPage":
        return facts.deployedAddress ? `/launch/t/${facts.deployedAddress}` : null;
    }
  };

  const phase = (key: "design" | "launch") => rows.filter((r) => r.step.phase === key);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink-50">{TOKEN_STEPS_COPY.title}</h2>
          <StatusChip tone={progress.done === progress.total ? "success" : "neutral"}>
            {CHECKLIST_COPY.progress(progress.done, progress.total)}
          </StatusChip>
        </div>
      </div>

      <StatusChip tone="info" variant="block">
        <span className="block">{TOKEN_STEPS_COPY.intro}</span>
        {!facts.linked ? <span className="mt-1 block text-ink-400">{TOKEN_STEPS_COPY.noProject}</span> : null}
      </StatusChip>

      {(["design", "launch"] as const).map((key) => (
        <div key={key}>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            {TOKEN_STEPS_COPY.phases[key]}
          </p>
          <ol className="mt-1 space-y-0.5">
            {phase(key).map((row, i) => {
              const done = row.state === "done";
              const target = row.step.link ? href(row.step.link) : null;
              const stepIndex = STEP_INDEX[row.step.step];
              const meta = (
                <span className="flex flex-wrap items-center gap-1.5">
                  {stepIndex !== undefined ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onJump(stepIndex);
                      }}
                      className="rounded-full"
                    >
                      <Badge className="px-2 py-0 text-[10px] transition-colors hover:text-ink-50">
                        {TOKEN_STEP_LABELS[row.step.step]}
                      </Badge>
                    </button>
                  ) : (
                    <Badge className="px-2 py-0 text-[10px]">{TOKEN_STEP_LABELS[row.step.step]}</Badge>
                  )}
                  {target && row.step.link ? (
                    <a
                      href={target}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] text-electric-400 transition-colors hover:text-ink-50"
                    >
                      {TOKEN_STEPS_COPY.links[row.step.link]}
                    </a>
                  ) : null}
                </span>
              );
              const title = (
                <span className={done ? "text-ink-400 line-through decoration-ink-600" : undefined}>
                  <span className="mr-1.5 tabular text-ink-500">{i + 1}.</span>
                  {row.step.title}
                </span>
              );
              const detail = (
                <span className="block space-y-1.5">
                  <span className="block">{row.step.detail}</span>
                  {meta}
                </span>
              );
              if (!row.computed) {
                return (
                  <li key={row.step.id}>
                    <CheckItem
                      checked={done}
                      onChange={(v) => onPatch(toggleTokenStep(doc, row.step.id, v))}
                      label={title}
                      description={detail}
                    />
                  </li>
                );
              }
              return (
                <li key={row.step.id} className="flex items-start gap-3 rounded-xl px-2 py-2">
                  <StatusChip tone={STATE_TONE[row.state]} className="mt-0.5 shrink-0 px-2 py-0.5 text-[11px]">
                    {TOKEN_STEPS_COPY.states[row.state]}
                  </StatusChip>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm leading-snug text-ink-100">{title}</span>
                    <span className="block text-xs leading-relaxed text-ink-400">{detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}

      {naCount ? (
        <p className="border-t border-ink-800/70 pt-3 text-xs leading-relaxed text-ink-500">
          {TOKEN_STEPS_COPY.naNote(naCount)}
        </p>
      ) : null}
      <p className="text-[11px] text-ink-500">{TOKEN_STEPS.length} steps in all.</p>
    </div>
  );
}
