"use client";

import { Field } from "@/components/ui/Input";
import { SoonBadge } from "@/components/ui/SoonBadge";
import { cn } from "@/lib/utils";

/**
 * Chip choosers (flat, rounded-md since M74), lifted into ui so the project
 * and token editors share one look. Full width rows live in ChoiceCard.tsx. An option with
 * `available: false` renders dimmed, disabled, and carries a SoonBadge. An
 * option with `disabled: true` renders dimmed and disabled with its
 * `disabledNote` beside it, and stays on the cards (the testnet gate, M41).
 *
 * ChipMultiSelect: zero or more values, optional `max` (extra clicks are
 * ignored, never an error). ChipRadioGroup: exactly one value or "".
 */
export interface ChipOption<V extends string> {
  value: V;
  label: string;
  available?: boolean;
  /** Row heading in ChoiceCardGroups. Falls back to `label`. */
  title?: string;
  /** Sentence under the row heading in ChoiceCardGroups. */
  sentence?: string;
  /** Shown but not clickable, with `disabledNote` beside it (the testnet gate). Unlike `available: false` it stays on the cards. */
  disabled?: boolean;
  disabledNote?: string;
  /** A short remark beside an option that can still be picked (M52). */
  note?: string;
}

/** Flat chips (M74): rounded-md, a hairline when off, an electric border when on. */
const CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors";
const CHIP_ON = "border-electric-500 bg-electric-500/10 text-electric-300";
const CHIP_OFF = "border-ink-700/60 bg-ink-900 text-ink-200 hover:border-ink-500 hover:text-ink-50";
const CHIP_SOON = "cursor-not-allowed border-ink-800/70 text-ink-500 opacity-60";

function Chip({
  selected,
  soon,
  disabled = false,
  note,
  label,
  onToggle,
  role,
}: {
  selected: boolean;
  soon: boolean;
  disabled?: boolean;
  note?: string;
  label: string;
  onToggle: () => void;
  role: "checkbox" | "radio";
}) {
  const off = soon || disabled;
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      aria-disabled={off || undefined}
      disabled={off}
      onClick={off ? undefined : onToggle}
      className={cn(CHIP_BASE, off ? CHIP_SOON : selected ? CHIP_ON : CHIP_OFF)}
    >
      {label}
      {soon ? <SoonBadge label="Coming soon" className="ml-0.5" /> : null}
      {!soon && note ? (
        <span className="text-[10px] font-normal text-ink-500">{note}</span>
      ) : null}
    </button>
  );
}

export function ChipMultiSelect<V extends string>({
  label,
  required,
  hint,
  info,
  value,
  onChange,
  options,
  max,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  info?: React.ReactNode;
  value: readonly V[];
  onChange: (value: V[]) => void;
  options: ReadonlyArray<ChipOption<V>>;
  max?: number;
}) {
  const chosen = new Set(value);
  return (
    <Field label={label} required={required} hint={hint} info={info}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((opt) => {
          const selected = chosen.has(opt.value);
          return (
            <Chip
              key={opt.value}
              role="checkbox"
              label={opt.label}
              soon={opt.available === false}
              disabled={opt.disabled}
              note={opt.disabled ? opt.disabledNote : opt.note}
              selected={selected}
              onToggle={() => {
                if (selected) onChange(value.filter((v) => v !== opt.value));
                else if (max === undefined || value.length < max) onChange([...value, opt.value]);
              }}
            />
          );
        })}
      </div>
    </Field>
  );
}

export function ChipRadioGroup<V extends string>({
  label,
  required,
  hint,
  info,
  value,
  onChange,
  options,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  info?: React.ReactNode;
  value: V | "";
  onChange: (value: V) => void;
  options: ReadonlyArray<ChipOption<V>>;
}) {
  return (
    <Field label={label} required={required} hint={hint} info={info}>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <Chip
            key={opt.value}
            role="radio"
            label={opt.label}
            soon={opt.available === false}
            disabled={opt.disabled}
            note={opt.disabled ? opt.disabledNote : opt.note}
            selected={value === opt.value}
            onToggle={() => onChange(opt.value)}
          />
        ))}
      </div>
    </Field>
  );
}

export interface ChipGroupSection<V extends string> {
  key: string;
  heading: string;
  options: ReadonlyArray<ChipOption<V>>;
}

/**
 * ChipMultiSelect spread over several headed sections (the product shape
 * picker grouped by subsector, the subsector picker grouped by sector). Zero
 * or more values, optional `max` over the whole picker and `maxPerGroup`
 * within one section. The heading rows appear only when there is more than
 * one section, so a single section renders exactly like ChipMultiSelect.
 */
export function ChipMultiSelectGroups<V extends string>({
  label,
  required,
  hint,
  info,
  value,
  onChange,
  groups,
  max,
  maxPerGroup,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  info?: React.ReactNode;
  value: readonly V[];
  onChange: (value: V[]) => void;
  groups: ReadonlyArray<ChipGroupSection<V>>;
  max?: number;
  maxPerGroup?: number;
  /** Rendered under the chips, inside the field. */
  children?: React.ReactNode;
}) {
  const headed = groups.length > 1;
  const chosen = new Set(value);
  return (
    <Field label={label} required={required} hint={hint} info={info}>
      <div className={cn(headed ? "space-y-3" : "")} role="group" aria-label={label}>
        {groups.map((group) => (
          <div key={group.key} role={headed ? "group" : undefined} aria-label={headed ? group.heading : undefined}>
            {headed ? (
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                {group.heading}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => {
                const selected = chosen.has(opt.value);
                const inGroup = group.options.filter((o) => chosen.has(o.value)).length;
                return (
                  <Chip
                    key={opt.value}
                    role="checkbox"
                    label={opt.label}
                    soon={opt.available === false}
                    disabled={opt.disabled}
                    note={opt.disabled ? opt.disabledNote : opt.note}
                    selected={selected}
                    onToggle={() => {
                      if (selected) onChange(value.filter((v) => v !== opt.value));
                      else if (
                        (max === undefined || value.length < max) &&
                        (maxPerGroup === undefined || inGroup < maxPerGroup)
                      )
                        onChange([...value, opt.value]);
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {children}
      </div>
    </Field>
  );
}
