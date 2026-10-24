import "server-only";

import { type PlanInfo, planForOrgs } from "@/lib/plan";

/**
 * A project's plan is its team's plan (M134): the organization the row
 * belongs to, read through the subscription mirror with the Clerk fallback,
 * free when the project is personal. One rule for the editor, the API, the
 * MCP server, publish, the public readers and the alerts worker, so a
 * lapsed team's paid content closes everywhere at once.
 */
export async function orgPlan(orgId: string | null | undefined): Promise<PlanInfo> {
  return planForOrgs(orgId ? [orgId] : []);
}

export async function orgPlus(orgId: string | null | undefined): Promise<boolean> {
  return (await orgPlan(orgId)).plan === "studio_plus";
}

export async function projectPlan(row: { org_id?: string | null }): Promise<PlanInfo> {
  return orgPlan(row.org_id);
}

export async function projectPlus(row: { org_id?: string | null }): Promise<boolean> {
  return orgPlus(row.org_id);
}
