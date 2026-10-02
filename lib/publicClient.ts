import "server-only";

import { type PublicClient, createPublicClient, http } from "viem";

import { VIEM_CHAINS } from "@/lib/chain";
import { DEFAULT_PROJECT_CHAIN, PROJECT_CHAINS, type ProjectChain } from "@/lib/chains";

const CLIENTS = Object.fromEntries(
  PROJECT_CHAINS.map((key) => [key, createPublicClient({ chain: VIEM_CHAINS[key], transport: http() })]),
) as Record<ProjectChain, PublicClient>;

/** Server-side RPC client for live reads on one chain (vesting progress, etc.). */
export function publicClientFor(chain: ProjectChain = DEFAULT_PROJECT_CHAIN): PublicClient {
  return CLIENTS[chain];
}
