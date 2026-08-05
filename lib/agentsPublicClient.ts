import "server-only";

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

/** Server-side RPC client for live /agents reads (registry status, etc.).
 *  AGENTS_RPC_URL unset → viem's default public endpoint for the chain. */
export const agentsPublicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.AGENTS_RPC_URL || undefined),
});
