import "server-only";

import { createPublicClient, http } from "viem";

import { robinhoodTestnet } from "@/lib/chain";

/** Server-side RPC client for live chain reads (vesting progress, etc.). */
export const publicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(),
});
