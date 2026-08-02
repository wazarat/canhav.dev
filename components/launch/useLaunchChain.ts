"use client";

import { useCallback, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { LAUNCH_CHAIN, UNSUPPORTED_WALLETS } from "@/content/launch";

/**
 * The hard network guard. Every write path MUST call ensureChain() and abort
 * if it returns false — never submit a transaction on any chain other than
 * Robinhood Chain Testnet (46630). wagmi's switchChain prompts the wallet to
 * switch and falls back to wallet_addEthereumChain for unknown chains.
 * `switchError` carries a human-readable reason when the wallet refuses.
 */
export function useLaunchChain() {
  const { isConnected, chainId, address, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [switchError, setSwitchError] = useState<string | null>(null);

  const onCorrectChain = isConnected && chainId === LAUNCH_CHAIN.chainId;

  const ensureChain = useCallback(async (): Promise<boolean> => {
    if (!isConnected) return false;
    if (chainId === LAUNCH_CHAIN.chainId) {
      setSwitchError(null);
      return true;
    }
    try {
      const result = await switchChainAsync({ chainId: LAUNCH_CHAIN.chainId });
      setSwitchError(null);
      return result.id === LAUNCH_CHAIN.chainId;
    } catch (err) {
      const known = connector?.id ? UNSUPPORTED_WALLETS[connector.id] : undefined;
      setSwitchError(
        known
          ? `${known} — reconnect with MetaMask or Rabby to use ${LAUNCH_CHAIN.name}.`
          : err instanceof Error
            ? `Wallet refused the network switch: ${err.message.split("\n")[0].slice(0, 120)}`
            : "Wallet refused the network switch.",
      );
      return false;
    }
  }, [isConnected, chainId, switchChainAsync, connector?.id]);

  return { isConnected, address, chainId, onCorrectChain, ensureChain, switchError };
}
