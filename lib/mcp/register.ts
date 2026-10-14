import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import type { z } from "zod";

import { describeIssues } from "@/lib/agent-writes";

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

/** MCP tool annotations (the spec's ToolAnnotations), hints a client may use for its approval flow. */
export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/**
 * Every CanHav tool is read-only unless its name says it writes (set_ and
 * update_). No tool deletes anything and every write is idempotent, a
 * proposal or a draft merge the owner can undo. Nothing here reaches the
 * open web. A tool may override any hint (M79).
 */
export function toolAnnotations(name: string, override?: ToolAnnotations): ToolAnnotations {
  const writes = /^(set_|update_)/.test(name);
  return {
    readOnlyHint: !writes,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    ...override,
  };
}

/**
 * The SDK validates tool input before the callback runs and words the
 * failure its own way, with no field length in it. So the SDK gets a
 * Standard Schema that publishes the zod schema's JSON Schema (tools/list is
 * unchanged) and accepts every input, and registerMeteredTool parses the
 * input itself and answers with describeIssues (M80), the same wording the
 * studio uses.
 */
function lenientSchema(schema: z.ZodType): unknown {
  const std = (schema as unknown as { "~standard": { jsonSchema?: unknown } })["~standard"];
  return {
    "~standard": {
      version: 1,
      vendor: "canhav",
      validate: (value: unknown) => ({ value }),
      jsonSchema: std.jsonSchema,
    },
  };
}

export function registerMeteredTool<Schema extends z.ZodType>(
  server: McpServer,
  name: string,
  config: { title: string; description: string; inputSchema?: Schema; annotations?: ToolAnnotations },
  cb: (args: z.infer<Schema>, ctx: unknown) => Promise<ToolResult>,
  /** scope names the mount, so a project-scoped server's calls are countable. */
  opts?: { scope?: string },
): void {
  const schema = config.inputSchema;
  // The SDK's registerTool generics are stricter than we need; the runtime
  // contract (zod schema in, {content} out) is exactly what we pass.
  (server.registerTool as unknown as (
    name: string,
    config: unknown,
    cb: (args: z.infer<Schema>, ctx: unknown) => Promise<ToolResult>,
  ) => void)(
    name,
    {
      ...config,
      ...(schema ? { inputSchema: lenientSchema(schema) } : {}),
      annotations: toolAnnotations(name, config.annotations),
    },
    async (rawArgs, ctx) => {
    // Metering hook. One structured log line per call so tool usage and
    // failure rates are visible in Vercel runtime logs. Counting lands here.
    const startedAt = Date.now();
    let result: ToolResult;
    try {
      let args = rawArgs;
      if (schema) {
        const parsed = schema.safeParse(rawArgs ?? {});
        if (!parsed.success) {
          result = errorResult(describeIssues(parsed.error, rawArgs));
          console.info(JSON.stringify({ mcpTool: name, userId: mcpUserId(ctx), ms: 0, isError: true, invalidInput: true, ...(opts?.scope ? { scope: opts.scope } : {}) }));
          return result;
        }
        args = parsed.data as z.infer<Schema>;
      }
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
