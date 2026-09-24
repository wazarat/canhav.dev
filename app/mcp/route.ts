import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { MCP_RESOURCE_METADATA_PATH, verifyMcpToken } from "@/lib/mcp/auth";
import { registerAllTools } from "@/lib/mcp/tools";

export const runtime = "nodejs";

/**
 * Remote MCP server (HTTP transport) at /mcp. Auth is Clerk OAuth 2.1 with
 * dynamic client registration — clients discover it via the two .well-known
 * metadata routes. Auth is optional at the transport (required: false):
 * published-snapshot tools serve anonymously, and each "my data" tool
 * enforces its own token check.
 *
 * A project-scoped variant lives at /mcp/p/[id] and is owner-only.
 */
const handler = createMcpHandler((server) => registerAllTools(server), {
  serverInfo: { name: "canhav", version: "1.0.0" },
});

const authHandler = withMcpAuth(handler, verifyMcpToken, {
  required: false,
  resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
});

export { authHandler as GET, authHandler as POST };
