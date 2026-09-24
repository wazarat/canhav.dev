import "server-only";

import { auth } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/next";

import { isAuthConfigured } from "@/lib/auth";

/**
 * Shared OAuth wiring for every MCP mount. Clerk reports the protected
 * resource as the origin, not the path, so the one metadata route below is
 * correct for /mcp and for every project-scoped /mcp/p/[id] endpoint.
 */
export const MCP_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";

export async function verifyMcpToken(_req: Request, token?: string) {
  if (!isAuthConfigured() || !token) return undefined;
  try {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    return verifyClerkToken(clerkAuth, token);
  } catch {
    return undefined;
  }
}
