import "server-only";

import jpeg from "jpeg-js";
import { PNG } from "pngjs";

/**
 * The dominant colours of a logo (M118): decode png or jpeg in pure JS,
 * sample the pixels into coarse bins, drop near greys and transparent
 * pixels, and answer the five fullest bins as hexes, darkest last.
 */
export const PALETTE_TYPES = ["image/png", "image/jpeg"] as const;

interface Pixels {
  width: number;
  height: number;
  data: Uint8Array | Buffer;
}

function decode(buffer: Buffer, contentType: string): Pixels | null {
  try {
    if (contentType === "image/png") {
      const png = PNG.sync.read(buffer);
      return { width: png.width, height: png.height, data: png.data };
    }
    if (contentType === "image/jpeg") {
      const img = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 64 });
      return { width: img.width, height: img.height, data: img.data };
    }
  } catch {
    return null;
  }
  return null;
}

const hex2 = (n: number) => n.toString(16).padStart(2, "0");

export function paletteFromImage(buffer: Buffer, contentType: string, count = 5): string[] {
  const px = decode(buffer, contentType);
  if (!px) return [];
  const step = Math.max(1, Math.floor(Math.sqrt((px.width * px.height) / 4096)));
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let y = 0; y < px.height; y += step) {
    for (let x = 0; x < px.width; x += step) {
      const i = (y * px.width + x) * 4;
      const a = px.data[i + 3];
      if (a < 128) continue;
      const r = px.data[i];
      const g = px.data[i + 1];
      const b = px.data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Near greys and near white or black say nothing about a brand.
      if (max - min < 24 || max < 24 || min > 232) continue;
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      bin.n += 1;
      bin.r += r;
      bin.g += g;
      bin.b += b;
      bins.set(key, bin);
    }
  }
  return [...bins.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((bin) => `#${hex2(Math.round(bin.r / bin.n))}${hex2(Math.round(bin.g / bin.n))}${hex2(Math.round(bin.b / bin.n))}`);
}
