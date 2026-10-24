import "server-only";

import { mcpOwner } from "@/lib/mcp/register";
import type { PlusFeature } from "@/lib/plan-shared";
import { devForced, planForOrgs } from "@/lib/plan";

/**
 * The plan behind an MCP call (M106, M108). OAuth tokens carry no plan
 * claim and the machine auth object has no `has`, so the answer comes from
 * the caller's organizations (M107) through the subscription mirror. A
 * feature is granted with the plan; detaching one in the dashboard is
 * honoured on the session side only, since the mirror knows plans, not
 * features.
 */
export async function mcpAllowsPlus(ctx: unknown, _feature: PlusFeature | true, orgId?: string | null): Promise<boolean> {
  if (devForced()) return true;
  // A project scoped server reads the project's team (M134), the plan the
  // project has, whatever the caller's own organizations are.
  if (orgId !== undefined) return (await planForOrgs(orgId ? [orgId] : [])).plan === "studio_plus";
  const owner = mcpOwner(ctx);
  if (!owner) return false;
  const info = await planForOrgs(owner.orgIds);
  return info.plan === "studio_plus";
}
