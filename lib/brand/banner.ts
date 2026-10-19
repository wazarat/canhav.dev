import { type Brand, hexToRgb } from "@/lib/brand/record";

/**
 * Social banners as SVG (M118): the X header, the Open Graph card and
 * the square avatar, from the kit's palette and fonts, the name, the
 * ticker and the logo. SVG downloads keep the build free of native image
 * work; the public page's Open Graph PNG is rendered by next/og.
 */
export const BANNER_KINDS = { x: { w: 1500, h: 500 }, og: { w: 1200, h: 630 }, square: { w: 1024, h: 1024 } } as const;
export type BannerKind = keyof typeof BANNER_KINDS;

export function isBannerKind(v: unknown): v is BannerKind {
  return v === "x" || v === "og" || v === "square";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function readable(bg: string): string {
  const [r, g, b] = hexToRgb(bg);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0b0f1a" : "#f5f7fb";
}

export function bannerSvg(kind: BannerKind, input: { name: string; ticker?: string | null; tagline?: string | null; logoUrl?: string | null; brand: Brand }): string {
  const { w, h } = BANNER_KINDS[kind];
  const p = input.brand.palette;
  const text = readable(p.surface);
  const display = input.brand.fonts.display;
  const body = input.brand.fonts.body;
  const square = kind === "square";
  const pad = Math.round(w * 0.06);
  const logoSize = square ? Math.round(w * 0.34) : Math.round(h * 0.4);
  const titleSize = square ? Math.round(w * 0.075) : Math.round(h * 0.16);
  const subSize = square ? Math.round(w * 0.035) : Math.round(h * 0.07);
  const logo = input.logoUrl
    ? `<image href="${esc(input.logoUrl)}" x="${square ? (w - logoSize) / 2 : pad}" y="${square ? pad * 1.4 : (h - logoSize) / 2}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" clip-path="url(#r)"/>`
    : `<rect x="${square ? (w - logoSize) / 2 : pad}" y="${square ? pad * 1.4 : (h - logoSize) / 2}" width="${logoSize}" height="${logoSize}" rx="${logoSize * 0.18}" fill="${p.primary}"/>`;
  const textX = square ? w / 2 : pad * 1.6 + logoSize;
  const anchor = square ? "middle" : "start";
  const titleY = square ? pad * 1.4 + logoSize + titleSize * 1.3 : h / 2 - subSize * 0.2;
  const name = esc(input.name || "Untitled");
  const sub = esc([input.ticker ? `$${input.ticker}` : null, input.tagline ?? null].filter(Boolean).join(" · "));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.primary}" stop-opacity="0.35"/><stop offset="1" stop-color="${p.secondary}" stop-opacity="0.15"/></linearGradient>
    <clipPath id="r"><rect x="${square ? (w - logoSize) / 2 : pad}" y="${square ? pad * 1.4 : (h - logoSize) / 2}" width="${logoSize}" height="${logoSize}" rx="${logoSize * 0.18}"/></clipPath>
  </defs>
  <rect width="${w}" height="${h}" fill="${p.surface}"/>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect x="0" y="${h - Math.round(h * 0.02)}" width="${w}" height="${Math.round(h * 0.02)}" fill="${p.accent}"/>
  ${logo}
  <text x="${textX}" y="${titleY}" text-anchor="${anchor}" font-family="${esc(display)}, sans-serif" font-size="${titleSize}" font-weight="700" fill="${text}">${name}</text>
  ${sub ? `<text x="${textX}" y="${titleY + subSize * 1.5}" text-anchor="${anchor}" font-family="${esc(body)}, sans-serif" font-size="${subSize}" fill="${text}" fill-opacity="0.8">${sub}</text>` : ""}
</svg>`;
}
