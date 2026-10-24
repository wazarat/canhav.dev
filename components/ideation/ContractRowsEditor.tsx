"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCopyToClipboard } from "@/components/ui/useCopy";

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
  edit: string;
  done: string;
  limit: (max: number) => string;
}

const ADDRESS = /^0x[0-9a-f]{40}$/i;

function AddressCopy({ address }: { address: string }) {
  const { copied, copy } = useCopyToClipboard(address);
  return (
    <button type="button" onClick={() => void copy()} aria-label="Copy address" className="inline-flex items-center gap-1 text-ink-400 transition-colors hover:text-ink-50">
      {copied ? <Check aria-hidden className="h-3 w-3 text-signal-400" /> : <Copy aria-hidden className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * Label and address rows (M83), shared by the mainnet record and the
 * testnet contracts. Since M150 a saved row reads as text (the label
 * wraps, the address links to the explorer and copies) with Edit and
 * Remove, and only a row being edited, or a new one, shows its inputs.
 * `meta` renders a line under a row, the provenance on Deployments.
 * Addresses are lowercased as typed; the caller validates.
 */
export function ContractRowsEditor<T extends ContractRow>({
  rows,
  onChange,
  max,
  labelMax,
  copy,
  empty,
  linkFor,
  meta,
}: {
  rows: readonly T[];
  onChange: (rows: T[]) => void;
  max: number;
  labelMax: number;
  copy: ContractRowsCopy;
  /** A new row. */
  empty: () => T;
  /** The explorer URL of an address (M150), when the chain is known. */
  linkFor?: (address: string) => string;
  /** One line of plain text under a saved row (M150), null for none. */
  meta?: (row: T) => string | null;
}) {
  const atMax = rows.length >= max;
  const [editing, setEditing] = useState<Set<number>>(() => new Set());
  const update = (i: number, patch: Partial<ContractRow>) =>
    onChange(rows.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => {
    onChange(rows.filter((_, j) => j !== i));
    setEditing((s) => new Set([...s].filter((j) => j !== i).map((j) => (j > i ? j - 1 : j))));
  };
  const toggle = (i: number, on: boolean) =>
    setEditing((s) => {
      const next = new Set(s);
      if (on) next.add(i);
      else next.delete(i);
      return next;
    });
  return (
    <div className="space-y-2">
      {rows.map((c, i) => {
        const open = editing.has(i) || !ADDRESS.test(c.address);
        const line = meta?.(c) ?? null;
        return open ? (
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
            {ADDRESS.test(c.address) ? (
              <button type="button" onClick={() => toggle(i, false)} className="mt-2 text-xs text-ink-300 transition-colors hover:text-ink-50 hover:underline">
                {copy.done}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={copy.remove(c.label ?? "")}
              title={copy.removeTitle}
              className="mt-1.5 rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
            >
              <Trash2 aria-hidden className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-ink-700/40 px-3 py-2">
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {c.label?.trim() ? <span className="break-words font-medium text-ink-100">{c.label}</span> : null}
                {linkFor ? (
                  <a href={linkFor(c.address)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-electric-300 transition-colors hover:text-electric-200">
                    <span className="sm:hidden">{`${c.address.slice(0, 6)}…${c.address.slice(-4)}`}</span>
                    <span className="hidden sm:inline">{c.address}</span>
                    <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="font-mono text-ink-300">
                    <span className="sm:hidden">{`${c.address.slice(0, 6)}…${c.address.slice(-4)}`}</span>
                    <span className="hidden sm:inline">{c.address}</span>
                  </span>
                )}
                <AddressCopy address={c.address} />
              </div>
              {line ? <p className="text-xs text-ink-400">{line}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => toggle(i, true)} className="text-xs text-ink-300 transition-colors hover:text-ink-50 hover:underline">
                {copy.edit}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={copy.remove(c.label ?? "")}
                title={copy.removeTitle}
                className="rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
      <Button type="button" size="sm" variant="outline" disabled={atMax} onClick={() => onChange([...rows, empty()])}>
        {copy.add}
      </Button>
      {atMax ? <p className="text-xs text-ink-500">{copy.limit(max)}</p> : null}
    </div>
  );
}
