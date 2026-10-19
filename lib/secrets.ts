import "server-only";

/**
 * Secrets at rest (M123). The cipher lives in the alerts worker's shared
 * module so both sides agree; the app encrypts on save and never
 * decrypts, the worker decrypts at delivery.
 */
import { encryptSecret, maskSecret } from "@/alerts/src/secrets";

export { maskSecret };

export function alertsSecret(): string | null {
  return process.env.ALERTS_SECRET || null;
}

/** Null when ALERTS_SECRET is unset, so a channel cannot be stored unencrypted. */
export function sealSecret(plain: string): string | null {
  const secret = alertsSecret();
  return secret ? encryptSecret(plain, secret) : null;
}
