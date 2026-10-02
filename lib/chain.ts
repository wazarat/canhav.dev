import { type Chain, defineChain } from "viem";

import { LAUNCH_CHAINS, type LaunchChain } from "@/content/launch";
import { PROJECT_CHAINS, type ProjectChain } from "@/lib/chains";

/**
 * The chains this app talks to, one viem chain per entry of LAUNCH_CHAINS
 * (M54). Pure viem, safe to import from both the client wallet config and
 * server-side RPC clients. Every wallet write path must go through
 * useLaunchChain's ensureChain() (the hard network guard), which holds a
 * write to the one chain the token lives on.
 */
function toViem(c: LaunchChain): Chain {
  return defineChain({
    id: c.chainId,
    name: c.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [c.rpcUrl] } },
    blockExplorers: { default: { name: "Blockscout", url: c.explorerUrl } },
    testnet: true,
  });
}

export const VIEM_CHAINS: Record<ProjectChain, Chain> = Object.fromEntries(
  PROJECT_CHAINS.map((key) => [key, toViem(LAUNCH_CHAINS[key])]),
) as Record<ProjectChain, Chain>;

export function viemChainFor(key: ProjectChain): Chain {
  return VIEM_CHAINS[key];
}

export const robinhoodTestnet = VIEM_CHAINS.robinhood_testnet;
export const arbitrumSepolia = VIEM_CHAINS.arbitrum_sepolia;
