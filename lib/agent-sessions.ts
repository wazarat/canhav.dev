import { z } from "zod";

import type { Milestone } from "@/lib/build-milestones";

/**
 * Agent sessions (M86), after Linear's agent sessions. An agent connected to
 * a project's MCP server reports what it is doing: a state, a title, a
 * message, a plan of steps replaced whole on every report, and a link to
 * where the work is. The studio shows the live session at the top of Agent
 * changes, the toast fires when the agent waits on the owner or finishes,
 * and the studio row says Agent working or Waiting on you. A session that
 * stops reporting goes stale after thirty minutes, Linear's rule; the next
 * report revives it. This module is pure, shared by the server and the
 * studio.
 */

export const SESSION_STATES = ["working", "awaiting_input", "done", "error"] as const;
export type SessionState = (typeof SESSION_STATES)[number];
/** What the studio shows: the stored state, or stale for a working session that stopped reporting. */
export type SessionView = SessionState | "stale";

export const PLAN_STATUSES = ["pending", "in_progress", "done", "canceled"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/** The build milestone a plan step advances (M174), the four of the Build tab. */
export const PLAN_MILESTONES = ["design", "testnet", "review", "launch"] as const satisfies readonly Milestone[];

export interface PlanItem {
  content: string;
  status: PlanStatus;
  /** The build milestone the step advances (M174); older reports carry none. */
  milestone?: Milestone;
}

export const SESSION_LIMITS = {
  title: { max: 120 },
  message: { max: 600 },
  plan: { max: 30, contentMax: 160 },
  externalUrl: { max: 300 },
  /** A working session older than this is stale. */
  staleMs: 30 * 60 * 1000,
} as const;

export const planItemSchema = z.strictObject({
  content: z.string().min(1).max(SESSION_LIMITS.plan.contentMax),
  status: z.enum(PLAN_STATUSES),
  milestone: z.enum(PLAN_MILESTONES).optional(),
});

export const reportSessionSchema = z.strictObject({
  state: z.enum(SESSION_STATES),
  title: z.string().max(SESSION_LIMITS.title.max).optional(),
  message: z.string().max(SESSION_LIMITS.message.max).optional(),
  plan: z.array(planItemSchema).max(SESSION_LIMITS.plan.max).optional(),
  externalUrl: z.string().regex(/^https:\/\/\S+$/).max(SESSION_LIMITS.externalUrl.max).optional(),
  new: z.boolean().optional(),
});

export type ReportSessionInput = z.infer<typeof reportSessionSchema>;

/** One session as the studio and the MCP read it. */
export interface AgentSession {
  id: string;
  state: SessionState;
  title: string | null;
  message: string | null;
  plan: PlanItem[];
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The state to show, with the stale rule applied. */
export function sessionView(s: Pick<AgentSession, "state" | "updatedAt">, now = Date.now()): SessionView {
  if (s.state === "working" && now - new Date(s.updatedAt).getTime() > SESSION_LIMITS.staleMs) return "stale";
  return s.state;
}

/** True while the owner would still call it live: working (fresh or stale) or waiting on them. */
export function sessionOpen(s: Pick<AgentSession, "state">): boolean {
  return s.state === "working" || s.state === "awaiting_input";
}

export function planProgress(plan: readonly PlanItem[]): { done: number; total: number } {
  const counted = plan.filter((p) => p.status !== "canceled");
  return { done: counted.filter((p) => p.status === "done").length, total: counted.length };
}

/** The milestone the run is on (M174): the step in progress, else the next pending step, when tagged. */
export function currentMilestone(plan: readonly PlanItem[]): Milestone | null {
  const step = plan.find((p) => p.status === "in_progress") ?? plan.find((p) => p.status === "pending");
  return step?.milestone ?? null;
}

/** Plan items from a stored jsonb value, anything unreadable dropped. */
export function normalizePlan(raw: unknown): PlanItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PlanItem[] = [];
  for (const v of raw) {
    const p = planItemSchema.safeParse(v);
    if (p.success && out.length < SESSION_LIMITS.plan.max) out.push(p.data);
  }
  return out;
}

/**
 * What a poll of the session brought that is worth a notice (M86). A move
 * into awaiting_input, done or error since the last poll; the first load
 * reports a session already waiting.
 */
export type SessionEvent = "waiting" | "finished" | "failed";

export function sessionEvent(prev: AgentSession | null | undefined, next: AgentSession | null): SessionEvent | null {
  if (!next) return null;
  const changed = !prev || prev.id !== next.id || prev.state !== next.state;
  if (!changed) return null;
  if (next.state === "awaiting_input") return "waiting";
  if (prev === undefined) return null;
  if (next.state === "done") return "finished";
  if (next.state === "error") return "failed";
  return null;
}
