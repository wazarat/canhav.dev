"use client";

import { Field } from "@/components/ui/Input";
import { inputClasses } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/** Native select in the site input styling — one decision, one control. */
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
  options: ReadonlyArray<{ value: V; label: string }>;
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
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-ink-950 text-ink-50">
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
