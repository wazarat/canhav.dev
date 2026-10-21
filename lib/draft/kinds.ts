import "server-only";

import type { z } from "zod";

import type { DraftKind } from "@/lib/draft/limits";
import type { ProjectDoc } from "@/lib/ideation";

/**
 * What one draft kind does (M112): its output schema, how it renders the
 * extras and instructions from the record and the request body, and the
 * fixture it answers with locally. Each feature milestone registers its
 * kinds here.
 */
export interface DraftSpec<T = unknown> {
  schema: z.ZodType<T>;
  /** Extra context blocks from the record and the request. */
  extras: (doc: ProjectDoc, body: Record<string, unknown>) => Promise<string[]> | string[];
  instructions: (doc: ProjectDoc, body: Record<string, unknown>) => string;
  ask: (doc: ProjectDoc, body: Record<string, unknown>) => string;
  fixture: (doc: ProjectDoc, body: Record<string, unknown>) => T;
  /** Caps and trims the model's answer to the record's limits. The output schema stays loose so a long line is cut, not refused. */
  clean?: (value: T) => T;
  long?: boolean;
}

const specs: Partial<Record<DraftKind, DraftSpec>> = {};

export function registerDraftKind<T>(kind: DraftKind, spec: DraftSpec<T>): void {
  specs[kind] = spec as DraftSpec;
}

export function draftSpec(kind: DraftKind): DraftSpec | null {
  return specs[kind] ?? null;
}
