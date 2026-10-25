"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, TextArea } from "@/components/ui/Input";
import { PROJECT_LIMITS } from "@/lib/ideation";

export interface WhyRow {
  name: string;
  why: string;
}

export interface WhyRowsCopy {
  label: string;
  hint?: string;
  namePlaceholder: string;
  whyPlaceholder: string;
  nameField: string;
  whyField: string;
  add: string;
  remove: string;
  none: string;
  limit: (max: number) => string;
}

/**
 * Rows of a name and why it exists (M153, F11 and F12): the name Input on
 * top, a growing TextArea for the why under it, Remove, Add at the end,
 * and the honest "None" as a checkbox rather than typed text. `beside`
 * renders a line beside a row's name (the testnet address on Decisions)
 * and `extra` extra fields under the why (the contract and holder of an
 * admin function). Counters follow the Field convention; limits come from
 * PROJECT_LIMITS.
 */
export function WhyRowsEditor<T extends WhyRow>({
  rows,
  none,
  onChange,
  max,
  copy,
  empty,
  beside,
  extra,
}: {
  rows: readonly T[];
  none: boolean;
  onChange: (rows: T[], none: boolean) => void;
  max: number;
  copy: WhyRowsCopy;
  empty: () => T;
  beside?: (row: T) => React.ReactNode;
  extra?: (row: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const L = PROJECT_LIMITS;
  const atMax = rows.length >= max;
  // An empty list shows one blank row to type into (M153); it is stored once something is typed.
  const shown: readonly T[] = rows.length || none ? rows : [empty()];
  const update = (i: number, patch: Partial<T>) => onChange(shown.map((r, j) => (j === i ? { ...r, ...patch } : r)), false);
  const fmt = (n: number) => n.toLocaleString("en-US");
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink-200">{copy.label}</span>
        {copy.hint ? <span className="text-xs text-ink-500">{copy.hint}</span> : null}
      </div>
      {!none ? (
        <div className="space-y-3">
          {shown.map((row, i) => {
            const whyLen = row.why.trim().length;
            return (
              <div key={i} className="space-y-2 rounded-lg border border-ink-700/40 p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Input
                      value={row.name}
                      onChange={(e) => update(i, { name: e.target.value } as Partial<T>)}
                      maxLength={L.whyEntryName.max}
                      placeholder={copy.namePlaceholder}
                      aria-label={copy.nameField}
                    />
                    {beside ? <div className="text-xs text-ink-400">{beside(row)}</div> : null}
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onChange(shown.filter((_, j) => j !== i), false)}>
                    {copy.remove}
                  </Button>
                </div>
                <Field label={copy.whyField} counter={fmt(whyLen)} range={`${fmt(L.whyEntryWhy.min)}–${fmt(L.whyEntryWhy.max)}`} counterMet={whyLen >= L.whyEntryWhy.min}>
                  <TextArea
                    rows={2}
                    value={row.why}
                    onChange={(e) => update(i, { why: e.target.value } as Partial<T>)}
                    maxLength={L.whyEntryWhy.max}
                    placeholder={copy.whyPlaceholder}
                    aria-label={copy.whyField}
                  />
                </Field>
                {extra ? extra(row, (patch) => update(i, patch)) : null}
              </div>
            );
          })}
          <Button type="button" size="sm" variant="outline" disabled={atMax} onClick={() => onChange([...shown, empty()], false)}>
            {copy.add}
          </Button>
          {atMax ? <p className="text-xs text-ink-500">{copy.limit(max)}</p> : null}
        </div>
      ) : null}
      {/* A list with its own none question elsewhere (the oracles, M182) passes empty none copy. */}
      {copy.none ? (
        <label className="flex items-start gap-2.5 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={none}
            onChange={(e) => onChange(e.target.checked ? [] : [...rows], e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-700 bg-ink-950 accent-electric-500"
          />
          {copy.none}
        </label>
      ) : null}
    </div>
  );
}
