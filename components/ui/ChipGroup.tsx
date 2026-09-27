"use client";

import { Field } from "@/components/ui/Input";
import { SoonBadge } from "@/components/ui/SoonBadge";
import { cn } from "@/lib/utils";

/**
 * Pill choosers in the StatusDeclarationField styling, lifted into ui so the
 * project and token editors share one look. An option with
 * `available: false` renders dimmed, disabled, and carries a SoonBadge.
 *
 * ChipMultiSelect: zero or more values, optional `max` (extra clicks are
 * ignored, never an error). ChipRadioGroup: exactly one value or "".
 */
export interface ChipOption<V extends string> {
  value: V;
  label: string;
  available?: boolean;
}

const CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors";
const CHIP_ON = "border-electric-500/50 bg-electric-500/20 text-electric-200";
const CHIP_OFF = "border-ink-700/70 text-ink-400 hover:text-ink-200";
const CHIP_SOON = "cursor-not-allowed border-ink-800/70 text-ink-500 opacity-60";

function Chip({
  selected,
  soon,
  label,
  onToggle,
  role,
}: {
  selected: boolean;
  soon: boolean;
  label: string;
  onToggle: () => void;
  role: "checkbox" | "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={soon}
      onClick={soon ? undefined : onToggle}
      className={cn(CHIP_BASE, soon ? CHIP_SOON : selected ? CHIP_ON : CHIP_OFF)}
    >
      {label}
      {soon ? <SoonBadge label="Coming soon" className="ml-0.5" /> : null}
    </button>
  );
}

export function ChipMultiSelect<V extends string>({
  label,
  required,
  hint,
  value,
  onChange,
  options,
  max,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: readonly V[];
  onChange: (value: V[]) => void;
  options: ReadonlyArray<ChipOption<V>>;
  max?: number;
}) {
  const chosen = new Set(value);
  return (
    <Field label={label} required={required} hint={hint}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((opt) => {
          const selected = chosen.has(opt.value);
          return (
            <Chip
              key={opt.value}
              role="checkbox"
              label={opt.label}
              soon={opt.available === false}
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
  value,
  onChange,
  options,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: V | "";
  onChange: (value: V) => void;
  options: ReadonlyArray<ChipOption<V>>;
}) {
  return (
    <Field label={label} required={required} hint={hint}>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <Chip
            key={opt.value}
            role="radio"
            label={opt.label}
            soon={opt.available === false}
            selected={value === opt.value}
            onToggle={() => onChange(opt.value)}
          />
        ))}
      </div>
    </Field>
  );
}
