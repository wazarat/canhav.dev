import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { isCanvasBlock } from "@/lib/canvas";
import { type DraftKind, isDraftKind } from "@/lib/draft/limits";
import type { ProjectDoc } from "@/lib/ideation";

/**
 * The brief (M142): a few short questions the team answers before a
 * draft, so the model and the agent build on what the team knows instead
 * of assuming it. Answers live on the draft under `briefs`, per kind,
 * owner written only, never published. A question is skipped when the
 * record already answers it. Pure.
 */
export const BRIEF_LIMITS = { answer: { max: 300 }, questions: { max: 5 } } as const;

export interface BriefQuestion {
  id: string;
  /** True when the record already holds the answer, so the question is not asked. */
  answered?: (doc: BriefDoc, body: Record<string, unknown>) => boolean;
}

/** The slice of the record the questions read. */
export type BriefDoc = Pick<ProjectDoc, "payer" | "whoPays" | "canvas" | "icp" | "valueCanvas" | "brand" | "competitors" | "investorPack" | "briefs">;

export interface DraftBrief {
  answers: Record<string, string>;
  at: string;
}

export type Briefs = Partial<Record<DraftKind, DraftBrief>>;

const CANVAS_BLOCK_QUESTION: Record<string, string> = {
  revenueStreams: "revenue",
  channels: "channels",
  keyPartners: "partners",
  costStructure: "cost",
};

const PACK: BriefQuestion[] = [{ id: "ask" }, { id: "traction" }, { id: "team" }];

export const BRIEF_QUESTIONS: Record<DraftKind, BriefQuestion[]> = {
  icp: [
    { id: "whoPays", answered: (doc) => Boolean(doc.payer || doc.whoPays?.trim()) },
    { id: "whoUses" },
    { id: "whereToday" },
    { id: "switchTrigger" },
    { id: "objection" },
  ],
  canvas: [
    { id: "revenue", answered: (doc) => Boolean(doc.canvas?.revenueStreams?.length) },
    { id: "channels", answered: (doc) => Boolean(doc.canvas?.channels?.length) },
    { id: "partners", answered: (doc) => Boolean(doc.canvas?.keyPartners?.length) },
    { id: "cost", answered: (doc) => Boolean(doc.canvas?.costStructure?.length) },
  ],
  // One block asks the canvas question for that block, when it has one; the block's own text is being redrafted, so it never counts as answered.
  canvas_block: [
    { id: "revenue", answered: (_doc, body) => CANVAS_BLOCK_QUESTION[String(body.block)] !== "revenue" },
    { id: "channels", answered: (_doc, body) => CANVAS_BLOCK_QUESTION[String(body.block)] !== "channels" },
    { id: "partners", answered: (_doc, body) => CANVAS_BLOCK_QUESTION[String(body.block)] !== "partners" },
    { id: "cost", answered: (_doc, body) => CANVAS_BLOCK_QUESTION[String(body.block)] !== "cost" },
  ],
  // The value canvas is per profile (M157); the profile's objection and trigger already answer the pain and the gain.
  value_canvas: [
    { id: "jobs" },
    { id: "biggestPain", answered: (doc, body) => Boolean(doc.icp?.[Number(body.profile ?? 0)]?.objection?.trim()) },
    { id: "gainWanted", answered: (doc, body) => Boolean(doc.icp?.[Number(body.profile ?? 0)]?.buyingTrigger?.trim()) },
  ],
  competitors: [{ id: "comparedWith" }, { id: "differenceKind" }],
  brand: [{ id: "toneWords", answered: (doc) => Boolean(doc.brand?.tone?.length) }, { id: "avoidLook" }, { id: "feel" }],
  onepager: PACK,
  deck: PACK,
  grants: [...PACK, { id: "budget" }],
  weekly: [{ id: "landed" }, { id: "next" }, { id: "blocked" }],
};

/** The questions still open for a kind on this record, at most BRIEF_LIMITS.questions.max. */
export function openQuestions(kind: DraftKind, doc: BriefDoc, body: Record<string, unknown> = {}): BriefQuestion[] {
  if (kind === "canvas_block" && !isCanvasBlock(body.block)) return [];
  return BRIEF_QUESTIONS[kind].filter((q) => !q.answered?.(doc, body)).slice(0, BRIEF_LIMITS.questions.max);
}

export function briefQuestionLabel(id: string): string {
  const Q = STUDIO_PLUS_COPY.brief.questions as Record<string, { label: string; hint: string }>;
  return Q[id]?.label ?? id;
}

/** Answers as stored: known question ids for the kind, trimmed and capped, empty ones dropped; null when nothing survives. */
export function normalizeBriefAnswers(kind: DraftKind, raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const known = new Set(BRIEF_QUESTIONS[kind].map((q) => q.id));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!known.has(k) || typeof v !== "string") continue;
    const t = v.trim().slice(0, BRIEF_LIMITS.answer.max);
    if (t) out[k] = t;
  }
  return Object.keys(out).length ? out : null;
}

export function normalizeBriefs(raw: unknown): Briefs | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Briefs = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isDraftKind(k) || !v || typeof v !== "object") continue;
    const b = v as { answers?: unknown; at?: unknown };
    const answers = normalizeBriefAnswers(k, b.answers);
    if (!answers) continue;
    out[k] = { answers, at: typeof b.at === "string" && !Number.isNaN(Date.parse(b.at)) ? b.at : new Date().toISOString() };
  }
  return Object.keys(out).length ? out : null;
}

/** The brief as one block of lines for the model or the agent, empty when there is none. */
export function briefLines(kind: DraftKind, brief: DraftBrief | Record<string, string> | undefined | null): string {
  const answers = brief && "answers" in brief && typeof brief.answers === "object" ? (brief as DraftBrief).answers : (brief as Record<string, string> | undefined | null);
  if (!answers) return "";
  const lines = BRIEF_QUESTIONS[kind].filter((q) => answers[q.id]).map((q) => `${briefQuestionLabel(q.id)} ${answers[q.id]}`); // copy-ok, model context
  if (!lines.length) return "";
  const note = kind === "competitors" || kind === "canvas" || kind === "canvas_block" ? "\nFor how comparable protocols in the same subsector are built and positioned, call get_comparables." : ""; // copy-ok, model context
  return `## The team's brief\nUse these answers over any assumption; mark what is still assumed.\n${lines.join("\n")}${note}`; // copy-ok, model context
}

/** The brief as one line, for a list entry. */
export function briefSummary(kind: DraftKind, brief: DraftBrief | undefined): string {
  if (!brief) return "";
  return BRIEF_QUESTIONS[kind]
    .filter((q) => brief.answers[q.id])
    .map((q) => `${briefQuestionLabel(q.id)} ${brief.answers[q.id]}`)
    .join("; ");
}
