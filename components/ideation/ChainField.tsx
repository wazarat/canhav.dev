"use client";

import { SelectField } from "@/components/ui/Select";
import { CHAIN_COPY } from "@/content/ideation";
import { type ProjectChain, chainInfo, chainIsBeta, chainOptions, isProjectChain } from "@/lib/chains";

/**
 * The one chain control (M148), a dropdown with Robinhood testnet first and
 * Arbitrum Sepolia marked beta. Shared by the new project wizard, Decisions
 * and the launch form. A beta pick shows CHAIN_COPY.betaNote under the
 * field as plain text (no box, M137); `locked` disables the select and
 * explains why in the hint.
 */
export function ChainField({
  value,
  onChange,
  label = CHAIN_COPY.label,
  info = CHAIN_COPY.hint,
  hint,
  required,
  locked = false,
}: {
  value: ProjectChain;
  onChange: (chain: ProjectChain) => void;
  label?: string;
  info?: React.ReactNode;
  hint?: string;
  required?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="space-y-2">
      <SelectField
        label={label}
        required={required}
        info={info}
        hint={locked ? CHAIN_COPY.locked : hint}
        value={value}
        disabled={locked}
        onChange={(v) => {
          if (!locked && isProjectChain(v)) onChange(v);
        }}
        options={chainOptions()}
      />
      {chainIsBeta(value) ? (
        <p className="text-sm leading-relaxed text-ink-400">{CHAIN_COPY.betaNote(chainInfo(value).name)}</p>
      ) : null}
    </div>
  );
}
