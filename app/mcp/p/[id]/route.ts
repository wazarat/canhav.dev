import { NextResponse } from "next/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { isAuthConfigured } from "@/lib/auth";
import { MCP_RESOURCE_METADATA_PATH, verifyMcpToken } from "@/lib/mcp/auth";
import { registerProjectTools } from "@/lib/mcp/project-tools";

export const runtime = "nodejs";

/**
 * A project-scoped MCP server. Each project in the studio has its own URL,
 * /mcp/p/<project id>, whose tools are bound to that project and take no slug
 * or address. Owner-only, so auth is required at the transport: the 401 with
 * WWW-Authenticate is what makes `claude mcp add` open the browser flow.
 *
 * The handler is built per request rather than memoized. mcp-handler serves
 * the MCP SDK statelessly and calls the server factory on every request, so a
 * Map would save one closure allocation while holding an unbounded entry per
 * project for the life of every warm lambda.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function scopedHandler(projectId: string) {
  const handler = createMcpHandler((server) => registerProjectTools(server, projectId), {
    serverInfo: { name: `canhav-project-${projectId.slice(0, 8)}`, version: "1.0.0" },
  });
  return withMcpAuth(handler, verifyMcpToken, {
    required: true,
    resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
  });
}

async function route(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthConfigured())
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  return scopedHandler(id.toLowerCase())(req);
}

export { route as GET, route as POST };
