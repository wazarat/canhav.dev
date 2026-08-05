"use client";

import { useCallback, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { AGENT_CHAIN, AGENTS_UNSUPPORTED_WALLETS } from "@/content/agents";

/**
 * The hard network guard for the /agents track. Every write path MUST call
 * ensureChain() and abort if it returns false — never submit a transaction on
 * any chain other than Base Sepolia (84532). The surrounding wagmi config only
 * knows this one chain, but the wallet itself can still sit on another chain
 * when signing; this guard closes that gap. (Copied from useLaunchChain — the
 * tracks keep separate wallet layers by design.)
 */
export function useAgentChain() {
  const { isConnected, chainId, address, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [switchError, setSwitchError] = useState<string | null>(null);

  const onCorrectChain = isConnected && chainId === AGENT_CHAIN.chainId;

  const ensureChain = useCallback(async (): Promise<boolean> => {
    if (!isConnected) return false;
    if (chainId === AGENT_CHAIN.chainId) {
      setSwitchError(null);
      return true;
    }
    try {
      const result = await switchChainAsync({ chainId: AGENT_CHAIN.chainId });
      setSwitchError(null);
      return result.id === AGENT_CHAIN.chainId;
    } catch (err) {
      const known = connector?.id ? AGENTS_UNSUPPORTED_WALLETS[connector.id] : undefined;
      setSwitchError(
        known
          ? `${known} — reconnect with MetaMask or Rabby to use ${AGENT_CHAIN.name}.`
          : err instanceof Error
            ? `Wallet refused the network switch: ${err.message.split("\n")[0].slice(0, 120)}`
            : "Wallet refused the network switch.",
      );
      return false;
    }
  }, [isConnected, chainId, switchChainAsync, connector?.id]);

  return { isConnected, address, chainId, onCorrectChain, ensureChain, switchError };
}
