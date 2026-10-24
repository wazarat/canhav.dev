"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, KeyRound, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { useCopyToClipboard } from "@/components/ui/useCopy";
import { BUILD_COPY } from "@/content/build";
import type { DeployerFunding } from "@/components/build/useDeployerBalances";
import { chainInfo, chainIsBeta } from "@/lib/chains";
import { DEPLOYER_ADDRESS, DEPLOYER_ENV_FILE_DEFAULT, type DeployerChainView, type DeployerView, deployerEnvLine } from "@/lib/deployer";
import { PROJECT_LIMITS, type TestnetContract } from "@/lib/ideation";

/**
 * The throwaway deployer key (M102). The key is generated in the browser
 * with viem and shown once; only the address goes to the draft. Balances
 * come from the owner only route, one RPC read per chain, with the faucet
 * link beside the project's chain (M148). Since M149 the env path is a
 * real, editable value, the address and the faucet row carry copy
 * controls, the fresh key can be downloaded as the env file, Replace asks
 * first, and when contracts are already recorded the card leads with the
 * address that deployed one of them (P1), read from the explorer.
 */
export function DeployerSection({
  projectId,
  deployer,
  funding,
  onAddress,
  envFile,
  onEnvFile,
  contracts = [],
}: {
  projectId: string;
  deployer: DeployerView | null;
  /** The balances the page polls (M103). */
  funding: DeployerFunding;
  /** Stores a lowercase address on the draft, or clears it with null. */
  onAddress: (address: string | null) => void;
  /** Where the key lives in the repository (M138), the recorded path or empty for the default. */
  envFile: string;
  onEnvFile: (path: string) => void;
  /** The recorded testnet contracts (M149): their creator is offered as the deployer when none is recorded. */
  contracts?: TestnetContract[];
}) {
  const C = BUILD_COPY.deployments.deployer;
  const file = envFile.trim() || DEPLOYER_ENV_FILE_DEFAULT;
  // The field shows a real value (M149, F1): the recorded path, else the default, and an emptied field falls back on blur.
  const [envDraft, setEnvDraft] = useState(file);
  useEffect(() => {
    setEnvDraft(envFile.trim() || DEPLOYER_ENV_FILE_DEFAULT);
  }, [envFile]);
  const envFileField = (
    <Field label={C.envFileLabel} hint={C.envFileHint}>
      <Input
        value={envDraft}
        onChange={(e) => {
          setEnvDraft(e.target.value);
          onEnvFile(e.target.value);
        }}
        onBlur={() => {
          if (!envDraft.trim()) {
            setEnvDraft(DEPLOYER_ENV_FILE_DEFAULT);
            onEnvFile(DEPLOYER_ENV_FILE_DEFAULT);
          }
        }}
        maxLength={PROJECT_LIMITS.deployerEnvFile.max}
        className="font-mono text-xs"
      />
    </Field>
  );
  const [working, setWorking] = useState(false);
  /** The key just made, kept only in this component until the owner says it is saved. */
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const { balances, loading, reload: load } = funding;

  const address = deployer?.address ?? null;
  const addressCopy = useCopyToClipboard(address ?? "");

  // The creator of a recorded contract (M149, P1), asked once while no deployer is recorded.
  const hasContracts = contracts.some((c) => DEPLOYER_ADDRESS.test(c.address.trim().toLowerCase()));
  const [creator, setCreator] = useState<{ address: string; label: string | null } | null | "unknown">(null);
  useEffect(() => {
    if (address || !hasContracts) return;
    let live = true;
    fetch(`/api/ideation/projects/${projectId}/deployer/creator`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { address?: string | null; contract?: { label: string | null } } | null) => {
        if (!live) return;
        setCreator(j?.address ? { address: j.address, label: j.contract?.label ?? null } : "unknown");
      })
      .catch(() => live && setCreator("unknown"));
    return () => {
      live = false;
    };
  }, [projectId, address, hasContracts]);

  async function create() {
    setWorking(true);
    try {
      const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");
      const key = generatePrivateKey();
      const account = privateKeyToAccount(key);
      setFreshKey(key);
      // The path the person sees is the path everyone reads (M149): store the default explicitly.
      if (!envFile.trim()) onEnvFile(DEPLOYER_ENV_FILE_DEFAULT);
      onAddress(account.address.toLowerCase());
    } finally {
      setWorking(false);
    }
  }

  function download() {
    if (!freshKey) return;
    const blob = new Blob([`${deployerEnvLine(freshKey)}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.split("/").pop() || DEPLOYER_ENV_FILE_DEFAULT;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const typedClean = typed.trim().toLowerCase();
  const canRecord = DEPLOYER_ADDRESS.test(typedClean);
  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  function fundingRow(c: DeployerChainView) {
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
        <button type="button" onClick={() => void addressCopy.copy()} className="inline-flex items-center gap-1 text-ink-300 transition-colors hover:text-ink-50">
          {addressCopy.copied ? <Check aria-hidden className="h-3 w-3 text-signal-400" /> : <Copy aria-hidden className="h-3 w-3" />}
          {addressCopy.copied ? "Copied" : C.pasteAddress}
        </button>
        <a href={c.faucetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-electric-300 transition-colors hover:text-electric-200">
          {C.fund} <ExternalLink aria-hidden className="h-3 w-3" />
        </a>
        <a href={`${c.explorerUrl}${address}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-ink-400 transition-colors hover:text-ink-100">
          {BUILD_COPY.deployments.explorer} <ExternalLink aria-hidden className="h-3 w-3" />
        </a>
      </li>
    );
  }

  const recordField = (
    <Field label={creator === "unknown" && hasContracts ? C.recordExisting : C.recordLabel}>
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
          variant={hasContracts && creator === "unknown" ? "primary" : "outline"}
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
  );

  if (!address) {
    // With contracts already recorded, recording the key that deployed them leads (M149, P1); a fresh key is the second path.
    const leadWithExisting = hasContracts;
    return (
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
        {creator && creator !== "unknown" ? (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-ink-200">{C.creatorFound(creator.label ?? short(creator.address), short(creator.address))}</p>
            <Button size="sm" onClick={() => onAddress(creator.address)}>
              {C.recordIt}
            </Button>
          </div>
        ) : null}
        {leadWithExisting ? recordField : null}
        <Button size="sm" variant={leadWithExisting ? "outline" : "primary"} onClick={() => void create()} disabled={working} aria-busy={working}>
          <KeyRound aria-hidden className="h-3.5 w-3.5" /> {working ? C.creating : C.create}
        </Button>
        {leadWithExisting ? null : recordField}
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
          <CopyBlock label={C.envLabel(file)} text={deployerEnvLine(freshKey)} hint={C.envHint} />
          {envFileField}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={download}>
              <Download aria-hidden className="h-3.5 w-3.5" /> {C.download}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFreshKey(null)}>
              {C.saved}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-ink-400">{C.address}</span>
        <span className="font-mono text-xs text-ink-100">
          <span className="sm:hidden">{short(address)}</span>
          <span className="hidden sm:inline">{address}</span>
        </span>
        <button
          type="button"
          onClick={() => void addressCopy.copy()}
          aria-label={`Copy ${C.address.toLowerCase()}`}
          className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-1.5 py-0.5 text-[11px] text-ink-300 transition-colors hover:text-ink-50"
        >
          {addressCopy.copied ? <Check aria-hidden className="h-3 w-3 text-signal-400" /> : <Copy aria-hidden className="h-3 w-3" />}
          {addressCopy.copied ? "Copied" : "Copy"}
        </button>
      </div>
      {/* The project's chain leads (M148); the other testnet folds away so nobody is nudged toward a faucet they do not need. */}
      <ul className="space-y-2">
        {deployer!.chains.filter((c) => c.chain === deployer!.projectChain).map((c) => fundingRow(c))}
      </ul>
      {chainIsBeta(deployer!.projectChain) ? (
        <p className="text-xs leading-relaxed text-ink-400">{C.betaFunding(chainInfo(deployer!.projectChain).name)}</p>
      ) : null}
      {deployer!.chains
        .filter((c) => c.chain !== deployer!.projectChain)
        .map((c) => (
          <Collapsible key={c.chain} summary={C.alsoOn(c.name)}>
            <ul className="space-y-2">{fundingRow(c)}</ul>
            {chainIsBeta(c.chain) ? <p className="mt-2 text-xs leading-relaxed text-ink-400">{C.betaFunding(c.name)}</p> : null}
          </Collapsible>
        ))}
      {freshKey ? null : envFileField}
      <p className="text-[11px] text-ink-500">
        {C.whereLine(file)} {C.agentLine}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden className="h-3.5 w-3.5" /> {C.refresh}
        </Button>
        {confirmReplace ? (
          <span className="inline-flex flex-wrap items-center gap-2 text-xs text-ink-300">
            {C.replaceConfirm}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConfirmReplace(false);
                setFreshKey(null);
                onAddress(null);
              }}
            >
              {C.replaceYes}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmReplace(false)}>
              {C.replaceNo}
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" title={C.replaceHint(file)} onClick={() => setConfirmReplace(true)}>
            {C.replace}
          </Button>
        )}
      </div>
    </div>
  );
}
