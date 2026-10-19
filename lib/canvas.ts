import { z } from "zod";

/**
 * The Business Model Canvas (M113): nine blocks of free text on the
 * project record, drafted by CanHav or the owner's agent and edited by the
 * team. Pure.
 */
export const CANVAS_BLOCKS = [
  "customerSegments",
  "valueProposition",
  "channels",
  "customerRelationships",
  "revenueStreams",
  "keyResources",
  "keyActivities",
  "keyPartners",
  "costStructure",
] as const;

export type CanvasBlock = (typeof CANVAS_BLOCKS)[number];
export type Canvas = Partial<Record<CanvasBlock, string>>;

export const CANVAS_LIMITS = { block: { max: 600 } } as const;

export function isCanvasBlock(value: unknown): value is CanvasBlock {
  return typeof value === "string" && (CANVAS_BLOCKS as readonly string[]).includes(value);
}

/** The blocks as stored: trimmed, capped, empty ones dropped; null when nothing survives. */
export function normalizeCanvas(raw: unknown): Canvas | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Canvas = {};
  for (const block of CANVAS_BLOCKS) {
    const v = (raw as Record<string, unknown>)[block];
    if (typeof v !== "string") continue;
    const t = v.trim().slice(0, CANVAS_LIMITS.block.max);
    if (t) out[block] = t;
  }
  return Object.keys(out).length ? out : null;
}

/** How many of the nine blocks hold text. */
export function canvasFilled(canvas: Canvas | undefined): number {
  return canvas ? CANVAS_BLOCKS.filter((b) => canvas[b]?.trim()).length : 0;
}

const block = z.string().max(CANVAS_LIMITS.block.max);

/** A patch: any subset of blocks, merged over the stored canvas. */
export const canvasPatchSchema = z.strictObject(Object.fromEntries(CANVAS_BLOCKS.map((b) => [b, block.optional()])) as Record<CanvasBlock, z.ZodOptional<typeof block>>);

/** A full draft: every block present. */
export const canvasDraftSchema = z.object(Object.fromEntries(CANVAS_BLOCKS.map((b) => [b, block])) as Record<CanvasBlock, typeof block>);

export const canvasBlockDraftSchema = z.object({ text: block });
