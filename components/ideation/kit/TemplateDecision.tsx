"use client";

import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { TEMPLATE_COPY as T } from "@/content/templates/copy";
import type { TemplateDecision as Decision, TemplateState } from "@/lib/kits";

/**
 * The decision row under a TemplateCard in the project editor (M63). Open
 * shows Accept and Reject, a decision shows its chip and Undo. The chip is
 * the only coloured element, per the StatusChip rules.
 */
export function TemplateDecisionRow({
  state,
  suggestedBy,
  onDecide,
}: {
  state: TemplateState;
  /** A line above the controls, for example which feature suggested it. */
  suggestedBy?: string;
  onDecide: (decision: Decision | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-ink-800/70 pt-3">
      {suggestedBy ? <span className="w-full text-[11px] text-ink-500">{suggestedBy}</span> : null}
      <StatusChip tone={T.stateTone[state]} className="px-2 py-0.5 text-[11px]">
        {T.state[state]}
      </StatusChip>
      <span className="ml-auto flex items-center gap-2">
        {state === "open" ? (
          <>
            <Button size="sm" variant="outline" onClick={() => onDecide("accepted")}>
              {T.accept}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDecide("rejected")}>
              {T.reject}
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onDecide(null)}
            className="text-xs text-electric-300 transition-colors hover:text-electric-200"
          >
            {T.undo}
          </button>
        )}
      </span>
    </div>
  );
}
