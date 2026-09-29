import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Clerk session detection, scoped to the routes that actually call auth():
 * the studio, the launch form page, the ideation/export/launches APIs, and
 * the MCP endpoint. Marketing, /launch/t, /p, /t, /agents, the legacy APIs,
 * and /.well-known/* stay untouched. clerkMiddleware throws at request time without keys, so an
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
    // The launch form reads the session for ?project=<id> (M19d). Only the
    // form page; token pages stay session-free.
    "/launch",
    "/api/ideation/:path*",
    "/api/export/:path*",
    "/api/launches/:path*",
    "/mcp/:path*",
  ],
};
