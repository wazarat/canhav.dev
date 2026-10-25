"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { SendToAgent } from "@/components/build/SendToAgent";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, optionClasses } from "@/components/ui/Select";
import { VIABILITY_COPY } from "@/content/viability";
import { ASSET_LIMITS, ASSET_ROLES, type AssetEntry, type AssetRole, cleanSymbol, isAssetRole, shortAddress } from "@/lib/assets";
import { newItemId } from "@/lib/canvas-items";
import { formatDayShort } from "@/lib/format";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

interface Draft {
  id: string;
  symbol: string;
  role: AssetRole | "";
  address: string;
}

/**
 * The assets the idea depends on (M162). A saved row reads as one line,
 * the symbol, its role and the short address, with who filled it under it
 * (M137 plain text); Edit opens the inputs, a new row starts open and
 * lands on the record once it has a symbol and a role. The parent stamps
 * rows it saves as the owner's. Beside the list, the M141 style control
 * asks the agent to fill the assets from the code or copies the prompt.
 */
export function AssetsEditor({
  assets,
  onChange,
  prompt,
  canQueue,
  full,
  queuedAt,
  onQueue,
  onCancelQueue,
}: {
  assets: readonly AssetEntry[];
  onChange: (rows: AssetEntry[]) => void;
  /** The prompt the copy option carries. */
  prompt: string;
  /** An agent has worked on the project and writes are not off. */
  canQueue: boolean;
  /** The request cap is reached. */
  full: boolean;
  /** ISO time the open request was made, undefined when none. */
  queuedAt?: string;
  onQueue: () => void;
  onCancelQueue: () => void;
}) {
  const A = VIABILITY_COPY.assets;
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const atMax = assets.length + drafts.filter((d) => !assets.some((a) => a.id === d.id)).length >= ASSET_LIMITS.max;

  const openRow = (a: AssetEntry) => setDrafts((d) => (d.some((x) => x.id === a.id) ? d : [...d, { id: a.id, symbol: a.symbol, role: a.role, address: a.address ?? "" }]));
  const closeRow = (id: string) => setDrafts((d) => d.filter((x) => x.id !== id));
  const setDraft = (id: string, patch: Partial<Draft>) => setDrafts((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addRow = () => setDrafts((d) => [...d, { id: newItemId(), symbol: "", role: "", address: "" }]);
  const ready = (d: Draft) => Boolean(cleanSymbol(d.symbol)) && isAssetRole(d.role) && (d.address.trim() === "" || ADDRESS.test(d.address.trim()));
  const save = (d: Draft) => {
    if (!ready(d) || !isAssetRole(d.role)) return;
    const row: AssetEntry = { id: d.id, symbol: cleanSymbol(d.symbol), role: d.role, ...(d.address.trim() ? { address: d.address.trim().toLowerCase() } : {}) };
    const cur = assets.find((a) => a.id === d.id);
    const next = cur ? assets.map((a) => (a.id === d.id ? { ...a, ...row } : a)) : [...assets, row];
    onChange(next);
    closeRow(d.id);
  };
  const remove = (id: string) => {
    closeRow(id);
    if (assets.some((a) => a.id === id)) onChange(assets.filter((a) => a.id !== id));
  };

  const filled = (a: AssetEntry): string | null => {
    if (!a.recordedBy) return null;
    return A.filledBy[a.recordedBy](a.recordedAt ? formatDayShort(a.recordedAt) : "");
  };

  const rows: Array<{ saved: AssetEntry | null; draft: Draft | null }> = [
    ...assets.map((a) => ({ saved: a, draft: drafts.find((d) => d.id === a.id) ?? null })),
    ...drafts.filter((d) => !assets.some((a) => a.id === d.id)).map((d) => ({ saved: null, draft: d })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-ink-400">{A.lead}</p>
        <div className="flex flex-col items-end gap-1 text-xs">
          <SendToAgent label={A.send} queueLabel={A.queue} copyLabel={A.copyPrompt} prompt={prompt} canQueue={canQueue} full={full} onQueue={onQueue} />
          {queuedAt ? (
            <p className="text-ink-400">
              {A.queuedSince(new Date(queuedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))}{" "}
              <button type="button" onClick={onCancelQueue} className="text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline">
                {A.cancel}
              </button>
            </p>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? <p className="text-sm text-ink-500">{A.empty}</p> : null}

      <div className="space-y-2">
        {rows.map(({ saved, draft }) => {
          if (draft) {
            return (
              <div key={draft.id} className="grid gap-2 sm:grid-cols-[8rem_11rem_minmax(0,1fr)_auto] sm:items-start">
                <Input value={draft.symbol} onChange={(e) => setDraft(draft.id, { symbol: e.target.value.toUpperCase() })} maxLength={ASSET_LIMITS.symbol.max} placeholder={A.symbolPlaceholder} aria-label={A.symbol} autoFocus={!saved} />
                <Select value={draft.role} muted={!draft.role} onChange={(e) => setDraft(draft.id, { role: e.target.value as AssetRole | "" })} aria-label={A.role}>
                  <option value="" disabled>
                    {A.rolePlaceholder}
                  </option>
                  {ASSET_ROLES.map((r) => (
                    <option key={r} value={r} className={optionClasses}>
                      {A.roles[r]}
                    </option>
                  ))}
                </Select>
                <Input value={draft.address} onChange={(e) => setDraft(draft.id, { address: e.target.value.trim() })} placeholder={A.addressPlaceholder} aria-label={A.address} className="font-mono text-xs" />
                <div className="flex items-center gap-2 sm:pt-2">
                  <button type="button" disabled={!ready(draft)} onClick={() => save(draft)} className="text-xs text-ink-300 transition-colors hover:text-ink-50 hover:underline disabled:cursor-not-allowed disabled:text-ink-600 disabled:no-underline">
                    {A.done}
                  </button>
                  <button type="button" onClick={() => remove(draft.id)} aria-label={A.remove(draft.symbol)} className="rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100">
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          }
          if (!saved) return null;
          const line = filled(saved);
          return (
            <div key={saved.id} className="flex items-start justify-between gap-3 rounded-lg border border-ink-700/40 px-3 py-2">
              <div className="min-w-0 space-y-0.5 text-sm">
                <p className="text-ink-100">
                  <span className="font-medium">{saved.symbol}</span>
                  <span className="text-ink-400">{` · ${A.roles[saved.role]}`}</span>
                  {saved.address ? (
                    <span className="font-mono text-xs text-ink-400">
                      <span className="whitespace-nowrap sm:hidden">{` · ${shortAddress(saved.address)}`}</span>
                      <span className="hidden sm:inline">{` · ${saved.address}`}</span>
                    </span>
                  ) : null}
                </p>
                {line ? <p className="text-xs text-ink-400">{line}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => openRow(saved)} className="text-xs text-ink-300 transition-colors hover:text-ink-50 hover:underline">
                  {A.edit}
                </button>
                <button type="button" onClick={() => remove(saved.id)} aria-label={A.remove(saved.symbol)} className="rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100">
                  <Trash2 aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" variant="outline" disabled={atMax} onClick={addRow}>
          {A.add}
        </Button>
        {atMax ? <p className="text-xs text-ink-500">{A.limit(ASSET_LIMITS.max)}</p> : null}
        <p className="text-xs text-ink-500">{A.addressHint}</p>
      </div>
    </div>
  );
}
