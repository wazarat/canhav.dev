import "server-only";

/**
 * Secrets at rest (M123). The cipher lives in the alerts worker's shared
 * module so both sides agree; the app encrypts on save, the worker decrypts
 * at delivery, and since M128 the app decrypts in one place too, the test
 * alert (lib/alerts/send.ts), so a team can confirm delivery from the studio.
 */
import { decryptSecret, encryptSecret, maskSecret } from "@/alerts/src/secrets";

export { maskSecret };

export function alertsSecret(): string | null {
  return process.env.ALERTS_SECRET || null;
}

/** Null when ALERTS_SECRET is unset, so a channel cannot be stored unencrypted. */
export function sealSecret(plain: string): string | null {
  const secret = alertsSecret();
  return secret ? encryptSecret(plain, secret) : null;
}

/** Null when ALERTS_SECRET is unset or the stored value does not open. */
export function openSecret(stored: string): string | null {
  const secret = alertsSecret();
  if (!secret) return null;
  try {
    return decryptSecret(stored, secret);
  } catch {
    return null;
  }
}
