import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { getVerifiedWallets, isAuthConfigured } from "@/lib/auth";

/**
 * A team's members with the wallets on their CanHav accounts (M160), for
 * picking the owners of the team Safe. Clerk's organization API, cached a
 * minute per team; the wallets come from the same cache the launch
 * ownership check uses.
 */
export interface OrgMember {
  userId: string;
  name: string;
  imageUrl: string | null;
  /** Lowercase, verified on the account. */
  wallets: string[];
}

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; members: OrgMember[] }>();

export async function orgMembersWithWallets(orgId: string): Promise<OrgMember[]> {
  if (!isAuthConfigured()) return [];
  const hit = cache.get(orgId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.members;
  try {
    const client = await clerkClient();
    const list = await client.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 50 });
    const members: OrgMember[] = [];
    for (const m of list.data) {
      const u = m.publicUserData;
      if (!u?.userId) continue;
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.identifier || u.userId;
      members.push({ userId: u.userId, name, imageUrl: u.imageUrl ?? null, wallets: await getVerifiedWallets(u.userId) });
    }
    cache.set(orgId, { at: Date.now(), members });
    return members;
  } catch (err) {
    console.warn("organization members lookup failed", err);
    return hit?.members ?? [];
  }
}
