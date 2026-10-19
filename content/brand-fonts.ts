/**
 * The fonts a brand kit may name (M118), all on Google Fonts so the public
 * page and the banners can load them. The draft is held to this list.
 */
export const BRAND_DISPLAY_FONTS = ["Space Grotesk", "Inter", "Sora", "Manrope", "DM Sans", "Syne", "Plus Jakarta Sans", "Outfit", "Instrument Serif", "Playfair Display"] as const;
export const BRAND_BODY_FONTS = ["Inter", "DM Sans", "Manrope", "IBM Plex Sans", "Source Sans 3", "Work Sans", "Nunito Sans", "Lora", "IBM Plex Mono", "JetBrains Mono"] as const;

export type BrandDisplayFont = (typeof BRAND_DISPLAY_FONTS)[number];
export type BrandBodyFont = (typeof BRAND_BODY_FONTS)[number];

export function googleFontsUrl(display: string, body: string): string {
  const fam = (f: string) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700`;
  return `https://fonts.googleapis.com/css2?${fam(display)}&${fam(body)}&display=swap`;
}
