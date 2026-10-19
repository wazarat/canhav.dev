import "server-only";

import type { PlusFeature } from "@/lib/plan-shared";
import { devForced } from "@/lib/plan";

/**
 * The plan behind an MCP call (M106). OAuth tokens carry no plan claim and
 * the machine auth object has no `has`, so the answer comes from the
 * caller's organizations (M107) and the subscription mirror (M108). Until
 * those land only the dev override grants Studio+.
 */
export async function mcpAllowsPlus(_ctx: unknown, _feature: PlusFeature | true): Promise<boolean> {
  if (devForced()) return true;
  return false;
}
