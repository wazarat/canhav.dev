/**
 * Channel secrets at rest (M123). A Telegram bot token or a Discord
 * webhook is encrypted with AES-256-GCM under ALERTS_SECRET before it is
 * stored; the studio shows only the masked form and the worker decrypts
 * at delivery. Shared by the app (lib/secrets.ts re-exports this file)
 * and the worker, pure Node crypto, no framework imports.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function key(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/** "v1.<iv>.<tag>.<ciphertext>" in base64url. */
export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptSecret(stored: string, secret: string): string {
  const [version, iv, tag, body] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !body) throw new Error("Unknown secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

/** What the studio shows: the first and last few characters, the middle as dots. */
export function maskSecret(plain: string): string {
  const trimmed = plain.trim();
  if (trimmed.length <= 8) return "•".repeat(trimmed.length);
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
