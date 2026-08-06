import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client (auth only). Null when the env is unconfigured —
 * callers render a "sign-in not configured" state instead of crashing.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createBrowserClient(url, key);
  return client;
}
