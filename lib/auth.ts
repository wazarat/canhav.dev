import "server-only";

import { getSupabaseServer } from "@/lib/supabase/server";

export interface SessionUser {
  /** Supabase auth user id — the `owner_id` on ideation records. */
  id: string;
  email: string | null;
}

/**
 * The single auth check for every ideation API route and /studio page.
 * Uses getUser() (server-verified JWT), never getSession(). Returns null
 * when unauthenticated or when Supabase is unconfigured.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/** True when auth is configured at all (distinguishes 401 from 503). */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
