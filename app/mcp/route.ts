import { auth } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { isAuthConfigured } from "@/lib/auth";
import { registerAllTools } from "@/lib/mcp/tools";

export const runtime = "nodejs";

/**
 * Remote MCP server (HTTP transport) at /mcp. Auth is Clerk OAuth 2.1 with
 * dynamic client registration — clients discover it via the two .well-known
 * metadata routes. Auth is optional at the transport (required: false):
 * published-snapshot tools serve anonymously, and each "my data" tool
 * enforces its own token check.
 */
const handler = createMcpHandler((server) => registerAllTools(server), {
  serverInfo: { name: "canhav", version: "1.0.0" },
});

const authHandler = withMcpAuth(
  handler,
  async (_req, token) => {
    if (!isAuthConfigured() || !token) return undefined;
    try {
      const clerkAuth = await auth({ acceptsToken: "oauth_token" });
      return verifyClerkToken(clerkAuth, token);
    } catch {
      return undefined;
    }
  },
  {
    required: false,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export { authHandler as GET, authHandler as POST };
