import "server-only";

import type { CheckRunView, CheckTool } from "@/lib/checks/schema";
import { getDb } from "@/lib/db";

/** Storage for check runs (M121). The newest run per tool is what the studio shows. */
export async function recordCheckRun(input: { projectId: string; tool: CheckTool; commitSha: string | null; runUrl: string | null; result: "pass" | "fail" | "error"; summary: Record<string, unknown> }): Promise<string | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      insert into launchpad.check_runs (project_id, tool, commit_sha, run_url, summary, result)
      values (${input.projectId}, ${input.tool}, ${input.commitSha}, ${input.runUrl}, ${JSON.stringify(input.summary)}, ${input.result})
      returning id
    `;
    return (rows[0] as { id: string } | undefined)?.id ?? null;
  } catch (err) {
    console.error("[checks] record failed", err);
    return null;
  }
}

/** The newest run per tool, newest first. */
export async function latestCheckRuns(projectId: string): Promise<CheckRunView[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = await sql`
      select distinct on (tool) id, tool, commit_sha, run_url, summary, result, created_at
      from launchpad.check_runs where project_id = ${projectId}
      order by tool, created_at desc
    `;
    return (rows as Array<{ id: string; tool: CheckTool; commit_sha: string | null; run_url: string | null; summary: Record<string, unknown>; result: "pass" | "fail" | "error"; created_at: string | Date }>)
      .map((r) => ({ id: r.id, tool: r.tool, commitSha: r.commit_sha, runUrl: r.run_url, result: r.result, summary: r.summary, createdAt: new Date(r.created_at).toISOString() }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}
