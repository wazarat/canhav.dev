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
export async function mcpAllowsPlus(ctx: unknown, _feature: PlusFeature | true): Promise<boolean> {
  if (devForced()) return true;
  const owner = mcpOwner(ctx);
  if (!owner) return false;
  const info = await planForOrgs(owner.orgIds);
  return info.plan === "studio_plus";
}
