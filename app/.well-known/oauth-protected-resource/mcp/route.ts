import { NextResponse } from "next/server";
import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from "@clerk/mcp-tools/next";

import { isAuthConfigured } from "@/lib/auth";

/**
 * RFC 9728 protected-resource metadata for the /mcp endpoint — the first
 * thing an MCP client fetches during the OAuth handshake. Public by design;
 * deliberately outside the Clerk middleware matcher. Without Clerk keys the
 * handshake can't work, so degrade to a clear 503 instead of a 500.
 */
const handler = protectedResourceHandlerClerk({
  scopes_supported: ["profile", "email"],
});
const corsHandler = metadataCorsOptionsRequestHandler();

function GET(req: Request) {
  if (!isAuthConfigured())
    return NextResponse.json({ error: "Auth not configured." }, { status: 503 });
  return handler(req);
}

export { GET, corsHandler as OPTIONS };
