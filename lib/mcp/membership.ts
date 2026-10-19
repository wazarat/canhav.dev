import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { isAuthConfigured } from "@/lib/auth";

/**
 * The organizations an MCP caller belongs to (M107). An OAuth token names
 * the user only, so membership is looked up on the Backend API and kept
 * for a minute per user, which bounds the calls a busy agent makes.
 */
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; orgIds: string[] }>();

export async function orgIdsForUser(userId: string): Promise<string[]> {
  if (!isAuthConfigured()) return [];
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.orgIds;
  try {
    const client = await clerkClient();
    const list = await client.users.getOrganizationMembershipList({ userId, limit: 20 });
    const orgIds = list.data.map((m) => m.organization.id);
    cache.set(userId, { at: Date.now(), orgIds });
    return orgIds;
  } catch (err) {
    console.warn("organization lookup failed", err);
    return hit?.orgIds ?? [];
  }
}
