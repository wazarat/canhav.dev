import { z } from "zod";

import { VIABILITY_COPY } from "@/content/viability";
import type { Canvas } from "@/lib/canvas";
import { CANVAS_BLOCKS } from "@/lib/canvas";
import { isItemId, newItemId } from "@/lib/canvas-items";
import { cutAtWord } from "@/lib/text";
import { PROFILE_KEYS, VALUE_AREAS, type ValueCanvases } from "@/lib/value-canvas";

/**
 * Experiments (M170, V6): the cheapest test that proves or kills an
 * assumption. Each names the assumption it tests (a canvas or value
 * canvas item by id, or free text), the hypothesis, the test, the metric,
 * the pass bar, the kill criterion, a deadline, a status and its
 * evidence. An item's verdict (validated, invalidated) is derived from the
 * passed and failed experiments that point at it, never stored on the
 * item, so only a person's verdict on the experiment changes it. Pure.
 */
export const EXPERIMENT_STATUSES = ["planned", "running", "passed", "failed", "stopped"] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];
export const FINISHED_STATUSES: readonly ExperimentStatus[] = ["passed", "failed", "stopped"];
/** The verdicts only a person sets. */
export const VERDICT_STATUSES: readonly ExperimentStatus[] = ["passed", "failed"];

export type AssumptionKind = "canvas" | "value" | "text";

export interface ExperimentAssumption {
  kind: AssumptionKind;
  /** The canvas or value canvas item id for canvas and value. */
  ref?: string;
  text: string;
}

export interface ExperimentEvidence {
  text: string;
  url?: string;
  /** ISO time. */
  at: string;
  by: "team" | "agent";
}

export interface Experiment {
  id: string;
  assumption: ExperimentAssumption;
  hypothesis: string;
  test: string;
  metric: string;
  passBar: string;
  killCriterion: string;
  /** YYYY-MM-DD. */
  deadline: string;
  status: ExperimentStatus;
  evidence: ExperimentEvidence[];
  /** A tester kit invite token (M125). */
  testerInviteId?: string;
  /** One paragraph written when it ends. */
  result?: string;
  /** ISO time it was created. */
  createdAt: string;
}

export const EXPERIMENT_LIMITS = { max: 20, text: 300, result: 1000, evidence: { max: 30, text: 300, url: 300 } } as const;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https:\/\/\S+$/;

export function isExperimentStatus(v: unknown): v is ExperimentStatus {
  return typeof v === "string" && (EXPERIMENT_STATUSES as readonly string[]).includes(v);
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? cutAtWord(v.trim(), max) : "");

