import "server-only";

import { listChannelsWithSecrets } from "@/lib/alerts/db";
import { type DeliveryEnv, deliver } from "@/lib/alerts/deliver";
import type { AlertEventView } from "@/lib/alerts/schema";
import { openSecret } from "@/lib/secrets";

/**
 * Delivery from the app (M128): the test alert goes out from the route so
 * the studio can confirm the channels at once. This is the one place the
 * app decrypts a channel; real alerts stay with the worker.
 */
export function deliveryEnv(): DeliveryEnv {
  return {
    resendKey: process.env.RESEND_API_KEY,
    from: process.env.ALERTS_FROM_EMAIL ?? process.env.LEADS_FROM_EMAIL,
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  };
}

export async function deliverToChannels(projectId: string, subject: string, text: string): Promise<NonNullable<AlertEventView["delivered"]>> {
  const delivered: NonNullable<AlertEventView["delivered"]> = {};
  const env = deliveryEnv();
  for (const ch of await listChannelsWithSecrets(projectId)) {
    const target = openSecret(ch.configEnc);
    if (!target) {
      delivered[ch.id] = { ok: false, error: "could not open the channel", at: new Date().toISOString() };
      continue;
    }
    const result = await deliver(ch.kind, target, subject, text, env);
    delivered[ch.id] = { ...result, at: new Date().toISOString() };
  }
  return delivered;
}
