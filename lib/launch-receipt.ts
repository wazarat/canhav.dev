import "server-only";

import { type Abi, type Hex, decodeEventLog } from "viem";

import { LIVE_LAUNCH_CHAINS, launchChain } from "@/content/launch";
import { curveLauncherAbi } from "@/lib/abi/curveLauncher";
import { tokenFactoryAbi } from "@/lib/abi/tokenFactory";
import type { ProjectChain } from "@/lib/chains";
import { publicClientFor } from "@/lib/publicClient";

/** What a launch transaction proves on its own, with no indexer involved. */
export interface ReceiptLaunch {
  address: string;
  creator: string;
  name: string;
  /** Unix seconds of the launch block, as a string like the indexer's. */
  blockTimestamp: string;
  chain: ProjectChain;
}

async function readOn(chain: ProjectChain, txHash: Hex): Promise<ReceiptLaunch | null> {
  const net = launchChain(chain);
  const client = publicClientFor(chain);
  const launchers: Array<{ address: string; abi: Abi }> = [
    { address: net.curveAddress.toLowerCase(), abi: curveLauncherAbi as Abi },
    { address: net.factoryAddress.toLowerCase(), abi: tokenFactoryAbi as Abi },
  ];
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") return null;
    for (const log of receipt.logs) {
      const launcher = launchers.find((l) => l.address === log.address.toLowerCase());
      if (!launcher) continue;
      try {
        const decoded = decodeEventLog({ abi: launcher.abi, data: log.data, topics: log.topics });
        if (decoded.eventName !== "TokenLaunched") continue;
        const args = decoded.args as unknown as { token: string; creator: string; name: string };
        const block = await client.getBlock({ blockNumber: receipt.blockNumber });
        return {
          address: args.token.toLowerCase(),
          creator: args.creator.toLowerCase(),
          name: args.name,
          blockTimestamp: block.timestamp.toString(),
          chain,
        };
      } catch {
        // not a launch event
      }
    }
  } catch {
    // no such transaction on this chain, or its RPC is down
  }
  return null;
}

/**
 * The launch a transaction made, read from the chain's own receipt. Only a
 * TokenLaunched event from the current curve launcher or factory of a live
 * chain counts. Null when the transaction is not a launch, or no chain could
 * answer, in which case the caller falls back to the indexer.
 */
export async function launchFromReceipt(txHash: string): Promise<ReceiptLaunch | null> {
  const reads = await Promise.all(LIVE_LAUNCH_CHAINS.map((c) => readOn(c, txHash as Hex)));
  return reads.find((r) => r !== null) ?? null;
}
