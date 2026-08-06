import { NextResponse } from "next/server";

import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Magic-link landing: exchanges the emailed credential for a session cookie,
 * then continues to the studio. Supports both PKCE (?code=) and OTP
 * (?token_hash=&type=) email templates.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.redirect(`${origin}/studio`);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  let failed = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type === "email") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    failed = Boolean(error);
  } else {
    failed = true;
  }

  return NextResponse.redirect(`${origin}/studio${failed ? "?auth_error=1" : ""}`);
}
