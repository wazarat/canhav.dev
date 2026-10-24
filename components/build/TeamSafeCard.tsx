"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { type Address, parseEventLogs } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";

import { ConnectButton } from "@/components/launch/ConnectButton";
import { LaunchProviders } from "@/components/launch/Providers";
import { useLaunchChain } from "@/components/launch/useLaunchChain";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Select, optionClasses } from "@/components/ui/Select";
import { BUILD_COPY } from "@/content/build";
import { launchChain } from "@/content/launch";
import { type ProjectChain, chainInfo } from "@/lib/chains";
import { explorerAddressUrl } from "@/lib/explorer";
import type { OrgMember } from "@/lib/org-members";
import { SAFE_1_4_1, SAFE_PROXY_FACTORY_ABI, TEAM_SAFE_LIMITS, type TeamSafe, isSafeAddress, majorityOf, safeSaltNonce, safeSetupData, thresholdLabel } from "@/lib/safe";
import { describeTxError, writeWithGas } from "@/lib/tx";

/**
 * The team Safe on Deployments (M160, F7), Studio+ team projects only.
 * With no Safe recorded: the team members who have a wallet on their
 * account as owners to tick, the threshold, and Create the team Safe,
 * which deploys a Safe v1.4.1 from the connected wallet through the
 * canonical factory on the project's testnet, then asks the server to
 * read the owners and threshold back from the chain and stores them on
 * the record; or Record an existing Safe by address, read the same way.
 * With one recorded: the sentence, the owners, the explorer link, Remove.
 * The wallet provider is mounted here alone, the rest of the studio stays
 * wallet free.
 */
export function TeamSafeCard({ projectId, chain, teamSafe, onChange, members: fixtureMembers }: { projectId: string; chain: ProjectChain; teamSafe: TeamSafe | undefined; onChange: (next: TeamSafe | undefined) => void; members?: OrgMember[] }) {
  return (
    <LaunchProviders>
      <Inner projectId={projectId} chain={chain} teamSafe={teamSafe} onChange={onChange} fixtureMembers={fixtureMembers} />
    </LaunchProviders>
  );
}

