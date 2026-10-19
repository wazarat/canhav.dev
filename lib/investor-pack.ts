import { z } from "zod";

import { GRANT_PROGRAMS } from "@/content/grants";

/**
 * The investor and grant pack on the record (M126, Studio+): a one pager,
 * a short deck and draft grant answers, all markdown-ready text. Kept on
 * the draft, stripped at publish like references. Pure.
 */
export const PACK_LIMITS = {
  onepager: { max: 6000 },
  deck: { slides: { min: 5, max: 12 }, title: 80, bullets: { max: 6, each: 200 } },
  grants: { answer: 2500 },
} as const;

export interface DeckSlide {
  title: string;
  bullets: string[];
}

export interface InvestorPack {
  onepager?: string;
  deck?: DeckSlide[];
  /** Per programme id, per question id. */
  grants?: Record<string, Record<string, string>>;
  updatedAt?: string;
}

const slide = z.object({ title: z.string().min(1).max(PACK_LIMITS.deck.title), bullets: z.array(z.string().min(1).max(PACK_LIMITS.deck.bullets.each)).max(PACK_LIMITS.deck.bullets.max) });

export const onepagerDraftSchema = z.object({ onepager: z.string().min(200).max(PACK_LIMITS.onepager.max) });
export const deckDraftSchema = z.object({ deck: z.array(slide).min(PACK_LIMITS.deck.slides.min).max(PACK_LIMITS.deck.slides.max) });
export const grantsDraftSchema = z.object({ answers: z.array(z.object({ question: z.string(), answer: z.string().min(1).max(PACK_LIMITS.grants.answer) })) });

/** What update_project accepts: any part merges over the stored pack; null clears it all. */
export const investorPackPatchSchema = z.strictObject({
  onepager: z.string().max(PACK_LIMITS.onepager.max).optional(),
  deck: z.array(slide).max(PACK_LIMITS.deck.slides.max).optional(),
  grants: z.record(z.string().max(40), z.record(z.string().max(40), z.string().max(PACK_LIMITS.grants.answer))).optional(),
});
export type InvestorPackPatch = z.infer<typeof investorPackPatchSchema>;

export function normalizeInvestorPack(raw: unknown): InvestorPack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: InvestorPack = {};
  if (typeof o.onepager === "string" && o.onepager.trim()) out.onepager = o.onepager.trim().slice(0, PACK_LIMITS.onepager.max);
  if (Array.isArray(o.deck)) {
    const deck = o.deck
      .filter((s): s is { title: unknown; bullets?: unknown } => Boolean(s) && typeof s === "object")
      .map((s) => ({
        title: typeof s.title === "string" ? s.title.trim().slice(0, PACK_LIMITS.deck.title) : "",
        bullets: Array.isArray(s.bullets) ? s.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0).map((b) => b.trim().slice(0, PACK_LIMITS.deck.bullets.each)).slice(0, PACK_LIMITS.deck.bullets.max) : [],
      }))
      .filter((s) => s.title)
      .slice(0, PACK_LIMITS.deck.slides.max);
    if (deck.length) out.deck = deck;
  }
  if (o.grants && typeof o.grants === "object") {
    const grants: Record<string, Record<string, string>> = {};
    for (const p of GRANT_PROGRAMS) {
      const answers = (o.grants as Record<string, unknown>)[p.id];
      if (!answers || typeof answers !== "object") continue;
      const clean: Record<string, string> = {};
      for (const q of p.questions) {
        const a = (answers as Record<string, unknown>)[q.id];
        if (typeof a === "string" && a.trim()) clean[q.id] = a.trim().slice(0, PACK_LIMITS.grants.answer);
      }
      if (Object.keys(clean).length) grants[p.id] = clean;
    }
    if (Object.keys(grants).length) out.grants = grants;
  }
  if (typeof o.updatedAt === "string" && !Number.isNaN(Date.parse(o.updatedAt))) out.updatedAt = o.updatedAt;
  return out.onepager || out.deck || out.grants ? out : null;
}

/** Merge a patch over the stored pack, programme by programme for the grants. */
export function mergeInvestorPack(current: InvestorPack | undefined, patch: InvestorPackPatch): InvestorPack {
  const next: InvestorPack = { ...(current ?? {}), updatedAt: new Date().toISOString() };
  if (patch.onepager !== undefined) next.onepager = patch.onepager;
  if (patch.deck !== undefined) next.deck = patch.deck;
  if (patch.grants) {
    const grants = { ...(current?.grants ?? {}) };
    for (const [pid, answers] of Object.entries(patch.grants)) grants[pid] = { ...(grants[pid] ?? {}), ...answers };
    next.grants = grants;
  }
  return next;
}

/** The parts present, for the facts line. */
export function packParts(pack: InvestorPack | undefined): string[] {
  if (!pack) return [];
  const out: string[] = [];
  if (pack.onepager) out.push("onepager");
  if (pack.deck?.length) out.push("deck");
  if (pack.grants && Object.keys(pack.grants).length) out.push("grants");
  return out;
}
