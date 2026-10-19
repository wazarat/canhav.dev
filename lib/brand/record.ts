import { z } from "zod";

import { BRAND_BODY_FONTS, BRAND_DISPLAY_FONTS } from "@/content/brand-fonts";

/**
 * The brand kit on the record (M118): palette, fonts, tone words and a
 * tagline. Name and ticker come from the project and the linked design,
 * the logo from the existing upload. Pure.
 */
export interface BrandPalette {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
}

export interface Brand {
  palette: BrandPalette;
  fonts: { display: string; body: string };
  tone: string[];
  tagline?: string;
}

export const BRAND_LIMITS = { tone: { max: 5, item: 24 }, tagline: { max: 90 } } as const;
export const PALETTE_KEYS = ["primary", "secondary", "accent", "surface"] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];

export const HEX = /^#[0-9a-f]{6}$/;

const hex = z.string().regex(HEX);
const tone = z.array(z.string().min(1).max(BRAND_LIMITS.tone.item)).max(BRAND_LIMITS.tone.max);

export const brandPatchSchema = z.strictObject({
  palette: z.strictObject({ primary: hex.optional(), secondary: hex.optional(), accent: hex.optional(), surface: hex.optional() }).optional(),
  fonts: z.strictObject({ display: z.string().max(40).optional(), body: z.string().max(40).optional() }).optional(),
  tone: tone.optional(),
  tagline: z.string().max(BRAND_LIMITS.tagline.max).optional(),
});

export const brandDraftSchema = z.object({
  palette: z.object({ primary: hex, secondary: hex, accent: hex, surface: hex }),
  fonts: z.object({ display: z.enum(BRAND_DISPLAY_FONTS), body: z.enum(BRAND_BODY_FONTS) }),
  tone: z.array(z.string().min(1).max(BRAND_LIMITS.tone.item)).min(2).max(BRAND_LIMITS.tone.max),
  tagline: z.string().max(BRAND_LIMITS.tagline.max),
});

export const DEFAULT_BRAND: Brand = {
  palette: { primary: "#3d7bff", secondary: "#8b5cf6", accent: "#22d3ee", surface: "#0b0f1a" },
  fonts: { display: "Space Grotesk", body: "Inter" },
  tone: [],
};

function cleanHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const h = v.trim().toLowerCase();
  if (HEX.test(h)) return h;
  if (/^#[0-9a-f]{3}$/.test(h)) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  return null;
}

/** The kit as stored: valid hexes only, fonts trimmed, tone words capped; null when nothing survives. */
export function normalizeBrand(raw: unknown): Brand | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const p = (o.palette && typeof o.palette === "object" ? o.palette : {}) as Record<string, unknown>;
  const palette: Partial<BrandPalette> = {};
  for (const k of PALETTE_KEYS) {
    const h = cleanHex(p[k]);
    if (h) palette[k] = h;
  }
  const f = (o.fonts && typeof o.fonts === "object" ? o.fonts : {}) as Record<string, unknown>;
  const fonts = {
    display: typeof f.display === "string" ? f.display.trim().slice(0, 40) : "",
    body: typeof f.body === "string" ? f.body.trim().slice(0, 40) : "",
  };
  const toneList = Array.isArray(o.tone)
    ? o.tone.filter((t): t is string => typeof t === "string").map((t) => t.trim().slice(0, BRAND_LIMITS.tone.item)).filter(Boolean).slice(0, BRAND_LIMITS.tone.max)
    : [];
  const tagline = typeof o.tagline === "string" ? o.tagline.trim().slice(0, BRAND_LIMITS.tagline.max) : "";
  if (!Object.keys(palette).length && !fonts.display && !fonts.body && !toneList.length && !tagline) return null;
  return {
    palette: { ...DEFAULT_BRAND.palette, ...palette },
    fonts: { display: fonts.display || DEFAULT_BRAND.fonts.display, body: fonts.body || DEFAULT_BRAND.fonts.body },
    tone: toneList,
    ...(tagline ? { tagline } : {}),
  };
}

export function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The CSS variables the public page sets, "r g b" triplets the Tailwind brand colours read. */
export function brandVars(brand: Brand | undefined): Record<string, string> {
  if (!brand) return {};
  const t = (h: string) => hexToRgb(h).join(" ");
  return { "--brand-primary": t(brand.palette.primary), "--brand-accent": t(brand.palette.accent) };
}

function luminance(h: string): number {
  const [r, g, b] = hexToRgb(h).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hexes. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
