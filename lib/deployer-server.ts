import "server-only";

import { formatEther } from "viem";

import { PROJECT_CHAINS, type ProjectChain } from "@/lib/chains";
import { publicClientFor } from "@/lib/publicClient";

export interface DeployerBalance {
  chain: ProjectChain;
  /** ETH as a decimal string, null when the RPC did not answer. */
  eth: string | null;
  /** True when the balance is above zero. */
  funded: boolean;
}

/** The deployer's native balance on every chain, one RPC read each, tolerant of an outage. */
export async function getDeployerBalances(address: string): Promise<DeployerBalance[]> {
  return Promise.all(
    PROJECT_CHAINS.map(async (chain) => {
      try {
        const wei = await publicClientFor(chain).getBalance({ address: address as `0x${string}` });
        return { chain, eth: formatEther(wei), funded: wei > 0n };
      } catch {
        return { chain, eth: null, funded: false };
      }
    }),
  );
}
