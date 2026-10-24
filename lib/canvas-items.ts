import { cutAtWord } from "@/lib/text";

/**
 * Short items with an id (M155), the unit of the Business Model Canvas
 * and the Value Proposition Canvas (M157). The id lets later work link to
 * one item (an experiment, a fit link) without a migration; it is six
 * url safe characters, assigned when an item is first normalized and kept
 * from then on. Pure, client and server.
 */
export interface CanvasItem {
  id: string;
  text: string;
}

export interface ItemLimits {
  /** Items per list. */
  max: number;
  /** Characters per item. */
  min: number;
  maxChars: number;
}

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_RE = /^[a-z0-9]{4,12}$/;

export function newItemId(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}

export function isItemId(v: unknown): v is string {
  return typeof v === "string" && ID_RE.test(v);
}

/** A paragraph as items, one sentence each. Mechanical and safe for canvas text; never used on facts. */
export function itemsFromText(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Items as stored: a string is split into sentences, plain lines become
 * items, items keep a valid id that no earlier item in the list uses and
 * get a new one otherwise. Every text is trimmed and cut at a word; one
 * shorter than the minimum drops; the list is capped. Idempotent on its
 * own output.
 */
export function normalizeItems(raw: unknown, limits: ItemLimits): CanvasItem[] {
  const source: Array<{ id?: unknown; text?: unknown }> =
    typeof raw === "string"
      ? itemsFromText(raw).map((text) => ({ text }))
      : Array.isArray(raw)
        ? raw.map((v) => (typeof v === "string" ? { text: v } : v && typeof v === "object" ? (v as { id?: unknown; text?: unknown }) : { text: "" }))
        : [];
  const out: CanvasItem[] = [];
  const seen = new Set<string>();
  for (const v of source) {
    const text = typeof v.text === "string" ? cutAtWord(v.text.trim(), limits.maxChars) : "";
    if (text.length < limits.min) continue;
    let id = isItemId(v.id) && !seen.has(v.id) ? v.id : newItemId();
    while (seen.has(id)) id = newItemId();
    seen.add(id);
    out.push({ id, text });
    if (out.length >= limits.max) break;
  }
  return out;
}

export function itemTexts(items: readonly CanvasItem[] | undefined): string[] {
  return (items ?? []).map((i) => i.text);
}
