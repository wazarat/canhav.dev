"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { Field, Input } from "@/components/ui/Input";
import { InfoTip } from "@/components/ui/InfoTip";
import { StatusChip } from "@/components/ui/StatusChip";
import { MAINNET_COPY } from "@/content/ideation";
import { type ProjectChain, chainInfo } from "@/lib/chains";
import { type MainnetContract, type MainnetRecord, PROJECT_LIMITS, mainnetRecordEmpty } from "@/lib/ideation";

/**
 * The mainnet deployment and the Pons pairing on the Reality step (M70).
 * Contracts as label and address rows, the companion contract as a chip per
 * accepted template with a Pons fit, and the Pons launch fields on a
 * Robinhood project. Emits undefined when nothing is recorded so the key is
 * never written, and always stamps the chain id the project's chain stands
 * in for.
 */
export function MainnetEditor({
  mainnet,
  chain,
  companionOptions,
  onChange,
}: {
  mainnet: MainnetRecord | undefined;
  chain: ProjectChain;
  /** Accepted templates with a Pons fit, the only companion choices. */
  companionOptions: ReadonlyArray<{ value: string; label: string }>;
  onChange: (next: MainnetRecord | undefined) => void;
}) {
  const L = PROJECT_LIMITS;
  const info = chainInfo(chain);
  const contracts = mainnet?.contracts ?? [];
  const atMax = contracts.length >= L.mainnetContracts.max;
  const emit = (patch: Partial<MainnetRecord>) => {
    const next: MainnetRecord = { chainId: info.mainnetChainId, contracts, ...(mainnet ?? {}), ...patch };
    next.chainId = info.mainnetChainId;
    onChange(mainnetRecordEmpty(next) ? undefined : next);
  };
  const updateContract = (i: number, patch: Partial<MainnetContract>) =>
    emit({ contracts: contracts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const pons = mainnet?.pons;
  const setPons = (patch: Partial<NonNullable<MainnetRecord["pons"]>>) => {
    const next = { tokenAddress: pons?.tokenAddress ?? "", feeRecipient: pons?.feeRecipient ?? "", ...patch };
    emit({ pons: next.tokenAddress || next.feeRecipient ? next : undefined });
  };

  return (
    <div className="space-y-4 rounded-xl border border-ink-800/70 p-4">
      <div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-200">
          {MAINNET_COPY.label}
          <InfoTip>{MAINNET_COPY.hint}</InfoTip>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <StatusChip tone="neutral">{MAINNET_COPY.chainLine(info.mainnetName, info.mainnetChainId)}</StatusChip>
        <InfoTip>{MAINNET_COPY.chainHint}</InfoTip>
      </div>

      <Field label={MAINNET_COPY.contractsLabel} info={MAINNET_COPY.contractsHint}>
        <div className="space-y-2">
          {contracts.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <Input
                value={c.label}
                onChange={(e) => updateContract(i, { label: e.target.value })}
                maxLength={L.mainnetLabel.max}
                placeholder={MAINNET_COPY.labelPlaceholder}
                aria-label={MAINNET_COPY.labelField}
                className="w-40 shrink-0"
              />
              <Input
                value={c.address}
                onChange={(e) => updateContract(i, { address: e.target.value.trim().toLowerCase() })}
                placeholder={MAINNET_COPY.addressPlaceholder}
                aria-label={MAINNET_COPY.addressField}
                className="flex-1 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => emit({ contracts: contracts.filter((_, j) => j !== i) })}
                aria-label={MAINNET_COPY.remove(c.label)}
                title={MAINNET_COPY.removeTitle}
                className="mt-1.5 rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={atMax}
            onClick={() => emit({ contracts: [...contracts, { label: "", address: "" }] })}
          >
            {MAINNET_COPY.add}
          </Button>
          {atMax ? <p className="text-xs text-ink-500">{MAINNET_COPY.limit(L.mainnetContracts.max)}</p> : null}
        </div>
      </Field>

      {companionOptions.length > 0 ? (
        <ChipRadioGroup
          label={MAINNET_COPY.companionLabel}
          info={MAINNET_COPY.companionHint}
          value={mainnet?.companionTemplate ?? ""}
          onChange={(v) => emit({ companionTemplate: v || undefined })}
          options={[...companionOptions, { value: "", label: MAINNET_COPY.companionClear }]}
        />
      ) : (
        <Field label={MAINNET_COPY.companionLabel} info={MAINNET_COPY.companionHint}>
          <StatusChip tone="neutral" variant="block">
            {MAINNET_COPY.companionNone}
          </StatusChip>
        </Field>
      )}

      {chain === "robinhood_testnet" ? (
        <Field label={MAINNET_COPY.ponsLabel} info={MAINNET_COPY.ponsHint}>
          <div className="space-y-2">
            <Input
              value={pons?.tokenAddress ?? ""}
              onChange={(e) => setPons({ tokenAddress: e.target.value.trim().toLowerCase() })}
              placeholder={MAINNET_COPY.addressPlaceholder}
              aria-label={MAINNET_COPY.ponsTokenLabel}
              className="font-mono text-xs"
            />
            <Input
              value={pons?.feeRecipient ?? ""}
              onChange={(e) => setPons({ feeRecipient: e.target.value.trim().toLowerCase() })}
              placeholder={MAINNET_COPY.addressPlaceholder}
              aria-label={MAINNET_COPY.ponsFeeLabel}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-ink-500">
              {MAINNET_COPY.ponsTokenLabel}, then {MAINNET_COPY.ponsFeeLabel.toLowerCase()}.
            </p>
          </div>
        </Field>
      ) : (
        <StatusChip tone="info" variant="block">
          {MAINNET_COPY.ponsOffChain(info.name)}
        </StatusChip>
      )}
    </div>
  );
}
