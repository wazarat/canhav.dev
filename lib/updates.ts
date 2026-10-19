import { z } from "zod";

/**
 * Weekly updates (M124, Studio+). Pure: the limits, the week key and the
 * shapes the routes, the draft kind and the MCP tool share. A weekly
 * update is written by the team or its agent and published to the public
 * page; it is not the wallet signed milestone update anchored on chain.
 */
export const UPDATE_LIMITS = {
  body: { min: 40, max: 4000 },
  highlights: { max: 5, each: 160 },
  shown: 12,
} as const;

/** The Monday of the week that holds the date, as an ISO date (UTC). */
export function weekOf(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export const weeklyDraftSchema = z.object({
  body: z.string().min(UPDATE_LIMITS.body.min).max(UPDATE_LIMITS.body.max),
  highlights: z.array(z.string().max(UPDATE_LIMITS.highlights.each)).max(UPDATE_LIMITS.highlights.max),
});
export type WeeklyDraft = z.infer<typeof weeklyDraftSchema>;

export const updateInputSchema = z.object({
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  body: z.string().trim().min(1).max(UPDATE_LIMITS.body.max),
  highlights: z.array(z.string().trim().min(1).max(UPDATE_LIMITS.highlights.each)).max(UPDATE_LIMITS.highlights.max).optional(),
});

export interface ProjectUpdate {
  id: string;
  weekOf: string;
  body: string;
  highlights: string[];
  status: "draft" | "published";
  author: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** "Week of Oct 13" from the ISO Monday. */
export function weekLabel(iso: string): string {
  return `Week of ${new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}
