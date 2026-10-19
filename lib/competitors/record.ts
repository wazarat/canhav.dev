import { z } from "zod";

/**
 * What a project records about its competitors (M115). Only the
 * differentiator line is published; the axes and pins are the team's own
 * view of the map. Pure.
 */
export const COMPETITOR_AXES = ["tvl", "age"] as const;
export type CompetitorAxis = (typeof COMPETITOR_AXES)[number];

export interface Competitors {
  /** One line on how the project differs. Published. */
  differentiator: string;
  axes?: { x: CompetitorAxis; y: CompetitorAxis };
  /** DefiLlama slugs to keep on the map beyond the largest ones. */
  pinned?: string[];
}

export const COMPETITOR_LIMITS = { differentiator: { max: 300 }, pinned: { max: 12 }, mapRows: 8, tableRows: 40 } as const;

const axis = z.enum(COMPETITOR_AXES);

export const competitorsPatchSchema = z.strictObject({
  differentiator: z.string().max(COMPETITOR_LIMITS.differentiator.max).optional(),
  axes: z.object({ x: axis, y: axis }).optional(),
  pinned: z.array(z.string().min(1).max(80)).max(COMPETITOR_LIMITS.pinned.max).optional(),
});

export const competitorsDraftSchema = z.object({ differentiator: z.string().max(COMPETITOR_LIMITS.differentiator.max) });

export function normalizeCompetitors(raw: unknown): Competitors | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const differentiator = typeof o.differentiator === "string" ? o.differentiator.trim().slice(0, COMPETITOR_LIMITS.differentiator.max) : "";
  const ax = o.axes as { x?: unknown; y?: unknown } | undefined;
  const axes =
    ax && COMPETITOR_AXES.includes(ax.x as CompetitorAxis) && COMPETITOR_AXES.includes(ax.y as CompetitorAxis) ? { x: ax.x as CompetitorAxis, y: ax.y as CompetitorAxis } : undefined;
  const pinned = Array.isArray(o.pinned) ? o.pinned.filter((p): p is string => typeof p === "string" && p.length > 0).slice(0, COMPETITOR_LIMITS.pinned.max) : undefined;
  if (!differentiator && !axes && !pinned?.length) return null;
  return { differentiator, ...(axes ? { axes } : {}), ...(pinned?.length ? { pinned } : {}) };
}

/** What the published record keeps: the line, nothing of the map's state. */
export function publishedCompetitors(c: Competitors | undefined): Competitors | undefined {
  return c?.differentiator ? { differentiator: c.differentiator } : undefined;
}

/** Months since a unix timestamp, for the age axis. */
export function ageMonths(listedAt: number | null, now = Date.now()): number | null {
  if (!listedAt) return null;
  return Math.max(0, Math.round((now / 1000 - listedAt) / (30 * 86_400)));
}
