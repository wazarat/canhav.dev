"use client";

import { Check } from "lucide-react";

import { InfoTip } from "@/components/ui/InfoTip";
import { cn } from "@/lib/utils";

/**
 * Typeform style choice rows (M74): a full width row with a keyed square on
 * the left (A, B, C), a title and a first person sentence. Zero or more
 * values, optional `max` over the whole picker and `maxPerGroup` within one
 * headed section; extra clicks are ignored, never an error. Options with
 * `available: false` are left out, the caller says what is coming in
 * `children`. An option with `disabled: true` stays on the list, dimmed, with
 * its `disabledNote` (the testnet gate).
 */
export interface ChoiceOption<V extends string> {
  value: V;
  label: string;
  /** Row heading. Falls back to `label`. */
  title?: string;
  /** Sentence under the heading. */
  sentence?: string;
  note?: string;
  available?: boolean;
  disabled?: boolean;
  disabledNote?: string;
}

export interface ChoiceGroup<V extends string> {
  key: string;
  heading: string;
  options: ReadonlyArray<ChoiceOption<V>>;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function ChoiceCardGroups<V extends string>({
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
  groups: ReadonlyArray<ChoiceGroup<V>>;
  max?: number;
  maxPerGroup?: number;
  /** Rendered under the rows. */
  children?: React.ReactNode;
}) {
  const headed = groups.length > 1;
  const chosen = new Set(value);
  let index = 0;
  // Not a <label>: a label around several buttons forwards clicks to the first.
  return (
    <div className="space-y-1.5">
      <p className="inline-flex items-center gap-1 text-xs font-medium text-ink-200">
        <span>
          {label} {required ? <span className="text-rose-400">*</span> : null}
        </span>
        {info ? <InfoTip>{info}</InfoTip> : null}
      </p>
      <div className="space-y-3" role="group" aria-label={label}>
        {groups.map((group) => {
          const options = group.options.filter((o) => o.available !== false);
          const inGroup = options.filter((o) => chosen.has(o.value)).length;
          return (
            <div key={group.key} role={headed ? "group" : undefined} aria-label={headed ? group.heading : undefined}>
              {headed ? (
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">{group.heading}</p>
              ) : null}
              <div className="space-y-2">
                {options.map((opt) => {
                  const selected = chosen.has(opt.value);
                  const disabled = opt.disabled === true;
                  const letter = LETTERS[index % LETTERS.length];
                  index += 1;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      aria-disabled={disabled || undefined}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        if (selected) onChange(value.filter((v) => v !== opt.value));
                        else if (
                          (max === undefined || value.length < max) &&
                          (maxPerGroup === undefined || inGroup < maxPerGroup)
                        )
                          onChange([...value, opt.value]);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-500/60",
                        disabled
                          ? "cursor-not-allowed border-ink-800/70 opacity-60"
                          : selected
                            ? "border-electric-500 bg-electric-500/10"
                            : "border-ink-700/60 bg-ink-900 hover:border-ink-500",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold",
                          selected
                            ? "border-electric-500 bg-electric-500 text-white"
                            : "border-ink-700/60 bg-ink-950/50 text-ink-400 light:bg-ink-800/50",
                        )}
                      >
                        {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : letter}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block text-sm font-medium", disabled ? "text-ink-500" : "text-ink-50")}>
                          {opt.title ?? opt.label}
                        </span>
                        {opt.sentence ? (
                          <span className={cn("mt-0.5 block text-sm leading-relaxed", disabled ? "text-ink-500" : "text-ink-300")}>
                            {opt.sentence}
                          </span>
                        ) : null}
                        {(disabled && opt.disabledNote) || opt.note ? (
                          <span className="mt-1 block text-[11px] text-ink-500">{disabled ? opt.disabledNote : opt.note}</span>
                        ) : null}
                      </span>
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
