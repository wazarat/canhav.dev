"use client";

import { Input } from "@/components/ui/Input";
import { STATUS_DECL_OPTIONS } from "@/content/ideation";
import type { StatusDecl } from "@/lib/ideation";
import { cn } from "@/lib/utils";

/**
 * A status declaration: four honest options, cheap to answer. "Already in
 * place" opens a one-line description; nothing else is asked.
 */
export function StatusDeclarationField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StatusDecl;
  onChange: (value: StatusDecl) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-ink-200">{label}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {STATUS_DECL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value.status === opt.value}
            onClick={() =>
              onChange(
                opt.value === "in_place"
                  ? { status: opt.value, note: value.note }
                  : { status: opt.value },
              )
            }
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              value.status === opt.value
                ? "border-electric-500/50 bg-electric-500/20 text-electric-200"
                : "border-ink-700/70 text-ink-400 hover:text-ink-200",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value.status === "in_place" && (
        <Input
          value={value.note ?? ""}
          onChange={(e) => onChange({ status: "in_place", note: e.target.value })}
          placeholder="One line: what's in place?"
          maxLength={200}
        />
      )}
    </div>
  );
}
