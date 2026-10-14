import "server-only";

import { put } from "@vercel/blob";
import { keccak256 } from "viem";

import { LAUNCH_FORM } from "@/content/launch";

/**
 * Image storage (M90). One content-addressed store for token images and
 * logos: the key is the keccak256 of the bytes, so the same file lands on
 * the same URL, a logo on a design can become the on-chain imageURI of its
 * launch unchanged, and nothing is swapped after the fact. Shared by the
 * studio's upload route and the MCP set_logo tool.
 */

export const IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const IMAGE_LIMITS = {
  maxBytes: LAUNCH_FORM.image.maxBytes,
  /** An agent sends bytes inline, so its cap is lower than the form's. */
  inlineMaxBytes: 1_500_000,
  /** A fetched URL answers within this. */
  fetchMs: 10_000,
} as const;

export function imagesConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export const IMAGES_NOT_CONFIGURED =
  "Blob storage not configured. Create a Blob store for this project in the Vercel dashboard (Storage, Blob), then pull env again.";

export { isStoredImageUrl } from "@/lib/image-url";

export type StoreImageResult =
  | { ok: true; url: string; hash: `0x${string}`; contentType: string; bytes: number }
  | { ok: false; message: string };

/** Store image bytes, content addressed. Checks the type and the size first. */
export async function storeImage(buffer: Buffer, contentType: string, maxBytes = IMAGE_LIMITS.maxBytes): Promise<StoreImageResult> {
  if (!imagesConfigured()) return { ok: false, message: IMAGES_NOT_CONFIGURED };
  const ext = IMAGE_EXT[contentType];
  if (!ext) return { ok: false, message: `Unsupported image type ${contentType || "(none)"}. Send png, jpeg, webp or gif.` };
  if (buffer.length === 0) return { ok: false, message: "The image is empty." };
  if (buffer.length > maxBytes) return { ok: false, message: `The image is ${(buffer.length / 1_000_000).toFixed(1)} MB, max ${(maxBytes / 1_000_000).toFixed(1)} MB.` };
  const hash = keccak256(buffer);
  const blob = await put(`launchpad/tokens/${hash}.${ext}`, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { ok: true, url: blob.url, hash, contentType, bytes: buffer.length };
}

/** Fetch an https image and store it. The agent's way to hand over a file it hosts or found. */
export async function storeImageFromUrl(url: string): Promise<StoreImageResult> {
  if (!/^https:\/\/\S+$/.test(url)) return { ok: false, message: "The image URL must be https." };
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_LIMITS.fetchMs), redirect: "follow" });
  } catch {
    return { ok: false, message: `Could not fetch ${url}.` };
  }
  if (!res.ok) return { ok: false, message: `Fetching ${url} answered ${res.status}.` };
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > IMAGE_LIMITS.maxBytes) return { ok: false, message: `The image is over ${(IMAGE_LIMITS.maxBytes / 1_000_000).toFixed(0)} MB.` };
  const buffer = Buffer.from(await res.arrayBuffer());
  return storeImage(buffer, type);
}

/** Decode inline base64 (a data URL or bare base64) and store it. */
export async function storeImageFromBase64(data: string, mediaType: string | undefined): Promise<StoreImageResult> {
  let type = mediaType?.toLowerCase() ?? "";
  let payload = data.trim();
  const dataUrl = payload.match(/^data:([a-z0-9/+.-]+);base64,(.*)$/is);
  if (dataUrl) {
    type = type || dataUrl[1].toLowerCase();
    payload = dataUrl[2];
  }
  if (!type) return { ok: false, message: "Send mediaType (image/png, image/jpeg, image/webp or image/gif) with bare base64." };
  let buffer: Buffer;
  try {
    buffer = Buffer.from(payload.replace(/\s+/g, ""), "base64");
  } catch {
    return { ok: false, message: "The base64 could not be decoded." };
  }
  return storeImage(buffer, type, IMAGE_LIMITS.inlineMaxBytes);
}
