import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import { DRAFT_LIMITS } from "@/lib/draft/limits";

/**
 * The one call to the model (M112). Structured output through
 * output_config.format, so the answer parses against the kind's zod
 * schema; no forced tool call. The project context sits first in the
 * system prompt with a cache breakpoint, so Draft then Redraft on the
 * same record read it from the cache. Outside production without an API
 * key a kind's fixture answers, so the surfaces can be built and smoke
 * tested; on production a missing key is a configuration error.
 */
export const DRAFT_MODEL = "claude-opus-5-5";

export class DraftError extends Error {
  readonly code: "not_configured" | "refusal" | "unparsed" | "api";
  constructor(code: DraftError["code"], message: string) {
    super(message);
    this.name = "DraftError";
    this.code = code;
  }
}

export interface DraftUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  /** True when the fixture answered instead of the model. */
  fixture: boolean;
}

export function draftConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function fixtureAllowed(): boolean {
  return !draftConfigured() && process.env.VERCEL_ENV !== "production";
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function draft<T>(input: {
  kind: string;
  schema: z.ZodType<T>;
  /** The record, rendered by lib/draft/context.ts. Cached across calls on the same record. */
  context: string;
  /** What to write and how, after the context. */
  instructions: string;
  /** The request itself, the user turn. */
  ask: string;
  maxTokens?: number;
  /** The fixture a kind answers with when no key is configured outside production. */
  fixture?: T;
}): Promise<{ value: T; usage: DraftUsage }> {
  if (!draftConfigured()) {
    if (fixtureAllowed() && input.fixture !== undefined)
      return { value: input.fixture, usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, fixture: true } };
    throw new DraftError("not_configured", "Drafting is not configured. Set ANTHROPIC_API_KEY.");
  }
  try {
    const response = await anthropic().messages.parse({
      model: DRAFT_MODEL,
      max_tokens: input.maxTokens ?? DRAFT_LIMITS.maxTokens,
      system: [
        { type: "text", text: input.context, cache_control: { type: "ephemeral" } },
        { type: "text", text: input.instructions },
      ],
      messages: [{ role: "user", content: input.ask }],
      output_config: { effort: "low", format: zodOutputFormat(input.schema) },
    });
    if (response.stop_reason === "refusal")
      throw new DraftError("refusal", `The model declined this draft${response.stop_details?.category ? ` (${response.stop_details.category})` : ""}.`);
    if (!response.parsed_output) throw new DraftError("unparsed", "The model's answer did not match the expected shape. Try again.");
    const u = response.usage;
    return {
      value: response.parsed_output,
      usage: {
        inputTokens: u.input_tokens,
        outputTokens: u.output_tokens,
        cacheReadTokens: u.cache_read_input_tokens ?? 0,
        fixture: false,
      },
    };
  } catch (err) {
    if (err instanceof DraftError) throw err;
    if (err instanceof Anthropic.RateLimitError) throw new DraftError("api", "The model is busy. Try again in a minute.");
    if (err instanceof Anthropic.APIError) throw new DraftError("api", `The model answered ${err.status}. Try again.`);
    throw new DraftError("api", "The draft failed. Try again.");
  }
}
