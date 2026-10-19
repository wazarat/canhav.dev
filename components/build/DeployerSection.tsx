"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, KeyRound, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import type { ProjectChain } from "@/lib/chains";
import { DEPLOYER_ADDRESS, type DeployerView, deployerEnvLine } from "@/lib/deployer";

interface Balance {
  chain: ProjectChain;
  eth: string | null;
  funded: boolean;
}

/**
 * The throwaway deployer key (M102). The key is generated in the browser
 * with viem and shown once; only the address goes to the draft. Balances
 * come from the owner only route, one RPC read per chain, with the faucet
 * link beside each.
 */
export function DeployerSection({
  projectId,
  deployer,
  onAddress,
}: {
  projectId: string;
  deployer: DeployerView | null;
  /** Stores a lowercase address on the draft, or clears it with null. */
  onAddress: (address: string | null) => void;
}) {
  const C = BUILD_COPY.deployments.deployer;
  const [working, setWorking] = useState(false);
  /** The key just made, kept only in this component until the owner says it is saved. */
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [loading, setLoading] = useState(false);

  const address = deployer?.address ?? null;

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/deployer?address=${address}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { balances: Balance[] };
      setBalances(json.balances);
    } catch {
      setBalances(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, address]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setWorking(true);
    try {
      const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");
      const key = generatePrivateKey();
      const account = privateKeyToAccount(key);
      setFreshKey(key);
      onAddress(account.address.toLowerCase());
    } finally {
      setWorking(false);
    }
  }

  const typedClean = typed.trim().toLowerCase();
  const canRecord = DEPLOYER_ADDRESS.test(typedClean);

  if (!address) {
    return (
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
        <Button size="sm" onClick={() => void create()} disabled={working} aria-busy={working}>
          <KeyRound aria-hidden className="h-3.5 w-3.5" /> {working ? C.creating : C.create}
        </Button>
        <Field label={C.recordLabel}>
          <div className="flex flex-wrap gap-2">
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={C.recordPlaceholder}
              className="max-w-xs font-mono text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canRecord) {
                  e.preventDefault();
                  onAddress(typedClean);
                  setTyped("");
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!canRecord}
              onClick={() => {
                onAddress(typedClean);
                setTyped("");
              }}
            >
              {C.record}
            </Button>
          </div>
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {freshKey ? (
        <div className="space-y-3 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
          <StatusChip tone="warning" variant="block">
            {C.made}
          </StatusChip>
          <CopyBlock label={C.envLabel} text={deployerEnvLine(freshKey)} hint={C.envHint} />
          <Button size="sm" variant="outline" onClick={() => setFreshKey(null)}>
            {C.saved}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-ink-400">{C.address}</span>
        <span className="font-mono text-xs text-ink-100">{address}</span>
      </div>
      <ul className="space-y-2">
        {deployer!.chains.map((c) => {
          const b = balances?.find((x) => x.chain === c.chain);
          return (
            <li key={c.chain} className="flex flex-wrap items-center gap-3 text-xs">
              <span className="w-40 shrink-0 text-ink-300">{c.name}</span>
              {b ? (
                <StatusChip tone={b.funded ? "success" : "warning"} className="px-2 py-0.5 text-[11px]">
                  {b.eth === null ? C.balanceUnknown : `${b.funded ? C.funded : C.empty}, ${Number(b.eth).toFixed(4)} ETH`}
                </StatusChip>
              ) : (
                <StatusChip tone="neutral" className="px-2 py-0.5 text-[11px]">
                  {loading ? "…" : C.balanceUnknown}
                </StatusChip>
              )}
              <a href={c.faucetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-electric-300 transition-colors hover:text-electric-200">
                {C.fund} <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
              <a href={`${c.explorerUrl}${address}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-ink-400 transition-colors hover:text-ink-100">
                {BUILD_COPY.deployments.explorer} <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-ink-500">
        {C.whereLine} {C.agentLine}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden className="h-3.5 w-3.5" /> {C.refresh}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          title={C.replaceHint}
          onClick={() => {
            setFreshKey(null);
            setBalances(null);
            onAddress(null);
          }}
        >
          {C.replace}
        </Button>
      </div>
    </div>
  );
}
