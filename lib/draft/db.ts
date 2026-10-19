import "server-only";

import { getDb } from "@/lib/db";

/** The monthly allowance ledger (M112), one row per draft run. */
export async function countDraftsThisMonth(allowanceKey: string): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;
  try {
    const rows = await sql`
      select count(*)::int as n from launchpad.draft_runs
      where org_id = ${allowanceKey} and created_at >= date_trunc('month', now())
    `;
    return (rows[0] as { n: number } | undefined)?.n ?? 0;
  } catch {
    return 0;
  }
}

export async function recordDraftRun(input: {
  allowanceKey: string;
  projectId: string | null;
  kind: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  const sql = getDb();
  if (!sql) return;
  try {
    await sql`
      insert into launchpad.draft_runs (org_id, project_id, kind, input_tokens, output_tokens)
      values (${input.allowanceKey}, ${input.projectId}, ${input.kind}, ${input.inputTokens}, ${input.outputTokens})
    `;
  } catch (err) {
    console.error("[draft] record failed", err);
  }
}
