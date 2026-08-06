import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

export interface SessionUser {
  /** Clerk user id (`user_…` string) — the `owner_id` on ideation records. */
  id: string;
  email: string | null;
}

/** True when Clerk is configured at all (distinguishes 401 from 503). */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

/**
 * The single auth check for every ideation API route and /studio page.
 * Returns null when unauthenticated or when Clerk is unconfigured. The
 * config guard matters: auth() throws unless clerkMiddleware ran on the
 * request, and the middleware no-ops without keys.
 *
 * Email comes from a custom `email` session claim when the Clerk dashboard
 * defines one ({"email": "{{user.primary_email_address}}"}) — zero extra
 * cost — and falls back to one Backend API call otherwise.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isAuthConfigured()) return null;
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  const claimed = (sessionClaims as { email?: string } | null)?.email;
  if (claimed) return { id: userId, email: claimed };
  const user = await currentUser();
  return { id: userId, email: user?.primaryEmailAddress?.emailAddress ?? null };
}
