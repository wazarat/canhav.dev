"use client";

import { Field, Input, TextArea } from "@/components/ui/Input";

/**
 * A min/max-bounded text field with the platform's top-right counter
 * convention (live count / range, signal accent once the minimum is met).
 */
export function TextField({
  label,
  required,
  hint,
  value,
  onChange,
  min,
  max,
  rows,
  placeholder,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max: number;
  /** Renders a textarea when set, an input otherwise. */
  rows?: number;
  placeholder?: string;
}) {
  const len = value.trim().length;
  const fmt = (n: number) => n.toLocaleString("en-US");
  const shared = {
    value,
    placeholder,
    maxLength: max,
  };
  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      counter={fmt(len)}
      range={min ? `${fmt(min)}–${fmt(max)}` : fmt(max)}
      counterMet={min ? len >= min : len > 0}
    >
      {rows ? (
        <TextArea rows={rows} {...shared} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input {...shared} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}
