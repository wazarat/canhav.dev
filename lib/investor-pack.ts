import { z } from "zod";

import { GRANT_PROGRAMS, grantProgramId } from "@/content/grants";
import { cutAtWord } from "@/lib/text";

/**
 * The investor pack on the record (M126, Studio+). Since M159 the one pager
 * and the deck are built outside CanHav by the team's agent or any AI from
 * the pack prompt, and the record keeps only where each file lives
 * (`files`); the text parts and the grant answers written before M159 stay
 * readable until removed and are no longer written. Kept on the draft,
 * stripped at publish like references. Pure.
 */
export const PACK_LIMITS = {
  onepager: { max: 6000 },
  deck: { slides: { min: 5, max: 12 }, title: 80, bullets: { max: 6, each: 200 } },
  grants: { answer: 2500 },
  /** A repository path or an https URL (M159). */
  file: { max: 300 },
} as const;

export type PackFileKind = "onepager" | "deck";
export const PACK_FILE_KINDS: readonly PackFileKind[] = ["onepager", "deck"];

export interface DeckSlide {
  title: string;
  bullets: string[];
}

export interface InvestorPack {
  /** Written before M159, readable until removed. */
  onepager?: string;
  deck?: DeckSlide[];
  /** Per programme id, per question id. Written before M159, readable until removed. */
  grants?: Record<string, Record<string, string>>;
  /** Where the built one pager and deck live (M159): a path in the repository or an https URL. */
  files?: Partial<Record<PackFileKind, string>>;
  updatedAt?: string;
}

const FILE_RE = /^(https?:\/\/\S+|(?!\/)(?!.*(^|\/)\.\.(\/|$))[\w./@ -]+)$/;
export function isPackFile(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= PACK_LIMITS.file.max && FILE_RE.test(v.trim());
}

const slide = z.object({ title: z.string().min(1).max(PACK_LIMITS.deck.title), bullets: z.array(z.string().min(1).max(PACK_LIMITS.deck.bullets.each)).max(PACK_LIMITS.deck.bullets.max) });

// What the model answers, without caps; the kind's clean step cuts to the limits.
export const onepagerDraftSchema = z.object({ onepager: z.string() });
export const deckDraftSchema = z.object({ deck: z.array(z.object({ title: z.string(), bullets: z.array(z.string()) })) });
export const grantsDraftSchema = z.object({ answers: z.array(z.object({ question: z.string(), answer: z.string() })) });

export function cleanDeck(deck: DeckSlide[]): DeckSlide[] {
  return deck
    .map((s) => ({ title: cutAtWord(s.title.trim(), PACK_LIMITS.deck.title), bullets: s.bullets.map((b) => cutAtWord(b.trim(), PACK_LIMITS.deck.bullets.each)).filter(Boolean).slice(0, PACK_LIMITS.deck.bullets.max) }))
    .filter((s) => s.title)
    .slice(0, PACK_LIMITS.deck.slides.max);
}

const packFile = z.string().trim().min(1).max(PACK_LIMITS.file.max).regex(FILE_RE);
/**
 * What update_project accepts (M159): `files`, where the built one pager and
 * deck live, merged over the stored pack; null clears it all. The text
 * parts are still listed so a write of them is refused with a sentence
 * (projectPatchProblem) rather than an unknown key error.
 */
export const investorPackPatchSchema = z.strictObject({
  files: z.strictObject({ onepager: packFile.nullable().optional(), deck: packFile.nullable().optional() }).optional(),
  onepager: z.string().max(PACK_LIMITS.onepager.max).optional(),
  deck: z.array(slide).max(PACK_LIMITS.deck.slides.max).optional(),
  grants: z.record(z.string().max(40), z.record(z.string().max(40), z.string().max(PACK_LIMITS.grants.answer))).optional(),
});

/** The parts a patch still tries to write (M159), empty when it only records files. */
export function writtenPackParts(patch: InvestorPackPatch | null | undefined): string[] {
  if (!patch) return [];
  return (["onepager", "deck", "grants"] as const).filter((k) => patch[k] !== undefined);
}
export type InvestorPackPatch = z.infer<typeof investorPackPatchSchema>;

