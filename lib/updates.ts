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

/** How often the team posts (owner feedback 2026-10-19): the agent is told when one is due; manual means only when asked. */
export const UPDATE_CADENCES = ["daily", "every_other_day", "weekly", "manual"] as const;
export type UpdateCadence = (typeof UPDATE_CADENCES)[number];
export const DEFAULT_CADENCE: UpdateCadence = "weekly";

export function isUpdateCadence(v: unknown): v is UpdateCadence {
  return typeof v === "string" && (UPDATE_CADENCES as readonly string[]).includes(v);
}

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * The start of the period that holds the date, as an ISO date (UTC): the
 * day itself for daily and manual, an even unix day for every other day,
 * the Monday for weekly. One update row per project and period.
 */
export function periodOf(cadence: UpdateCadence, date = new Date()): string {
  if (cadence === "weekly") return weekOf(date);
  const d = utcDay(date);
  if (cadence === "every_other_day") {
    const day = Math.floor(d.getTime() / 86_400_000);
    return new Date((day - (day % 2)) * 86_400_000).toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/** "Oct 19", "Oct 19 to Oct 20" or "Week of Oct 19", by the cadence the row was written under. */
export function periodLabel(cadence: UpdateCadence, iso: string): string {
  const start = new Date(`${iso}T00:00:00Z`);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (cadence === "weekly") return `Week of ${fmt(start)}`;
  if (cadence === "every_other_day") return `${fmt(start)} to ${fmt(new Date(start.getTime() + 86_400_000))}`;
  return fmt(start);
}

/** Whether a new update is due: a cadence other than manual and no row for the current period. */
export function updateDue(cadence: UpdateCadence, rows: ReadonlyArray<Pick<ProjectUpdate, "weekOf">>, now = new Date()): boolean {
  if (cadence === "manual") return false;
  const current = periodOf(cadence, now);
  return !rows.some((r) => r.weekOf === current);
}

/** The Monday of the week that holds the date, as an ISO date (UTC). */
export function weekOf(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export const weeklyDraftSchema = z.object({
  body: z.string(),
  highlights: z.array(z.string()),
});

/** Cut a drafted update to the limits. */
export function cleanWeeklyDraft(value: WeeklyDraft): WeeklyDraft {
  return {
    body: value.body.trim().slice(0, UPDATE_LIMITS.body.max),
    highlights: value.highlights.map((h) => h.trim().slice(0, UPDATE_LIMITS.highlights.each)).filter(Boolean).slice(0, UPDATE_LIMITS.highlights.max),
  };
}
export type WeeklyDraft = z.infer<typeof weeklyDraftSchema>;

export const updateInputSchema = z.object({
  /** The period start (the week's Monday, the day, or the even day), defaults to the current period of the project's cadence. */
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  body: z.string().trim().min(1).max(UPDATE_LIMITS.body.max),
  highlights: z.array(z.string().trim().min(1).max(UPDATE_LIMITS.highlights.each)).max(UPDATE_LIMITS.highlights.max).optional(),
});

export interface ProjectUpdate {
  id: string;
  /** The period start the row covers; the column keeps its original name. */
  weekOf: string;
  /** The cadence the row was written under, for its label. */
  cadence: UpdateCadence;
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
