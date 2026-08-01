"use client";

import { useCallback } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { LAUNCH_CHAIN } from "@/content/launch";

/**
 * The hard network guard. Every write path MUST call ensureChain() and abort
 * if it returns false — never submit a transaction on any chain other than
 * Robinhood Chain Testnet (46630). wagmi's switchChain prompts the wallet to
 * switch and falls back to wallet_addEthereumChain for unknown chains.
 */
export function useLaunchChain() {
  const { isConnected, chainId, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const onCorrectChain = isConnected && chainId === LAUNCH_CHAIN.chainId;

  const ensureChain = useCallback(async (): Promise<boolean> => {
    if (!isConnected) return false;
    if (chainId === LAUNCH_CHAIN.chainId) return true;
    try {
      const result = await switchChainAsync({ chainId: LAUNCH_CHAIN.chainId });
      return result.id === LAUNCH_CHAIN.chainId;
    } catch {
      return false;
    }
  }, [isConnected, chainId, switchChainAsync]);

  return { isConnected, address, chainId, onCorrectChain, ensureChain };
}
