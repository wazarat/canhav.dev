import "server-only";

import { type Address, getAddress } from "viem";

import type { ProjectChain } from "@/lib/chains";
import { publicClientFor } from "@/lib/publicClient";
import { SAFE_ABI, TEAM_SAFE_LIMITS, type TeamSafe, isSafeAddress } from "@/lib/safe";

/**
 * Read a Safe onchain (M160): its owners and threshold, null when the
 * address holds no code or does not answer like a Safe. The record stores
 * what the chain says, never what a form claims.
 */
export async function readSafe(address: string, chain: ProjectChain): Promise<TeamSafe | null> {
  if (!isSafeAddress(address)) return null;
  const client = publicClientFor(chain);
  try {
    const checksummed = getAddress(address) as Address;
    const code = await client.getCode({ address: checksummed });
    if (!code || code === "0x") return null;
    const [owners, threshold] = await Promise.all([
      client.readContract({ address: checksummed, abi: SAFE_ABI, functionName: "getOwners" }),
      client.readContract({ address: checksummed, abi: SAFE_ABI, functionName: "getThreshold" }),
    ]);
    const list = (owners as readonly string[]).map((o) => o.toLowerCase());
    const t = Number(threshold);
    if (!list.length || list.length > TEAM_SAFE_LIMITS.owners.max || !Number.isInteger(t) || t < 1 || t > list.length) return null;
    return { address: address.toLowerCase(), owners: list, threshold: t, chain, verifiedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
