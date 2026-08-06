import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase is used for AUTH ONLY — all launchpad data stays in Neon
 * (lib/db.ts). Returns null when the env is unconfigured, mirroring getDb():
 * every caller must degrade gracefully instead of crashing.
 */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet)
            cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; middleware refreshes there.
        }
      },
    },
  });
}
