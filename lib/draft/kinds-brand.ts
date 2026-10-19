import "server-only";

import { BRAND_BODY_FONTS, BRAND_DISPLAY_FONTS } from "@/content/brand-fonts";
import { DEFAULT_BRAND, brandDraftSchema } from "@/lib/brand/record";
import { DRAFT_VOICE } from "@/lib/draft/context";
import { registerDraftKind } from "@/lib/draft/kinds";
import type { ProjectDoc } from "@/lib/ideation";

function hexes(body: Record<string, unknown>): string[] {
  return Array.isArray(body.hexes) ? body.hexes.filter((h): h is string => typeof h === "string" && /^#[0-9a-f]{6}$/.test(h)).slice(0, 8) : [];
}

registerDraftKind("brand", {
  schema: brandDraftSchema,
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
  fixture: (doc) => ({ ...DEFAULT_BRAND, tone: ["plain", "precise"], tagline: `${doc.name || "The product"}, drafted locally. (Fixture, no model key is set.)`.slice(0, 90) }),
});
