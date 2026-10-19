import "server-only";

import { NextResponse } from "next/server";

import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import type { Owner } from "@/lib/owner";
import { isProjectKey, verifyKey } from "@/lib/project-keys";

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

/**
 * The draft export's caller (M111): a project key in the Authorization
 * header for this project, else the signed in session. A key for another
 * project reads as nobody.
 */
export async function exportOwner(req: Request, projectId: string): Promise<Owner | NextResponse> {
  const header = req.headers.get("authorization") ?? "";
  const [type, token] = header.split(" ");
  if (type?.toLowerCase() === "bearer" && isProjectKey(token)) {
    const key = await verifyKey(token);
    if (!key || key.projectId !== projectId) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return key.owner;
  }
  const gate = await gateExport(req);
  if (gate) return gate;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return user.owner;
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
