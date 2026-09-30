import { type NeedsToken, SHAPE_TOKEN_ADVICE } from "@/content/token-advice";
import type { RationaleWhy } from "@/lib/ideation";
import type { ProductShape } from "@/lib/kits";

/**
 * Pure helpers over the shape token advice (M47). Client safe. Used by the
 * Rationale step, the warning rules and the project MCP server.
 */

export const RATIONALE_ORDER: readonly RationaleWhy[] = [
  "token_is_product",
  "bootstrap_supply",
  "economic_security",
  "governance",
  "fee_capture",
  "fundraising",
  "not_sure",
];

const NEEDS_RANK: Record<NeedsToken, number> = { rarely: 0, sometimes: 1, usually: 2 };

export type RationaleFit = "fits" | "neutral" | "avoid";

export interface MergedAdvice {
  shapes: ProductShape[];
  /** The strongest case across the shapes. */
  needsToken: NeedsToken;
  /** The union, in RATIONALE_ORDER. */
  fits: RationaleWhy[];
  /** In every shape's avoid list and in no shape's fits list. */
  avoid: RationaleWhy[];
  lines: Array<{ shape: ProductShape; summary: string; lock: string; example: string }>;
}

/** Merged advice for the shapes, null when there are none. */
export function shapeAdviceFor(shapes: readonly ProductShape[]): MergedAdvice | null {
  const list = [...new Set(shapes)];
  if (!list.length) return null;
  const entries = list.map((s) => SHAPE_TOKEN_ADVICE[s]);
  const fits = new Set(entries.flatMap((e) => e.fits));
  const avoid = RATIONALE_ORDER.filter(
    (why) => !fits.has(why) && entries.every((e) => e.avoid.includes(why)),
  );
  const needsToken = entries
    .map((e) => e.needsToken)
    .reduce((best, n) => (NEEDS_RANK[n] > NEEDS_RANK[best] ? n : best), "rarely" as NeedsToken);
  return {
    shapes: list,
    needsToken,
    fits: RATIONALE_ORDER.filter((why) => fits.has(why)),
    avoid,
    lines: list.map((shape) => {
      const e = SHAPE_TOKEN_ADVICE[shape];
      return { shape, summary: e.summary, lock: e.lock, example: e.example };
    }),
  };
}

/**
 * How a chosen reason sits with the shapes. fits when any shape lists it,
 * avoid when every shape lists it under avoid and none under fits, else
 * neutral. Neutral for no reason, not_sure, or no shapes.
 */
export function rationaleFitsShapes(why: RationaleWhy | "", shapes: readonly ProductShape[]): RationaleFit {
  if (!why || why === "not_sure" || shapes.length === 0) return "neutral";
  const merged = shapeAdviceFor(shapes);
  if (!merged) return "neutral";
  if (merged.fits.includes(why)) return "fits";
  if (merged.avoid.includes(why)) return "avoid";
  return "neutral";
}

/** The lock line per shape, for the token build steps. */
export function lockLinesFor(shapes: readonly ProductShape[]): Array<{ shape: ProductShape; lock: string }> {
  return [...new Set(shapes)].map((shape) => ({ shape, lock: SHAPE_TOKEN_ADVICE[shape].lock }));
}
