"use client";

import { useCallback, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { LAUNCH_NOT_LIVE, UNSUPPORTED_WALLETS, launchChain } from "@/content/launch";
import { DEFAULT_PROJECT_CHAIN, type ProjectChain } from "@/lib/chains";

/**
 * The hard network guard. Every write path MUST call ensureChain() and abort
 * if it returns false. A token lives on one chain (M54), and a transaction
 * for it is never submitted on any other, nor on a chain whose contracts are
 * not deployed yet. wagmi's switchChain prompts the wallet to
 * switch and falls back to wallet_addEthereumChain for unknown chains.
 * `switchError` carries a human-readable reason when the wallet refuses.
 */
export function useLaunchChain(chainKey: ProjectChain = DEFAULT_PROJECT_CHAIN) {
  const target = launchChain(chainKey);
  const { isConnected, chainId, address, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [switchError, setSwitchError] = useState<string | null>(null);

  const onCorrectChain = isConnected && chainId === target.chainId;

  const ensureChain = useCallback(async (): Promise<boolean> => {
    if (!isConnected) return false;
    if (!target.live) {
      setSwitchError(LAUNCH_NOT_LIVE(target.name));
      return false;
    }
    if (chainId === target.chainId) {
      setSwitchError(null);
      return true;
    }
    try {
      const result = await switchChainAsync({ chainId: target.chainId });
      setSwitchError(null);
      return result.id === target.chainId;
    } catch (err) {
      const known = connector?.id ? UNSUPPORTED_WALLETS[connector.id] : undefined;
      setSwitchError(
        known
          ? `${known}. Reconnect with MetaMask or Rabby to use ${target.name}.`
          : err instanceof Error
            ? `Wallet refused the network switch. ${err.message.split("\n")[0].slice(0, 120)}`
            : "Wallet refused the network switch.",
      );
      return false;
    }
  }, [isConnected, chainId, switchChainAsync, connector?.id, target]);

  return { isConnected, address, chainId, onCorrectChain, ensureChain, switchError, target };
}