function normalizeEvidence(raw: unknown): ExperimentEvidence[] {
  if (!Array.isArray(raw)) return [];
  const out: ExperimentEvidence[] = [];
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const text = str(o.text, EXPERIMENT_LIMITS.evidence.text);
    if (!text) continue;
    const url = typeof o.url === "string" && URL_RE.test(o.url.trim()) ? o.url.trim().slice(0, EXPERIMENT_LIMITS.evidence.url) : undefined;
    const at = typeof o.at === "string" && !Number.isNaN(Date.parse(o.at)) ? o.at : new Date().toISOString();
    out.push({ text, ...(url ? { url } : {}), at, by: o.by === "agent" ? "agent" : "team" });
    if (out.length >= EXPERIMENT_LIMITS.evidence.max) break;
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/** The item ids a doc holds, to keep an assumption's ref honest. */
export function itemIdsOf(doc: { canvas?: Canvas; valueCanvas?: ValueCanvases }): { canvas: Map<string, string>; value: Map<string, string> } {
  const canvas = new Map<string, string>();
  for (const b of CANVAS_BLOCKS) for (const i of doc.canvas?.[b] ?? []) canvas.set(i.id, i.text);
  const value = new Map<string, string>();
  for (const k of PROFILE_KEYS) {
    const c = doc.valueCanvas?.[k];
    if (!c) continue;
    for (const a of VALUE_AREAS) for (const i of c[a]) value.set(i.id, i.text);
  }
  return { canvas, value };
}

/**
 * Experiments as stored: ids kept or made, texts trimmed and cut, a
 * missing or unknown status reads planned, a ref that names no item of
 * the doc becomes a text assumption (the text stays), evidence cleaned,
 * capped. Idempotent.
 */
export function normalizeExperiments(raw: unknown, doc: { canvas?: Canvas; valueCanvas?: ValueCanvases } = {}): Experiment[] {
  if (!Array.isArray(raw)) return [];
  const ids = itemIdsOf(doc);
  const out: Experiment[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const a = (o.assumption && typeof o.assumption === "object" ? o.assumption : {}) as Record<string, unknown>;
    let kind: AssumptionKind = a.kind === "canvas" || a.kind === "value" ? a.kind : "text";
    const ref = typeof a.ref === "string" && isItemId(a.ref) ? a.ref : undefined;
    let text = str(a.text, EXPERIMENT_LIMITS.text);
    if (kind !== "text") {
      const known = kind === "canvas" ? ids.canvas.get(ref ?? "") : ids.value.get(ref ?? "");
      if (known === undefined) kind = "text";
      else if (!text) text = known;
    }
    const hypothesis = str(o.hypothesis, EXPERIMENT_LIMITS.text);
    if (!hypothesis && !text) continue;
    let id = isItemId(o.id) && !seen.has(o.id) ? o.id : newItemId();
    while (seen.has(id)) id = newItemId();
    seen.add(id);
    const deadline = typeof o.deadline === "string" && DAY.test(o.deadline) && !Number.isNaN(Date.parse(o.deadline)) ? o.deadline : "";
    const result = str(o.result, EXPERIMENT_LIMITS.result);
    const invite = typeof o.testerInviteId === "string" && /^[A-Za-z0-9_-]{6,80}$/.test(o.testerInviteId) ? o.testerInviteId : undefined;
    out.push({
      id,
      assumption: { kind, ...(kind !== "text" && ref ? { ref } : {}), text },
      hypothesis,
      test: str(o.test, EXPERIMENT_LIMITS.text),
      metric: str(o.metric, EXPERIMENT_LIMITS.text),
      passBar: str(o.passBar, EXPERIMENT_LIMITS.text),
      killCriterion: str(o.killCriterion, EXPERIMENT_LIMITS.text),
      deadline,
      status: isExperimentStatus(o.status) ? o.status : "planned",
      evidence: normalizeEvidence(o.evidence),
      ...(invite ? { testerInviteId: invite } : {}),
      ...(result ? { result } : {}),
      createdAt: typeof o.createdAt === "string" && !Number.isNaN(Date.parse(o.createdAt)) ? o.createdAt : new Date().toISOString(),
    });
    if (out.length >= EXPERIMENT_LIMITS.max) break;
  }
  return out;
}

const text = (max: number) => z.string().max(max);

/** What update_project accepts: a list of experiments, each appended (no id) or updated by id; fields left out keep their stored value; evidence sent is appended. */
export const experimentPatchSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]{4,12}$/).optional(),
  assumption: z.strictObject({ kind: z.enum(["canvas", "value", "text"]), ref: z.string().regex(/^[a-z0-9]{4,12}$/).optional(), text: text(EXPERIMENT_LIMITS.text).optional() }).optional(),
  hypothesis: text(EXPERIMENT_LIMITS.text).optional(),
  test: text(EXPERIMENT_LIMITS.text).optional(),
  metric: text(EXPERIMENT_LIMITS.text).optional(),
  passBar: text(EXPERIMENT_LIMITS.text).optional(),
  killCriterion: text(EXPERIMENT_LIMITS.text).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(EXPERIMENT_STATUSES).optional(),
  evidence: z.array(z.strictObject({ text: z.string().min(1).max(EXPERIMENT_LIMITS.evidence.text), url: z.string().regex(/^https:\/\/\S+$/).max(EXPERIMENT_LIMITS.evidence.url).optional() })).max(EXPERIMENT_LIMITS.evidence.max).optional(),
  result: text(EXPERIMENT_LIMITS.result).optional(),
});
export const experimentsPatchSchema = z.array(experimentPatchSchema).min(1).max(EXPERIMENT_LIMITS.max);
export type ExperimentPatch = z.infer<typeof experimentPatchSchema>;

