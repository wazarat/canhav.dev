"use client";

import { useCallback, useEffect, useState } from "react";

import type { ProjectChain } from "@/lib/chains";

export interface DeployerBalance {
  chain: ProjectChain;
  /** ETH as a decimal string, null when the RPC did not answer. */
  eth: string | null;
  funded: boolean;
}

export interface DeployerFunding {
  /** Null until the first answer, or when the route refused. */
  balances: DeployerBalance[] | null;
  loading: boolean;
  reload: () => Promise<void>;
  /** True when the address holds ETH on the given chain. */
  fundedOn: (chain: ProjectChain) => boolean;
  /** The chains the address holds ETH on. */
  fundedChains: ProjectChain[];
}

const POLL_MS = 30_000;

/**
 * The deployer key's balances (M103), read through the owner only route
 * and polled while the page is visible, so the state flips on its own once
 * the owner comes back from a faucet. One instance on the project page
 * feeds the Overview chip, the Launch row and the Deployments section.
 */
export function useDeployerBalances(projectId: string, address: string | null): DeployerFunding {
  const [balances, setBalances] = useState<DeployerBalance[] | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!address) {
      setBalances(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/deployer?address=${address}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { balances: DeployerBalance[] };
      setBalances(json.balances);
    } catch {
      setBalances(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, address]);

  useEffect(() => {
    void reload();
    if (!address) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, POLL_MS);
    // Coming back to the tab after the faucet reads at once.
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload, address]);

  const fundedChains = (balances ?? []).filter((b) => b.funded).map((b) => b.chain);
  return {
    balances,
    loading,
    reload,
    fundedOn: (chain) => fundedChains.includes(chain),
    fundedChains,
  };
}
