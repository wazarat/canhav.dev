import { NextResponse } from "next/server";

import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { DraftError, draft } from "@/lib/draft/anthropic";
import { briefLines, normalizeBriefAnswers } from "@/lib/draft/briefs";
import { renderProjectContext } from "@/lib/draft/context";
import { countDraftsThisMonth, recordDraftRun } from "@/lib/draft/db";
import { draftSpec } from "@/lib/draft/kinds";
import { DRAFT_KIND_FEATURES, DRAFT_LIMITS, isDraftKind } from "@/lib/draft/limits";
import "@/lib/draft/register";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Draft one thing for a project (M112). Never writes the draft; the client
 * applies the value through the record's patch. The monthly allowance is
 * per team (the account on a personal Studio+ session under the dev
 * override).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  if (!isDraftKind(kind)) return NextResponse.json({ error: "Unknown draft." }, { status: 404 });
  const gate = await projectPlusGate(id, DRAFT_KIND_FEATURES[kind]);
  if (gate instanceof NextResponse) return gate;
  const spec = draftSpec(kind);
  if (!spec) return NextResponse.json({ error: "This draft is not available yet." }, { status: 404 });
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    if (raw.trim()) body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  // The allowance is the project's team's (M134), the account's on a personal project under the dev override.
  const allowanceKey = project.org_id ?? gate.id;
  const used = await countDraftsThisMonth(allowanceKey);
  if (used >= DRAFT_LIMITS.perOrgMonth)
    return NextResponse.json({ error: STUDIO_PLUS_COPY.draft.capReached, used, remaining: 0 }, { status: 429 });
  try {
    const doc = project.draft_doc;
    // The brief (M142): the answers sent with the click, else the ones stored for the kind; the last extra, so it is never cut.
    const brief = normalizeBriefAnswers(kind, body.brief) ?? doc.briefs?.[kind]?.answers ?? null;
    const extras = [...(await spec.extras(doc, body)), ...(brief ? [briefLines(kind, brief)] : [])];
    const result = await draft({
      kind,
      schema: spec.schema,
      context: renderProjectContext(doc, extras),
      instructions: spec.instructions(doc, body),
      ask: spec.ask(doc, body),
      maxTokens: spec.long ? DRAFT_LIMITS.maxTokensLong : DRAFT_LIMITS.maxTokens,
      effort: brief && !spec.long ? "medium" : "low",
      fixture: spec.fixture(doc, body),
    });
    await recordDraftRun({ allowanceKey, projectId: project.id, kind, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens });
    const value = spec.clean ? spec.clean(result.value) : result.value;
    return NextResponse.json({ value, usage: result.usage, remaining: Math.max(0, DRAFT_LIMITS.perOrgMonth - used - 1) });
  } catch (err) {
    if (err instanceof DraftError) {
      const status = err.code === "not_configured" ? 503 : err.code === "refusal" || err.code === "truncated" ? 422 : 502;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[draft] failed", err);
    return NextResponse.json({ error: STUDIO_PLUS_COPY.draft.failed }, { status: 500 });
  }
}
