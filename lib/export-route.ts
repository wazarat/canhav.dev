import "server-only";

import { NextResponse } from "next/server";

import { getSessionUser, isAuthConfigured } from "@/lib/auth";

/**
 * Gate for the export downloads: free, but behind a Clerk account (the gate
 * is email capture, not monetisation). Unauthenticated browser navigations
 * bounce to /studio sign-in and land back on the file URL afterwards.
 */
export async function gateExport(req: Request): Promise<NextResponse | null> {
  if (!isAuthConfigured())
    return NextResponse.json({ error: "Auth not configured." }, { status: 503 });
  const user = await getSessionUser();
  if (!user) {
    const url = new URL(req.url);
    const target = new URL("/studio", url.origin);
    target.searchParams.set("redirect_url", url.pathname + url.search);
    return NextResponse.redirect(target, 307);
  }
  return null;
}

export function markdownResponse(filename: string, body: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
