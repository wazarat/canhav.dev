import { z } from "zod";

import type { Milestone } from "@/lib/build-milestones";
import { cutAtWord } from "@/lib/text";

/**
 * Team updates (M124, Studio+, named apart from the milestone update in
 * M140). Pure: the limits, the period key and the shapes the routes, the
 * draft kind and the MCP tool share. A team update is written by the team
 * or its agent and published to the public page; it is not the wallet
 * signed milestone update anchored on chain. The tool and kind names keep
 * the word weekly.
 */
export const UPDATE_LIMITS = {
  body: { min: 40, max: 4000 },
  highlights: { max: 5, each: 160 },
  /** The main focuses for the next period (M183). */
  focuses: { max: 5, each: 160 },
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

/** The build milestones a highlight can sit under (M174), the same four as the Build tab. */
export const HIGHLIGHT_MILESTONES = ["design", "testnet", "review", "launch"] as const satisfies readonly Milestone[];

/**
 * One highlight (M174): a fact, the milestone it moved and, when known,
 * the module and the build step (a group key from the kit), all optional
 * like a focus's (M189). Rows from before M174 carry text only and read
 * with no milestone.
 */
export interface UpdateHighlight {
  text: string;
  milestone: Milestone | null;
  shape?: string;
  step?: string;
}

export const highlightSchema = z.object({
  text: z.string().trim().min(1).max(UPDATE_LIMITS.highlights.each),
  milestone: z.enum(HIGHLIGHT_MILESTONES).nullable().optional(),
  shape: z.string().trim().min(1).max(80).optional(),
  step: z.string().trim().min(1).max(120).optional(),
});

/** A highlight as text or as an item, read into an item. */
export function toHighlight(h: string | z.infer<typeof highlightSchema>): UpdateHighlight {
  if (typeof h === "string") return { text: h, milestone: null };
  return { text: h.text, milestone: h.milestone ?? null, ...(h.shape ? { shape: h.shape } : {}), ...(h.step ? { step: h.step } : {}) };
}

/**
 * One focus for the next period (M183): the milestone it works toward, the
 * module and the build step inside it when the team picks them, and a line.
 * A focus names a step or says something, so text may be empty only when a
 * step is picked.
 */
export interface UpdateFocus {
  milestone: Milestone;
  shape?: string;
  step?: string;
  text: string;
}

export const focusSchema = z
  .object({
    milestone: z.enum(HIGHLIGHT_MILESTONES),
    shape: z.string().trim().min(1).max(80).optional(),
    step: z.string().trim().min(1).max(120).optional(),
    text: z.string().trim().max(UPDATE_LIMITS.focuses.each).default(""),
  })
  .refine((f) => f.text || f.step, { message: "A focus names a build step or says what it is." });

export function toFocus(f: z.infer<typeof focusSchema>): UpdateFocus {
  return { milestone: f.milestone, ...(f.shape ? { shape: f.shape } : {}), ...(f.step ? { step: f.step } : {}), text: f.text };
}

export const weeklyDraftSchema = z.object({
  body: z.string(),
  highlights: z.array(z.object({ text: z.string(), milestone: z.enum(HIGHLIGHT_MILESTONES).nullable() })),
});

/** Cut a drafted update to the limits. */
export function cleanWeeklyDraft(value: WeeklyDraft): WeeklyDraft {
  return {
    body: cutAtWord(value.body.trim(), UPDATE_LIMITS.body.max),
    highlights: value.highlights
      .map((h) => ({ text: cutAtWord(h.text.trim(), UPDATE_LIMITS.highlights.each), milestone: h.milestone ?? null }))
      .filter((h) => h.text)
      .slice(0, UPDATE_LIMITS.highlights.max),
  };
}
export type WeeklyDraft = z.infer<typeof weeklyDraftSchema>;

export const updateInputSchema = z.object({
  /** The period start (the week's Monday, the day, or the even day), defaults to the current period of the project's cadence. */
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  body: z.string().trim().min(1).max(UPDATE_LIMITS.body.max),
  /** Each highlight as text, or with the milestone and build step it moved (M174). */
  highlights: z
    .array(z.union([z.string().trim().min(1).max(UPDATE_LIMITS.highlights.each), highlightSchema]))
    .max(UPDATE_LIMITS.highlights.max)
    .optional(),
  /** The main focuses for the next period, each under a milestone (M183). */
  focuses: z.array(focusSchema).max(UPDATE_LIMITS.focuses.max).optional(),
});

/**
 * Lines added to a period's update one at a time (M189): a paragraph
 * appended to the body, highlights and focuses appended to theirs. The MCP
 * tool add_weekly_update_lines takes it.
 */
export const updateLinesSchema = z.object({
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paragraph: z.string().trim().min(1).max(UPDATE_LIMITS.body.max).optional(),
  highlights: z
    .array(z.union([z.string().trim().min(1).max(UPDATE_LIMITS.highlights.each), highlightSchema]))
    .max(UPDATE_LIMITS.highlights.max)
    .optional(),
  focuses: z.array(focusSchema).max(UPDATE_LIMITS.focuses.max).optional(),
});

/** The row after the lines are added, or why they do not fit. */
export function appendUpdateLines(
  current: Pick<ProjectUpdate, "body" | "highlightItems" | "focusItems"> | null,
  lines: { paragraph?: string; highlights?: UpdateHighlight[]; focuses?: UpdateFocus[] },
): { ok: true; body: string; highlights: UpdateHighlight[]; focuses: UpdateFocus[] } | { ok: false; message: string } {
  const body = [current?.body.trim(), lines.paragraph?.trim()].filter(Boolean).join("\n\n");
  const highlights = [...(current?.highlightItems ?? []), ...(lines.highlights ?? [])];
  const focuses = [...(current?.focusItems ?? []), ...(lines.focuses ?? [])];
  const room = (have: number, max: number) => Math.max(0, max - have);
  if (body.length > UPDATE_LIMITS.body.max) {
    return { ok: false, message: `The body would be ${body.length} characters, over the ${UPDATE_LIMITS.body.max} limit. Shorten the paragraph or rewrite the update with set_weekly_update.` };
  }
  if (highlights.length > UPDATE_LIMITS.highlights.max) {
    return { ok: false, message: `The update has room for ${room(current?.highlightItems.length ?? 0, UPDATE_LIMITS.highlights.max)} more highlight(s), at most ${UPDATE_LIMITS.highlights.max} in all. Rewrite the list with set_weekly_update to replace one.` };
  }
  if (focuses.length > UPDATE_LIMITS.focuses.max) {
    return { ok: false, message: `The update has room for ${room(current?.focusItems.length ?? 0, UPDATE_LIMITS.focuses.max)} more focus(es), at most ${UPDATE_LIMITS.focuses.max} in all. Rewrite the list with set_weekly_update to replace one.` };
  }
  return { ok: true, body, highlights, focuses };
}

/** The three questions a team update answers (M142), filled by Auto-summarize from the period's activity (M174). */
export const weeklyBriefSchema = z.object({ landed: z.string(), next: z.string(), blocked: z.string() });
export type WeeklyBrief = z.infer<typeof weeklyBriefSchema>;

export interface ProjectUpdate {
  id: string;
  /** The period start the row covers; the column keeps its original name. */
  weekOf: string;
  /** The cadence the row was written under, for its label. */
  cadence: UpdateCadence;
  body: string;
  /** The highlight texts, kept for readers from before M174. */
  highlights: string[];
  /** The highlights with their milestone and step (M174). */
  highlightItems: UpdateHighlight[];
  /** The main focuses for the next period (M183), empty on older rows. */
  focusItems: UpdateFocus[];
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
