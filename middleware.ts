import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase session refresh for the studio subtree only — the rest of the
 * site (marketing, /launch, /agents) never touches auth. No-op when
 * Supabase is unconfigured.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options);
      },
    },
  });

  // Refreshes an expired session cookie; the page still authorizes via
  // getSessionUser() — this is transport, not the auth check.
  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ["/studio/:path*"] };
