import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import type { z } from "zod";

/**
 * The metering seam: every MCP tool registers through registerMeteredTool,
 * so per-tool call counting can be added later in exactly one place without
 * touching any tool. No metering today — free, gated only by a Clerk
 * account.
 */

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

/** JSON payload as a text content block (the MCP-idiomatic shape). */
export function jsonResult(value: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

export function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** The Clerk user id from a verified OAuth token, or null when anonymous. */
export function mcpUserId(ctx: unknown): string | null {
  const info = (ctx as { http?: { authInfo?: { extra?: Record<string, unknown> } } })?.http
    ?.authInfo;
  const userId = info?.extra?.userId;
  return typeof userId === "string" ? userId : null;
}

export function registerMeteredTool<Schema extends z.ZodType>(
  server: McpServer,
  name: string,
  config: { title: string; description: string; inputSchema?: Schema },
  cb: (args: z.infer<Schema>, ctx: unknown) => Promise<ToolResult>,
): void {
  // The SDK's registerTool generics are stricter than we need; the runtime
  // contract (zod schema in, {content} out) is exactly what we pass.
  (server.registerTool as unknown as (
    name: string,
    config: unknown,
    cb: (args: z.infer<Schema>, ctx: unknown) => Promise<ToolResult>,
  ) => void)(name, config, async (args, ctx) => {
    // Metering hook: when counting lands, record (name, mcpUserId(ctx)) here.
    return cb(args, ctx);
  });
}
