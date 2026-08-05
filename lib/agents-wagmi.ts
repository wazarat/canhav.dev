import { createConfig, createStorage, http, noopStorage } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export { baseSepolia };

/**
 * Wallet config for the /agents subtree ONLY. Deliberately separate from
 * lib/wagmi.ts (the /launch config): each track's config knows exactly one
 * chain, so a write can never resolve to the other track's RPC — the wrong-
 * chain mint failure mode is structural, not just guarded. The distinct
 * storage key keeps the two configs from fighting over connector state;
 * connection state is per-track (same wallet, one extra click).
 */
export const agentsWagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
  storage: createStorage({
    key: "wagmi-agents",
    storage:
      typeof window !== "undefined" && window.localStorage ? window.localStorage : noopStorage,
  }),
  transports: {
    [baseSepolia.id]: http(),
  },
});
