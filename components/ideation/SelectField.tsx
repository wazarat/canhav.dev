"use client";

import { Field } from "@/components/ui/Input";
import { inputClasses } from "@/components/ui/Input";
import { SOON_LABEL } from "@/content/ideation";
import { cn } from "@/lib/utils";

/**
 * Native select in the site input styling — one decision, one control.
 * An option with `available: false` is listed but disabled and carries the
 * "Coming soon" suffix, so builders see the roadmap without being able to
 * pick something the platform cannot serve yet.
 */
export function SelectField<V extends string>({
  label,
  required,
  hint,
  value,
  onChange,
  options,
  placeholder = "Choose…",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: V | "";
  onChange: (value: V | "") => void;
  options: ReadonlyArray<{ value: V; label: string; available?: boolean }>;
  placeholder?: string;
}) {
  return (
    <Field label={label} required={required} hint={hint}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as V | "")}
        className={cn(inputClasses, "appearance-none", !value && "text-ink-500")}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => {
          const soon = opt.available === false;
          return (
            <option
              key={opt.value}
              value={opt.value}
              disabled={soon}
              className={cn("bg-ink-950", soon ? "text-ink-500" : "text-ink-50")}
            >
              {soon ? `${opt.label} (${SOON_LABEL})` : opt.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}
