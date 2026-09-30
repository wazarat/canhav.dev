"use client";

import { StatusChip } from "@/components/ui/StatusChip";
import { joinAnd, shapeLabel } from "@/content/kits/copy";
import { RATIONALE_SHORT, TOKEN_ADVICE_COPY } from "@/content/token-advice";
import type { RationaleWhy } from "@/lib/ideation";
import type { ProductShape } from "@/lib/kits";
import { rationaleFitsShapes, shapeAdviceFor } from "@/lib/token-advice";

/**
 * The shape-aware token advice on the Rationale step (M47). One status
 * chip, info tone, warning tone with the mismatch line when the chosen
 * reason is one every linked shape says to avoid. Nothing when the design
 * is not linked to a project with a product shape.
 */
export function ShapeAdviceCard({
  shapes,
  why,
}: {
  shapes: readonly ProductShape[];
  why: RationaleWhy | "";
}) {
  const advice = shapeAdviceFor(shapes);
  if (!advice) return null;
  const labels = advice.shapes.map((s) => shapeLabel(s) ?? s);
  const several = advice.shapes.length > 1;
  const mismatch = rationaleFitsShapes(why, shapes) === "avoid";
  const names = (list: readonly RationaleWhy[]) =>
    list.length ? joinAnd(list.map((w) => RATIONALE_SHORT[w])) : TOKEN_ADVICE_COPY.none;

  return (
    <StatusChip tone={mismatch ? "warning" : "info"} variant="block">
      <span className="block font-medium text-ink-100">{TOKEN_ADVICE_COPY.title(joinAnd(labels))}</span>
      <span className="mt-1 block">{TOKEN_ADVICE_COPY.needsToken[advice.needsToken]}</span>
      {advice.lines.map((line) => (
        <span key={line.shape} className="mt-1 block">
          {several ? <span className="font-medium text-ink-100">{shapeLabel(line.shape)}. </span> : null}
          {line.summary}
        </span>
      ))}
      {several ? <span className="mt-1 block text-ink-400">{TOKEN_ADVICE_COPY.merged}</span> : null}
      <span className="mt-2 block">
        <span className="text-ink-400">{TOKEN_ADVICE_COPY.fits} </span>
        {names(advice.fits)}
      </span>
      <span className="mt-0.5 block">
        <span className="text-ink-400">{TOKEN_ADVICE_COPY.avoid} </span>
        {names(advice.avoid)}
      </span>
      <span className="mt-2 block text-ink-400">{TOKEN_ADVICE_COPY.lock}</span>
      {advice.lines.map((line) => (
        <span key={`${line.shape}-lock`} className="block">
          {several ? <span className="font-medium text-ink-100">{shapeLabel(line.shape)}. </span> : null}
          {line.lock}
        </span>
      ))}
      <span className="mt-2 block text-ink-400">{TOKEN_ADVICE_COPY.example}</span>
      {advice.lines.map((line) => (
        <span key={`${line.shape}-example`} className="block">
          {several ? <span className="font-medium text-ink-100">{shapeLabel(line.shape)}. </span> : null}
          {line.example}
        </span>
      ))}
      {mismatch ? (
        <span className="mt-2 block font-medium text-ink-100">{TOKEN_ADVICE_COPY.mismatch}</span>
      ) : null}
    </StatusChip>
  );
}
