"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";

import { agentsWagmiConfig } from "@/lib/agents-wagmi";

/** Wallet context for the hidden /agents subtree only — its own single-chain
 *  wagmi config (Base Sepolia); the rest of the site stays wallet-free. */
export function AgentsProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={agentsWagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
