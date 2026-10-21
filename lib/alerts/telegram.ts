import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { ALERT_LIMITS } from "@/lib/alerts/kinds";

/**
 * The platform Telegram bot (M128). Connect Telegram in the studio opens a
 * deep link carrying a signed pairing code; the bot's webhook reads it from
 * /start, verifies it and stores the chat as a channel. No table: the code
 * is the project id, an expiry and an HMAC under TELEGRAM_WEBHOOK_SECRET,
 * 32 bytes in base64url, inside Telegram's 64 character start payload.
 */

const MAC_BYTES = 12;

export function telegramAvailable(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME && process.env.TELEGRAM_WEBHOOK_SECRET);
}

function mac(body: Buffer): Buffer {
  return createHmac("sha256", process.env.TELEGRAM_WEBHOOK_SECRET ?? "").update(body).digest().subarray(0, MAC_BYTES);
}

export function mintPairCode(projectId: string, now = Date.now()): string | null {
  if (!telegramAvailable()) return null;
  const id = Buffer.from(projectId.replace(/-/g, ""), "hex");
  if (id.length !== 16) return null;
  const expiry = Buffer.alloc(4);
  expiry.writeUInt32BE(Math.floor((now + ALERT_LIMITS.pairingMs) / 1000));
  const body = Buffer.concat([id, expiry]);
  return Buffer.concat([body, mac(body)]).toString("base64url");
}

export function verifyPairCode(code: string, now = Date.now()): { projectId: string } | null {
  if (!telegramAvailable() || !/^[A-Za-z0-9_-]{43}$/.test(code)) return null;
  const raw = Buffer.from(code, "base64url");
  if (raw.length !== 20 + MAC_BYTES) return null;
  const body = raw.subarray(0, 20);
  const given = raw.subarray(20);
  const expected = mac(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (body.readUInt32BE(16) * 1000 < now) return null;
  const hex = body.subarray(0, 16).toString("hex");
  return { projectId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` };
}

export function botLink(code: string): string {
  return `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${code}`;
}

/** True when the webhook request carries the secret token set at setWebhook. */
export function webhookAuthorized(header: string | null): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function telegramReply(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    console.warn("[alerts] telegram reply failed", (err as Error).message);
  }
}
