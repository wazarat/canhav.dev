import { NextResponse } from "next/server";

import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { DraftError, draft } from "@/lib/draft/anthropic";
import { BRIEF_LIMITS } from "@/lib/draft/briefs";
import { DRAFT_VOICE, renderProjectContext } from "@/lib/draft/context";
import { countDraftsThisMonth, recordDraftRun } from "@/lib/draft/db";
import { DRAFT_LIMITS } from "@/lib/draft/limits";
import { weeklyContext } from "@/lib/draft/weekly-context";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { cutAtWord } from "@/lib/text";
import { type WeeklyBrief, weeklyBriefSchema } from "@/lib/updates";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = BRIEF_LIMITS.answer.max;

/**
 * Auto-summarize (M174): the three team update questions answered from the
 * period's activity (agent sessions and changes, checks, saved versions,
 * build progress) on the weekly model, each at most 300 characters. Never
 * writes; the brief fills its fields and the owner edits them before the
 * draft. Counts against the team's monthly drafts like any draft.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "weekly_update");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const allowanceKey = project.org_id ?? gate.id;
  const used = await countDraftsThisMonth(allowanceKey);
  if (used >= DRAFT_LIMITS.perOrgMonth)
    return NextResponse.json({ error: STUDIO_PLUS_COPY.draft.capReached, used, remaining: 0 }, { status: 429 });
  try {
    const doc = project.draft_doc;
    const result = await draft<WeeklyBrief>({
      kind: "weekly",
      schema: weeklyBriefSchema,
      context: renderProjectContext(doc, [await weeklyContext(doc, project.id)]),
      instructions: `${DRAFT_VOICE}\n\nAnswer three questions about the period in the context, in the first person plural, each at most ${MAX} characters. landed is what landed in the period, next is what comes next, blocked is what is blocked or slow (say nothing is blocked if so). Plain sentences, no lists. Nothing the activity does not support; say the period was quiet if it was.`,
      ask: "Summarize this period.",
      maxTokens: 1024,
      effort: "low",
      fixture: {
        landed: `We kept building ${doc.name || "the project"} and the agent reported its sessions. (Fixture, no model key is set locally.)`,
        next: "The open build steps and the review passes.",
        blocked: "Nothing is blocked.",
      },
    });
    await recordDraftRun({ allowanceKey, projectId: project.id, kind: "weekly", inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens });
    const cut = (v: string) => cutAtWord(v.trim(), MAX);
    const value: WeeklyBrief = { landed: cut(result.value.landed), next: cut(result.value.next), blocked: cut(result.value.blocked) };
    return NextResponse.json({ value, remaining: Math.max(0, DRAFT_LIMITS.perOrgMonth - used - 1) });
  } catch (err) {
    if (err instanceof DraftError) {
      const status = err.code === "not_configured" ? 503 : err.code === "refusal" || err.code === "truncated" ? 422 : 502;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[updates] summarize failed", err);
    return NextResponse.json({ error: STUDIO_PLUS_COPY.draft.failed }, { status: 500 });
  }
}
