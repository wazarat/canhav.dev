import { clerkMiddleware } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

import { isOwnHost, slugForHost } from "@/lib/domains-edge";

/**
 * Clerk session detection, scoped to the routes that actually call auth():
 * the studio, the launch form page, the ideation/export/launches APIs, the
 * launch write APIs, the MCP endpoint and the public project pages (M109). Marketing, /launch/t, /t,
 * /agents, /api/leads and /.well-known/* stay untouched. clerkMiddleware throws at request time without keys, so an
 * unconfigured deploy degrades to pass-through (pages show the config chip,
 * APIs return 503) instead of crashing.
 *
 * Custom domains (M127): a request for "/" on a host that is not one of
 * ours looks the host up and rewrites to that project's public page.
 */
const configured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

async function hostRewrite(req: NextRequest): Promise<NextResponse | null> {
  const host = req.headers.get("host") ?? "";
  if (!host || isOwnHost(host) || req.nextUrl.pathname !== "/") return null;
  const slug = await slugForHost(host);
  if (!slug) return null;
  const url = req.nextUrl.clone();
  url.pathname = `/p/${slug}`;
  return NextResponse.rewrite(url);
}

export default configured
  ? clerkMiddleware(async (_auth, req) => (await hostRewrite(req)) ?? NextResponse.next())
  : async (req: NextRequest) => (await hostRewrite(req)) ?? NextResponse.next();

export const config = {
  matcher: [
    // The home page, so a custom domain's root can be rewritten (M127).
    "/",
    "/studio/:path*",
    // The launch form is for signed-in accounts. Only the form page. Token
    // pages stay session-free and gate their write controls in the browser.
    "/launch",
    "/api/ideation/:path*",
    "/api/export/:path*",
    "/api/launches/:path*",
    // The off-chain steps of a launch and of a milestone update.
    "/api/upload-image",
    "/api/token-metadata",
    "/api/journeys",
    "/api/milestone-updates",
    "/mcp/:path*",
    // Private project pages read the session to admit team members (M109).
    "/p/:path*",
  ],
};