export function normalizeInvestorPack(raw: unknown): InvestorPack | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: InvestorPack = {};
  if (typeof o.onepager === "string" && o.onepager.trim()) out.onepager = cutAtWord(o.onepager.trim(), PACK_LIMITS.onepager.max);
  if (Array.isArray(o.deck)) {
    const deck = o.deck
      .filter((s): s is { title: unknown; bullets?: unknown } => Boolean(s) && typeof s === "object")
      .map((s) => ({
        title: typeof s.title === "string" ? cutAtWord(s.title.trim(), PACK_LIMITS.deck.title) : "",
        bullets: Array.isArray(s.bullets) ? s.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0).map((b) => cutAtWord(b.trim(), PACK_LIMITS.deck.bullets.each)).slice(0, PACK_LIMITS.deck.bullets.max) : [],
      }))
      .filter((s) => s.title)
      .slice(0, PACK_LIMITS.deck.slides.max);
    if (deck.length) out.deck = deck;
  }
  if (o.grants && typeof o.grants === "object") {
    const grants: Record<string, Record<string, string>> = {};
    // An old programme id folds into the one that replaced it (M143); the real id wins where both are stored.
    const stored: Record<string, Record<string, unknown>> = {};
    for (const [pid, answers] of Object.entries(o.grants as Record<string, unknown>)) {
      if (!answers || typeof answers !== "object") continue;
      const real = grantProgramId(pid);
      stored[real] = pid === real ? { ...(stored[real] ?? {}), ...(answers as Record<string, unknown>) } : { ...(answers as Record<string, unknown>), ...(stored[real] ?? {}) };
    }
    for (const p of GRANT_PROGRAMS) {
      const answers = stored[p.id];
      if (!answers) continue;
      const clean: Record<string, string> = {};
      for (const q of p.questions) {
        const a = answers[q.id];
        if (typeof a === "string" && a.trim()) clean[q.id] = cutAtWord(a.trim(), PACK_LIMITS.grants.answer);
      }
      if (Object.keys(clean).length) grants[p.id] = clean;
    }
    if (Object.keys(grants).length) out.grants = grants;
  }
  if (o.files && typeof o.files === "object") {
    const files: Partial<Record<PackFileKind, string>> = {};
    for (const k of PACK_FILE_KINDS) {
      const v = (o.files as Record<string, unknown>)[k];
      if (isPackFile(v)) files[k] = v.trim();
    }
    if (Object.keys(files).length) out.files = files;
  }
  if (typeof o.updatedAt === "string" && !Number.isNaN(Date.parse(o.updatedAt))) out.updatedAt = o.updatedAt;
  return out.onepager || out.deck || out.grants || out.files ? out : null;
}

/** Merge a patch over the stored pack, programme by programme for the grants. */
export function mergeInvestorPack(current: InvestorPack | undefined, patch: InvestorPackPatch): InvestorPack {
  const next: InvestorPack = { ...(current ?? {}), updatedAt: new Date().toISOString() };
  if (patch.onepager !== undefined) next.onepager = patch.onepager;
  if (patch.deck !== undefined) next.deck = patch.deck;
  if (patch.files) {
    const files = { ...(current?.files ?? {}) };
    for (const k of PACK_FILE_KINDS) {
      const v = patch.files[k];
      if (v === null) delete files[k];
      else if (v !== undefined) files[k] = v;
    }
    if (Object.keys(files).length) next.files = files;
    else delete next.files;
  }
  if (patch.grants) {
    const grants = { ...(current?.grants ?? {}) };
    for (const [pid, answers] of Object.entries(patch.grants)) {
      const real = grantProgramId(pid);
      grants[real] = { ...(grants[real] ?? {}), ...answers };
    }
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
  if (pack.files?.onepager) out.push("onepagerFile");
  if (pack.files?.deck) out.push("deckFile");
  return out;
}
