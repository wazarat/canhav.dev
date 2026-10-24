import { z } from "zod";

import { type CanvasItem, type ItemLimits, normalizeItems } from "@/lib/canvas-items";

/**
 * The Business Model Canvas (M113, items since M155): nine blocks, each a
 * short list of items with an id, drafted by CanHav or the owner's agent
 * and edited by the team block by block. Pure.
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
export type Canvas = Partial<Record<CanvasBlock, CanvasItem[]>>;

export const CANVAS_LIMITS = { items: { max: 8 }, item: { min: 2, max: 140 } } as const;
export const CANVAS_ITEM_LIMITS: ItemLimits = { max: CANVAS_LIMITS.items.max, min: CANVAS_LIMITS.item.min, maxChars: CANVAS_LIMITS.item.max };

/**
 * The classic layout (M155): the reading order on a phone, and where each
 * block sits on a ten column grid on wider screens. Partners, the value
 * proposition and the segments run the full height of the top band,
 * activities sit over resources and relationships over channels, and the
 * cost structure and revenue streams make the bottom band.
 */
export const CANVAS_LAYOUT: ReadonlyArray<{ block: CanvasBlock; className: string }> = [
  { block: "keyPartners", className: "md:col-span-2 md:row-span-2" },
  { block: "keyActivities", className: "md:col-span-2" },
  { block: "valueProposition", className: "md:col-span-2 md:row-span-2" },
  { block: "customerRelationships", className: "md:col-span-2" },
  { block: "customerSegments", className: "md:col-span-2 md:row-span-2" },
  { block: "keyResources", className: "md:col-span-2 md:col-start-3" },
  { block: "channels", className: "md:col-span-2 md:col-start-7" },
  { block: "costStructure", className: "md:col-span-5" },
  { block: "revenueStreams", className: "md:col-span-5" },
];

export function isCanvasBlock(value: unknown): value is CanvasBlock {
  return typeof value === "string" && (CANVAS_BLOCKS as readonly string[]).includes(value);
}

/** The blocks as stored: items normalized (a paragraph or plain lines lifted, ids kept or assigned), empty blocks dropped; null when nothing survives. */
export function normalizeCanvas(raw: unknown): Canvas | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Canvas = {};
  for (const block of CANVAS_BLOCKS) {
    const items = normalizeItems((raw as Record<string, unknown>)[block], CANVAS_ITEM_LIMITS);
    if (items.length) out[block] = items;
  }
  return Object.keys(out).length ? out : null;
}

/** How many of the nine blocks hold at least one item. */
export function canvasFilled(canvas: Canvas | undefined): number {
  return canvas ? CANVAS_BLOCKS.filter((b) => canvas[b]?.length).length : 0;
}

const itemText = z.string().min(CANVAS_LIMITS.item.min).max(CANVAS_LIMITS.item.max);
/** A block in a patch: a paragraph (split into items), or a list of plain lines and items with an optional id that keeps an item in place, mixed as the agent likes. */
const blockPatch = z.union([
  z.string().max(CANVAS_LIMITS.items.max * CANVAS_LIMITS.item.max),
  z.array(z.union([itemText, z.strictObject({ id: z.string().regex(/^[a-z0-9]{4,12}$/).optional(), text: itemText })])).max(CANVAS_LIMITS.items.max),
]);
export type CanvasBlockPatch = z.infer<typeof blockPatch>;

/** A patch: any subset of blocks, each replacing the stored block, merged over the stored canvas. */
export const canvasPatchSchema = z.strictObject(Object.fromEntries(CANVAS_BLOCKS.map((b) => [b, blockPatch.optional()])) as Record<CanvasBlock, z.ZodOptional<typeof blockPatch>>);

/** A full draft: every block as short lines. */
const draftBlock = z.array(z.string());
export const canvasDraftSchema = z.object(Object.fromEntries(CANVAS_BLOCKS.map((b) => [b, draftBlock])) as Record<CanvasBlock, typeof draftBlock>);
export type CanvasDraft = z.infer<typeof canvasDraftSchema>;

export const canvasBlockDraftSchema = z.object({ items: z.array(z.string()) });
