import { defineChain } from "viem";

import { LAUNCH_CHAIN } from "@/content/launch";

/**
 * The ONLY chain this app knows. Pure viem — safe to import from both the
 * client wallet config and server-side RPC clients. Every wallet write path
 * must go through useLaunchChain's ensureChain() (the hard network guard).
 */
export const robinhoodTestnet = defineChain({
  id: LAUNCH_CHAIN.chainId,
  name: LAUNCH_CHAIN.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: LAUNCH_CHAIN.explorerUrl },
  },
  testnet: true,
});
