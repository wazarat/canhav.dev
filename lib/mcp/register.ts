import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import type { z } from "zod";

/**
 * The metering seam: every MCP tool registers through registerMeteredTool,
 * so per-tool call counting can be added later in exactly one place without
 * touching any tool. Today it only logs one line per call. Access is free,
 * gated only by a Clerk account.
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
  /** scope names the mount, so a project-scoped server's calls are countable. */
  opts?: { scope?: string },
): void {
  // The SDK's registerTool generics are stricter than we need; the runtime
  // contract (zod schema in, {content} out) is exactly what we pass.
  (server.registerTool as unknown as (
    name: string,
    config: unknown,
    cb: (args: z.infer<Schema>, ctx: unknown) => Promise<ToolResult>,
  ) => void)(name, config, async (args, ctx) => {
    // Metering hook. One structured log line per call so tool usage and
    // failure rates are visible in Vercel runtime logs. Counting lands here.
    const startedAt = Date.now();
    let result: ToolResult;
    try {
      result = await cb(args, ctx);
    } catch (err) {
      console.info(
        JSON.stringify({
          mcpTool: name,
          userId: mcpUserId(ctx),
          ms: Date.now() - startedAt,
          threw: true,
          ...(opts?.scope ? { scope: opts.scope } : {}),
        }),
      );
      throw err;
    }
    console.info(
      JSON.stringify({
        mcpTool: name,
        userId: mcpUserId(ctx),
        ms: Date.now() - startedAt,
        isError: result.isError === true,
        ...(opts?.scope ? { scope: opts.scope } : {}),
      }),
    );
    return result;
  });
}

export interface PromptResult {
  description?: string;
  messages: Array<{ role: "user" | "assistant"; content: { type: "text"; text: string } }>;
}

/** A single user message, the shape every CanHav prompt returns. */
export function promptResult(text: string, description?: string): PromptResult {
  return {
    ...(description ? { description } : {}),
    messages: [{ role: "user", content: { type: "text", text } }],
  };
}

/**
 * The same seam for prompts. Registration is static, so a prompt may not
 * read the database at registration time either; its callback may, and it
 * runs per request like a tool call.
 */
export function registerMeteredPrompt<Schema extends z.ZodType>(
  server: McpServer,
  name: string,
  config: { title: string; description: string; argsSchema?: Schema },
  cb: (args: z.infer<Schema>, ctx: unknown) => Promise<PromptResult>,
  opts?: { scope?: string },
): void {
  (server.registerPrompt as unknown as (
    name: string,
    config: unknown,
    cb: (args: z.infer<Schema>, ctx: unknown) => Promise<PromptResult>,
  ) => void)(name, config, async (args, ctx) => {
    const startedAt = Date.now();
    try {
      const result = await cb(args, ctx);
      console.info(
        JSON.stringify({
          mcpPrompt: name,
          userId: mcpUserId(ctx),
          ms: Date.now() - startedAt,
          ...(opts?.scope ? { scope: opts.scope } : {}),
        }),
      );
      return result;
    } catch (err) {
      console.info(
        JSON.stringify({
          mcpPrompt: name,
          userId: mcpUserId(ctx),
          ms: Date.now() - startedAt,
          threw: true,
          ...(opts?.scope ? { scope: opts.scope } : {}),
        }),
      );
      throw err;
    }
  });
}
