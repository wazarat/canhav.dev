import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Clerk session detection, scoped to the routes that actually call auth():
 * the studio, the launch form page, the ideation/export/launches APIs, the
 * launch write APIs, and the MCP endpoint. Marketing, /launch/t, /p, /t,
 * /agents, /api/leads and /.well-known/* stay untouched. clerkMiddleware throws at request time without keys, so an
 * unconfigured deploy degrades to pass-through (pages show the config chip,
 * APIs return 503) instead of crashing.
 */
const configured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export default configured ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
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
  ],
};
