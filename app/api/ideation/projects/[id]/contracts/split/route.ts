import { NextResponse } from "next/server";
import { z } from "zod";

import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { DraftError, draft } from "@/lib/draft/anthropic";
import { DRAFT_VOICE } from "@/lib/draft/context";
import { countDraftsThisMonth, recordDraftRun } from "@/lib/draft/db";
import { DRAFT_LIMITS } from "@/lib/draft/limits";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { PROJECT_LIMITS, type ContractEntry } from "@/lib/ideation";
import { cutAtWord } from "@/lib/text";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({ rows: z.array(z.object({ name: z.string(), why: z.string() })) });

/** A plain split for the fixture: one row per comma or semicolon at the top level, the name before any bracket. */
function fixtureRows(text: string): ContractEntry[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === ";") && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts
    .map((p) => p.trim().replace(/^and\s+/i, ""))
    .filter((p) => p.length > 3)
    .map((p) => {
      const m = p.match(/^([^(]+)\((.*)\)\s*\.?$/);
      return m ? { name: m[1].trim(), why: m[2].trim() } : { name: p.split(/\s+/).slice(0, 3).join(" "), why: p };
    });
}

/**
 * Split the contracts paragraph from before the rows (M182) into one row per
 * contract, on the low-cost model. Never writes; the Decisions tab puts the
 * rows on the record and drops the paragraph. Counts against the team's
 * monthly drafts. Studio+, like every CanHav draft.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "bmc");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const text = project.draft_doc.architecture.contractsLegacy?.trim();
  if (!text) return NextResponse.json({ error: "There is no earlier answer to split." }, { status: 400 });
  const allowanceKey = project.org_id ?? gate.id;
  const used = await countDraftsThisMonth(allowanceKey);
  if (used >= DRAFT_LIMITS.perOrgMonth)
    return NextResponse.json({ error: STUDIO_PLUS_COPY.draft.capReached, used, remaining: 0 }, { status: 429 });
  const L = PROJECT_LIMITS;
  try {
    const result = await draft({
      kind: "weekly",
      schema,
      context: `## The team's contracts paragraph\n\n${text}`, // copy-ok, model context
      instructions: `${DRAFT_VOICE}\n\nSplit the paragraph into one row per smart contract it names. name is the contract name as written, at most ${L.whyEntryName.max} characters. why is one sentence on what that contract does or why it exists, from the paragraph, at most ${L.whyEntryWhy.max} characters. Keep every contract the paragraph names, in its order, and add none it does not name. Tooling, test counts and plans that are not contracts are left out.`,
      ask: "Split this into one row per contract.",
      maxTokens: 2048,
      effort: "low",
      fixture: { rows: fixtureRows(text) },
    });
    await recordDraftRun({ allowanceKey, projectId: project.id, kind: "contracts_split", inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens });
    const rows = result.value.rows
      .map((r) => ({ name: cutAtWord(r.name.trim(), L.whyEntryName.max), why: cutAtWord(r.why.trim(), L.whyEntryWhy.max) }))
      .filter((r) => r.name.length >= L.whyEntryName.min)
      .slice(0, L.whyEntries.max);
    return NextResponse.json({ rows, remaining: Math.max(0, DRAFT_LIMITS.perOrgMonth - used - 1) });
  } catch (err) {
    if (err instanceof DraftError) {
      const status = err.code === "not_configured" ? 503 : err.code === "refusal" || err.code === "truncated" ? 422 : 502;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[contracts] split failed", err);
    return NextResponse.json({ error: STUDIO_PLUS_COPY.draft.failed }, { status: 500 });
  }
}
