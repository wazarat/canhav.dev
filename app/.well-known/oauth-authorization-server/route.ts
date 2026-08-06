import { NextResponse } from "next/server";
import {
  authServerMetadataHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from "@clerk/mcp-tools/next";

import { isAuthConfigured } from "@/lib/auth";

/**
 * RFC 8414 authorization-server metadata, proxied from Clerk — kept for MCP
 * clients that predate protected-resource discovery. Public by design;
 * degrades to 503 when Clerk is unconfigured.
 */
const handler = authServerMetadataHandlerClerk();
const corsHandler = metadataCorsOptionsRequestHandler();

function GET() {
  if (!isAuthConfigured())
    return NextResponse.json({ error: "Auth not configured." }, { status: 503 });
  return handler();
}

export { GET, corsHandler as OPTIONS };
