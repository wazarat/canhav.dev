import { z } from "zod";

import { type CanvasItem, type ItemLimits, isItemId, normalizeItems } from "@/lib/canvas-items";
import type { Icp } from "@/lib/icp";

/**
 * The Value Proposition Canvas (M157, F16): one per ideal customer
 * profile, the value map (products and services, pain relievers, gain
 * creators) beside the customer profile (jobs, pains, gains), each area a
 * short list of items with an id. A reliever or creator can name the
 * pains or gains it answers by id, so the fit check can say which pains
 * nothing relieves yet. Pure.
 */
export const VALUE_AREAS = ["products", "painRelievers", "gainCreators", "jobs", "pains", "gains"] as const;
export type ValueArea = (typeof VALUE_AREAS)[number];
export const VALUE_MAP_AREAS: readonly ValueArea[] = ["products", "painRelievers", "gainCreators"];
export const CUSTOMER_AREAS: readonly ValueArea[] = ["jobs", "pains", "gains"];
/** Which customer area a map area answers. */
export const ANSWERS: Partial<Record<ValueArea, ValueArea>> = { painRelievers: "pains", gainCreators: "gains" };

export interface ValueItem extends CanvasItem {
  /** Ids of the pains or gains this reliever or creator answers. */
  answers?: string[];
}

export type ValueCanvas = Record<ValueArea, ValueItem[]>;
/** One canvas per ideal customer profile, keyed by the profile's index. */
export type ProfileKey = "0" | "1";
export const PROFILE_KEYS: readonly ProfileKey[] = ["0", "1"];
export type ValueCanvases = Partial<Record<ProfileKey, ValueCanvas>>;

export const VALUE_CANVAS_LIMITS = { items: { max: 8 }, item: { min: 2, max: 140 } } as const;
export const VALUE_ITEM_LIMITS: ItemLimits = { max: VALUE_CANVAS_LIMITS.items.max, min: VALUE_CANVAS_LIMITS.item.min, maxChars: VALUE_CANVAS_LIMITS.item.max };

export function isValueArea(v: unknown): v is ValueArea {
  return typeof v === "string" && (VALUE_AREAS as readonly string[]).includes(v);
}

export function isProfileKey(v: unknown): v is ProfileKey {
  return v === "0" || v === "1";
}

export function emptyValueCanvas(): ValueCanvas {
  return { products: [], painRelievers: [], gainCreators: [], jobs: [], pains: [], gains: [] };
}

/** Items as stored: the canvas item rules plus `answers` kept as ids (dangling ones drop after the whole canvas is read). */
function normalizeArea(raw: unknown): ValueItem[] {
  return normalizeItems<ValueItem>(raw, VALUE_ITEM_LIMITS, (item, source) => {
    const answers = Array.isArray(source.answers) ? source.answers.filter(isItemId) : [];
    return answers.length ? { ...item, answers: [...new Set(answers)] } : item;
  });
}

/** One canvas as stored; null when every area is empty. */
export function normalizeValueCanvas(raw: unknown): ValueCanvas | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const c = emptyValueCanvas();
  for (const area of VALUE_AREAS) c[area] = normalizeArea(o[area]);
  // An answer must name an item in the area it answers.
  for (const [from, to] of Object.entries(ANSWERS) as Array<[ValueArea, ValueArea]>) {
    const ids = new Set(c[to].map((i) => i.id));
    c[from] = c[from].map((i) => {
      const answers = (i.answers ?? []).filter((id) => ids.has(id));
      const { answers: _a, ...rest } = i;
      return answers.length ? { ...rest, answers } : rest;
    });
  }
  return VALUE_AREAS.some((a) => c[a].length) ? c : null;
}

export function normalizeValueCanvases(raw: unknown): ValueCanvases | null {
  if (!raw || typeof raw !== "object") return null;
  const out: ValueCanvases = {};
  for (const key of PROFILE_KEYS) {
    const c = normalizeValueCanvas((raw as Record<string, unknown>)[key]);
    if (c) out[key] = c;
  }
  return Object.keys(out).length ? out : null;
}

/** The pains or gains nothing answers yet. */
export function unanswered(c: ValueCanvas, area: "pains" | "gains"): ValueItem[] {
  const from = area === "pains" ? "painRelievers" : "gainCreators";
  const answered = new Set(c[from].flatMap((i) => i.answers ?? []));
  return c[area].filter((i) => !answered.has(i.id));
}

/** The customer side seeded from the profile (M157): the objection as a pain, the buying trigger as a gain. Texts only, ids assigned by the caller's normalization. */
export function seedFromProfile(profile: Icp): Partial<Record<ValueArea, string[]>> {
  return {
    ...(profile.objection.trim() ? { pains: [profile.objection.trim()] } : {}),
    ...(profile.buyingTrigger.trim() ? { gains: [profile.buyingTrigger.trim()] } : {}),
  };
}

export function valueCanvasFilled(c: ValueCanvas | undefined): number {
  return c ? VALUE_AREAS.filter((a) => c[a].length).length : 0;
}

const itemText = z.string().min(VALUE_CANVAS_LIMITS.item.min).max(VALUE_CANVAS_LIMITS.item.max);
const itemPatch = z.union([
  itemText,
  z.strictObject({ id: z.string().regex(/^[a-z0-9]{4,12}$/).optional(), text: itemText, answers: z.array(z.string().regex(/^[a-z0-9]{4,12}$/)).max(VALUE_CANVAS_LIMITS.items.max).optional() }),
]);
const areaPatch = z.union([z.string().max(VALUE_CANVAS_LIMITS.items.max * VALUE_CANVAS_LIMITS.item.max), z.array(itemPatch).max(VALUE_CANVAS_LIMITS.items.max)]);
const canvasPatch = z.strictObject(Object.fromEntries(VALUE_AREAS.map((a) => [a, areaPatch.optional()])) as Record<ValueArea, z.ZodOptional<typeof areaPatch>>).nullable();
/** A patch: per profile key, any subset of areas, each replacing the stored area; null drops that profile's canvas. */
export const valueCanvasPatchSchema = z.strictObject({ "0": canvasPatch.optional(), "1": canvasPatch.optional() });
export type ValueCanvasPatch = z.infer<typeof valueCanvasPatchSchema>;

/** A full draft for one profile: every area as short lines. */
const draftArea = z.array(z.string());
export const valueCanvasDraftSchema = z.object(Object.fromEntries(VALUE_AREAS.map((a) => [a, draftArea])) as Record<ValueArea, typeof draftArea>);
export type ValueCanvasDraft = z.infer<typeof valueCanvasDraftSchema>;
