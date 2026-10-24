import "server-only";

import { BRAND_BODY_FONTS, BRAND_DISPLAY_FONTS } from "@/content/brand-fonts";
import { BRAND_LIMITS, DEFAULT_BRAND, brandDraftSchema, normalizeBrand } from "@/lib/brand/record";
import { DRAFT_VOICE } from "@/lib/draft/context";
import { registerDraftKind } from "@/lib/draft/kinds";
import { cutAtWord } from "@/lib/text";
import type { ProjectDoc } from "@/lib/ideation";

function hexes(body: Record<string, unknown>): string[] {
  return Array.isArray(body.hexes) ? body.hexes.filter((h): h is string => typeof h === "string" && /^#[0-9a-f]{6}$/.test(h)).slice(0, 8) : [];
}

registerDraftKind("brand", {
  schema: brandDraftSchema,
  // normalizeBrand caps the words and checks the hexes; the cast keeps the schema's font enums, which the fixture and the kit both hold as plain strings.
  clean: (value) => (normalizeBrand(value) ?? { ...value, tone: value.tone.map((t) => cutAtWord(t.trim(), BRAND_LIMITS.tone.item)).filter(Boolean).slice(0, BRAND_LIMITS.tone.max), tagline: cutAtWord(value.tagline.trim(), BRAND_LIMITS.tagline.max) }) as typeof value,
  extras: (doc: ProjectDoc, body) => {
    const picked = hexes(body);
    const lines = ["## Brand inputs"]; // copy-ok, model context
    if (picked.length) lines.push(`Colours found in the logo, most used first: ${picked.join(", ")}`); // copy-ok, model context
    if (doc.brand) lines.push(`The kit as it stands: ${JSON.stringify(doc.brand)}`); // copy-ok, model context
    lines.push(`Display fonts allowed: ${BRAND_DISPLAY_FONTS.join(", ")}`); // copy-ok, model context
    lines.push(`Body fonts allowed: ${BRAND_BODY_FONTS.join(", ")}`); // copy-ok, model context
    return [lines.join("\n")];
  },
  instructions: () =>
    `${DRAFT_VOICE}\n\nPropose a brand kit for this project. A palette of four lowercase hex colours (primary, secondary, accent, surface, the surface dark enough or light enough that the others read on it; start from the logo colours when given), one display font and one body font from the allowed lists, two to five tone words, and a tagline of at most 90 characters that says what the product does for whom. No hype words.`,
  ask: () => "Draft the brand kit.",
  // The default kit holds the fonts as plain strings; they are names from the same lists the schema enumerates.
  fixture: (doc) => ({ ...DEFAULT_BRAND, tone: ["plain", "precise"], tagline: `${doc.name || "The product"}, drafted locally. (Fixture, no model key is set.)`.slice(0, 90) }) as never,
});
