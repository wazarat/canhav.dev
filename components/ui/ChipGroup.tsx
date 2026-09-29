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
  /** Card heading in CardMultiSelectGroups. Falls back to `label`. */
  title?: string;
  /** Sentence under the card heading in CardMultiSelectGroups. */
  sentence?: string;
}

const CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors";
const CHIP_ON = "border-electric-500/50 bg-electric-500/20 text-electric-200";
const CHIP_OFF = "border-ink-600 bg-ink-900/50 text-ink-200 hover:border-ink-500 hover:text-ink-50";
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
    <Field label={label} required={required} hint={hint}>
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

const CARD_BASE = "block w-full rounded-xl border px-4 py-3 text-left transition-colors";

/**
 * ChipMultiSelectGroups as full-width sentence cards: each option shows its
 * title, then a first-person sentence. Same selection rules (`max`,
 * `maxPerGroup`, extra clicks ignored). Options with `available: false` are
 * left out, the caller says what is coming in `children`.
 */
export function CardMultiSelectGroups<V extends string>({
  label,
  required,
  hint,
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
  value: readonly V[];
  onChange: (value: V[]) => void;
  groups: ReadonlyArray<ChipGroupSection<V>>;
  max?: number;
  maxPerGroup?: number;
  /** Rendered under the cards. */
  children?: React.ReactNode;
}) {
  const headed = groups.length > 1;
  const chosen = new Set(value);
  // Not a Field: a <label> around several buttons would forward clicks on the
  // heading to the first card.
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-ink-200">
        {label} {required ? <span className="text-rose-400">*</span> : null}
      </p>
      <div className="space-y-3" role="group" aria-label={label}>
        {groups.map((group) => {
          const options = group.options.filter((o) => o.available !== false);
          const inGroup = options.filter((o) => chosen.has(o.value)).length;
          return (
            <div
              key={group.key}
              role={headed ? "group" : undefined}
              aria-label={headed ? group.heading : undefined}
            >
              {headed ? (
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                  {group.heading}
                </p>
              ) : null}
              <div className="space-y-2">
                {options.map((opt) => {
                  const selected = chosen.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      onClick={() => {
                        if (selected) onChange(value.filter((v) => v !== opt.value));
                        else if (
                          (max === undefined || value.length < max) &&
                          (maxPerGroup === undefined || inGroup < maxPerGroup)
                        )
                          onChange([...value, opt.value]);
                      }}
                      className={cn(CARD_BASE, selected ? CHIP_ON : CHIP_OFF)}
                    >
                      <span
                        className={cn(
                          "block text-[11px] font-medium uppercase tracking-wide",
                          selected ? "text-electric-200" : "text-ink-400",
                        )}
                      >
                        {opt.title ?? opt.label}
                      </span>
                      {opt.sentence ? (
                        <span
                          className={cn(
                            "mt-1 block text-sm leading-relaxed",
                            selected ? "text-ink-50" : "text-ink-200",
                          )}
                        >
                          {opt.sentence}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {children}
      </div>
      {hint ? <p className="text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}
