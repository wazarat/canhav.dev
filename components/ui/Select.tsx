"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { Field, inputClasses } from "@/components/ui/Input";
import { SOON_LABEL } from "@/content/ideation";
import { cn } from "@/lib/utils";

/**
 * Native select in the site input styling with a chevron (M74): keyboard
 * and mobile behaviour come from the browser, the look from inputClasses.
 * Pass `muted` while nothing is chosen so the placeholder reads as one.
 */
export const selectClasses = cn(inputClasses, "cursor-pointer appearance-none pr-9");

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { muted?: boolean }
>(({ className, muted, ...props }, ref) => (
  <span className="relative block">
    <select ref={ref} className={cn(selectClasses, muted && "text-ink-500", className)} {...props} />
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
    />
  </span>
));
Select.displayName = "Select";

/** Option styling for the native popup, which ignores most page CSS. */
export const optionClasses = "bg-ink-950 text-ink-50";

/**
 * Label plus Select, one decision one control. An option with
 * `available: false` is listed but disabled and carries the "Coming soon"
 * suffix, so builders see the roadmap without picking what the platform
 * cannot serve yet.
 */
export function SelectField<V extends string>({
  label,
  required,
  hint,
  info,
  value,
  onChange,
  options,
  placeholder = "Choose…",
  clearable = false,
  disabled = false,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  info?: React.ReactNode;
  value: V | "";
  onChange: (value: V | "") => void;
  options: ReadonlyArray<{ value: V; label: string; available?: boolean }>;
  placeholder?: string;
  /** Optional answers can go back to unset, so the blank choice stays selectable. */
  clearable?: boolean;
  /** A locked decision (M148, the chain after a launch): the value shows, nothing else can be picked. */
  disabled?: boolean;
}) {
  return (
    <Field label={label} required={required} hint={hint} info={info}>
      <Select value={value} muted={!value} disabled={disabled} onChange={(e) => onChange(e.target.value as V | "")}>
        <option value="" disabled={!clearable}>
          {placeholder}
        </option>
        {options.map((opt) => {
          const soon = opt.available === false;
          return (
            <option
              key={opt.value}
              value={opt.value}
              disabled={soon}
              className={cn(optionClasses, soon && "text-ink-500")}
            >
              {soon ? `${opt.label} (${SOON_LABEL})` : opt.label}
            </option>
          );
        })}
      </Select>
    </Field>
  );
}