/** The stored list with a patch merged in: by id updates, the rest append; evidence is appended with the author and now. */
export function mergeExperiments(stored: readonly Experiment[], patch: readonly ExperimentPatch[], by: "team" | "agent", doc: { canvas?: Canvas; valueCanvas?: ValueCanvases }, now = new Date().toISOString()): Experiment[] {
  const list = stored.map((e) => ({ ...e }));
  for (const p of patch) {
    const cur = p.id ? list.find((e) => e.id === p.id) : undefined;
    const evidence = [...(cur?.evidence ?? []), ...(p.evidence ?? []).map((e) => ({ text: e.text, ...(e.url ? { url: e.url } : {}), at: now, by }))];
    const next = {
      ...(cur ?? { id: p.id, createdAt: now, status: "planned", evidence: [] }),
      ...(p.assumption ? { assumption: { ...p.assumption, text: p.assumption.text ?? cur?.assumption.text ?? "" } } : {}),
      ...(p.hypothesis !== undefined ? { hypothesis: p.hypothesis } : {}),
      ...(p.test !== undefined ? { test: p.test } : {}),
      ...(p.metric !== undefined ? { metric: p.metric } : {}),
      ...(p.passBar !== undefined ? { passBar: p.passBar } : {}),
      ...(p.killCriterion !== undefined ? { killCriterion: p.killCriterion } : {}),
      ...(p.deadline !== undefined ? { deadline: p.deadline } : {}),
      ...(p.status !== undefined ? { status: p.status } : {}),
      ...(p.result !== undefined ? { result: p.result } : {}),
      evidence,
    };
    if (cur) Object.assign(cur, next);
    else list.push(next as Experiment);
  }
  return normalizeExperiments(list, doc);
}

/** Running, then planned, then finished, each by deadline then creation. */
export function orderExperiments(list: readonly Experiment[]): Experiment[] {
  const rank: Record<ExperimentStatus, number> = { running: 0, planned: 1, passed: 2, failed: 2, stopped: 2 };
  return [...list].sort((a, b) => rank[a.status] - rank[b.status] || (a.deadline || "9999").localeCompare(b.deadline || "9999") || a.createdAt.localeCompare(b.createdAt));
}

/** Days from today to the deadline, negative when past. Null without a deadline. */
export function daysLeft(deadline: string, now = new Date()): number | null {
  if (!deadline) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((Date.parse(`${deadline}T00:00:00Z`) - today) / 86_400_000);
}

export function isOverdue(e: Pick<Experiment, "status" | "deadline">, now = new Date()): boolean {
  const d = daysLeft(e.deadline, now);
  return e.status === "running" && d !== null && d < 0;
}

/** "Due Nov 7, in 14 days", "Due Nov 7, today", "Overdue by 3 days", "No deadline". */
export function dueLine(deadline: string, now = new Date()): string {
  const E = VIABILITY_COPY.experiments;
  const d = daysLeft(deadline, now);
  if (d === null) return E.noDeadline;
  const label = new Date(`${deadline}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (d < 0) return E.overdue(label, -d);
  if (d === 0) return E.dueToday(label);
  return E.due(label, d);
}

export type Verdict = "validated" | "invalidated";

/** The verdict each canvas or value canvas item carries from the passed and failed experiments that point at it; the newest finished one wins. */
export function itemVerdicts(list: readonly Experiment[] | undefined): Map<string, { verdict: Verdict; experimentId: string }> {
  const out = new Map<string, { verdict: Verdict; experimentId: string; at: string }>();
  for (const e of list ?? []) {
    if (e.assumption.kind === "text" || !e.assumption.ref) continue;
    if (e.status !== "passed" && e.status !== "failed") continue;
    const at = e.evidence[e.evidence.length - 1]?.at ?? e.createdAt;
    const cur = out.get(e.assumption.ref);
    if (cur && cur.at > at) continue;
    out.set(e.assumption.ref, { verdict: e.status === "passed" ? "validated" : "invalidated", experimentId: e.id, at });
  }
  return new Map([...out.entries()].map(([k, v]) => [k, { verdict: v.verdict, experimentId: v.experimentId }]));
}

/** The finished experiments with their result, the ones the public page shows. */
export function publishedExperiments(list: readonly Experiment[] | undefined): Experiment[] {
  return (list ?? []).filter((e) => FINISHED_STATUSES.includes(e.status));
}

/** The lines the exports and the pack prompt carry, running first. */
export function experimentLines(list: readonly Experiment[] | undefined, now = new Date()): string[] {
  const E = VIABILITY_COPY.experiments;
  return orderExperiments(list ?? []).map((e) => {
    const parts = [`${E.statuses[e.status]}. ${e.hypothesis || e.assumption.text}`, e.test ? `Test, ${e.test}` : "", e.passBar ? `Pass when ${e.passBar}` : "", e.killCriterion ? `kill when ${e.killCriterion}` : "", e.deadline ? dueLine(e.deadline, now) : "", e.result ? `Result, ${e.result}` : "", e.evidence.length ? `${e.evidence.length} ${e.evidence.length === 1 ? "piece" : "pieces"} of evidence` : ""].filter(Boolean);
    return `- ${parts.join(". ")}.`;
  });
}