function Inner({ projectId, chain, teamSafe, onChange, fixtureMembers }: { projectId: string; chain: ProjectChain; teamSafe: TeamSafe | undefined; onChange: (next: TeamSafe | undefined) => void; fixtureMembers?: OrgMember[] }) {
  const C = BUILD_COPY.deployments.teamSafe;
  const net = launchChain(chain);
  const info = chainInfo(chain);
  const { isConnected, address, ensureChain, switchError } = useLaunchChain(chain);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: net.chainId });
  const [members, setMembers] = useState<OrgMember[] | null>(fixtureMembers ?? null);
  const [membersFailed, setMembersFailed] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [threshold, setThreshold] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<"idle" | "deploying" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);
  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  useEffect(() => {
    if (fixtureMembers || teamSafe) return;
    let live = true;
    fetch(`/api/ideation/projects/${projectId}/team/members`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { members: OrgMember[] }) => {
        if (!live) return;
        setMembers(d.members);
      })
      .catch(() => live && setMembersFailed(true));
    return () => {
      live = false;
    };
  }, [projectId, fixtureMembers, teamSafe]);

  // The creator's connected wallet is ticked when it belongs to a member.
  useEffect(() => {
    if (!members || !address) return;
    const mine = address.toLowerCase();
    if (members.some((m) => m.wallets.includes(mine))) setPicked((p) => (p.has(mine) ? p : new Set([...p, mine])));
  }, [members, address]);

  const ownerCount = picked.size;
  const effectiveThreshold = Math.min(threshold ?? majorityOf(ownerCount), Math.max(1, ownerCount));

  const verify = async (safeAddress: string) => {
    setState("verifying");
    const res = await fetch(`/api/ideation/projects/${projectId}/team/safe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: safeAddress }) });
    const json = (await res.json()) as { teamSafe?: TeamSafe; error?: string };
    setState("idle");
    if (!res.ok || !json.teamSafe) {
      setError(json.error ?? C.notASafe);
      return;
    }
    setError(null);
    onChange(json.teamSafe);
  };

  const deploy = async () => {
    setError(null);
    if (!(await ensureChain())) return;
    if (!publicClient || !address) return;
    const owners = [...picked] as Address[];
    if (!owners.length) return;
    setState("deploying");
    try {
      const hash = await writeWithGas(publicClient, address, writeContractAsync, {
        abi: SAFE_PROXY_FACTORY_ABI,
        address: SAFE_1_4_1.proxyFactory,
        functionName: "createProxyWithNonce",
        args: [SAFE_1_4_1.singletonL2, safeSetupData(owners, effectiveThreshold), safeSaltNonce()],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({ abi: SAFE_PROXY_FACTORY_ABI, eventName: "ProxyCreation", logs: receipt.logs });
      const proxy = logs[0]?.args.proxy;
      if (!proxy) {
        setState("idle");
        setError(C.noProxy);
        return;
      }
      await verify(proxy);
    } catch (err) {
      setState("idle");
      const k = describeTxError(err);
      setError(C.failed(k.kind === "revert" ? (k.reason ?? k.errorName ?? "The contract reverted.") : k.kind === "rejected" ? "The wallet rejected it." : k.kind === "insufficientFunds" ? "The wallet has no testnet ETH for gas." : "detail" in k ? k.detail : "The wallet could not send it."));
    }
  };

  if (teamSafe) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-200">
          {C.recorded(short(teamSafe.address), thresholdLabel(teamSafe), new Date(teamSafe.verifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}{" "}
          <a href={explorerAddressUrl(teamSafe.address, teamSafe.chain)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-electric-300 transition-colors hover:text-electric-200">
            {BUILD_COPY.deployments.explorer} <ExternalLink aria-hidden className="h-3 w-3" />
          </a>
        </p>
        <p className="text-xs text-ink-400">
          {C.ownersLabel}, {teamSafe.owners.map((o) => C.owner(short(o), members?.find((m) => m.wallets.includes(o))?.name ?? null)).join(", ")}.
        </p>
        <button type="button" onClick={() => onChange(undefined)} title={C.removeHint} className="text-xs text-ink-400 transition-colors hover:text-ink-50 hover:underline">
          {C.remove}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      {membersFailed ? <p className="text-xs text-ink-400">{C.noMembers}</p> : null}
      {members ? (
        <Field label={C.ownersLabel}>
          <ul className="space-y-1.5 text-sm">
            {members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-ink-200">{m.name}</span>
                {m.wallets.length ? (
                  m.wallets.map((w) => (
                    <label key={w} className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-300">
                      <input
                        type="checkbox"
                        checked={picked.has(w)}
                        disabled={!picked.has(w) && picked.size >= TEAM_SAFE_LIMITS.owners.max}
                        onChange={(e) => {
                          const next = new Set(picked);
                          if (e.target.checked) next.add(w);
                          else next.delete(w);
                          setPicked(next);
                        }}
                        className="h-3.5 w-3.5 rounded border-ink-700 bg-ink-950 accent-electric-500"
                      />
                      {short(w)}
                    </label>
                  ))
                ) : (
                  <span className="text-xs text-ink-500">{C.noWallet}</span>
                )}
              </li>
            ))}
          </ul>
        </Field>
      ) : null}
      {ownerCount > 0 ? (
        <Field label={C.thresholdLabel}>
          <div className="flex items-center gap-2">
            <Select value={String(effectiveThreshold)} onChange={(e) => setThreshold(Number(e.target.value))} className="w-24" aria-label={C.thresholdLabel}>
              {Array.from({ length: ownerCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)} className={optionClasses}>
                  {n}
                </option>
              ))}
            </Select>
            <span className="text-xs text-ink-400">{C.thresholdOf(ownerCount)}</span>
          </div>
        </Field>
      ) : null}
      <p className="text-xs leading-relaxed text-ink-400">
        {C.gas(info.name, "")}
        <a href={info.faucetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-electric-300 transition-colors hover:text-electric-200">
          {BUILD_COPY.deployments.deployer.fund} <ExternalLink aria-hidden className="h-3 w-3" />
        </a>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <ConnectButton chain={chain} />
        <Button size="sm" disabled={!isConnected || ownerCount === 0 || state !== "idle"} aria-busy={state !== "idle"} onClick={() => void deploy()}>
          {state === "deploying" ? C.creating : state === "verifying" ? C.verifying : C.create}
        </Button>
      </div>
      {!isConnected ? <p className="text-xs text-ink-500">{C.connect}</p> : null}
      {switchError ? <p className="text-xs text-rose-400">{switchError}</p> : null}
      <Field label={C.existingLabel}>
        <div className="flex flex-wrap gap-2">
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={C.existingPlaceholder} className="max-w-xs font-mono text-xs" />
          <Button size="sm" variant="outline" disabled={!isSafeAddress(typed.trim()) || state !== "idle"} onClick={() => void verify(typed.trim())}>
            {state === "verifying" ? C.verifying : C.record}
          </Button>
        </div>
      </Field>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
