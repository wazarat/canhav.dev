"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface ContractRow {
  label?: string;
  address: string;
}

export interface ContractRowsCopy {
  labelPlaceholder: string;
  addressPlaceholder: string;
  labelField: string;
  addressField: string;
  add: string;
  remove: (label: string) => string;
  removeTitle: string;
  limit: (max: number) => string;
}

/**
 * Label and address rows (M83), shared by the mainnet record and the
 * testnet contracts on the Reality step. Addresses are lowercased as typed;
 * the caller validates.
 */
export function ContractRowsEditor<T extends ContractRow>({
  rows,
  onChange,
  max,
  labelMax,
  copy,
  empty,
}: {
  rows: readonly T[];
  onChange: (rows: T[]) => void;
  max: number;
  labelMax: number;
  copy: ContractRowsCopy;
  /** A new row. */
  empty: () => T;
}) {
  const atMax = rows.length >= max;
  const update = (i: number, patch: Partial<ContractRow>) =>
    onChange(rows.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-2">
      {rows.map((c, i) => (
        <div key={i} className="flex items-start gap-2">
          <Input
            value={c.label ?? ""}
            onChange={(e) => update(i, { label: e.target.value })}
            maxLength={labelMax}
            placeholder={copy.labelPlaceholder}
            aria-label={copy.labelField}
            className="w-40 shrink-0"
          />
          <Input
            value={c.address}
            onChange={(e) => update(i, { address: e.target.value.trim().toLowerCase() })}
            placeholder={copy.addressPlaceholder}
            aria-label={copy.addressField}
            className="flex-1 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            aria-label={copy.remove(c.label ?? "")}
            title={copy.removeTitle}
            className="mt-1.5 rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
          >
            <Trash2 aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" disabled={atMax} onClick={() => onChange([...rows, empty()])}>
        {copy.add}
      </Button>
      {atMax ? <p className="text-xs text-ink-500">{copy.limit(max)}</p> : null}
    </div>
  );
}
