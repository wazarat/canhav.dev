"use client";

import { cn } from "@/lib/utils";

/**
 * A checkbox row with a label area and an optional description slot. The
 * checkbox styling is the one the Reality step already uses. Used by the
 * resource pack rail and, later, the build checklist.
 */
export function CheckItem({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-ink-800/70 hover:bg-ink-900/40",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-700 bg-ink-950 accent-electric-500"
      />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block text-sm leading-snug text-ink-100">{label}</span>
        {description ? (
          <span className="block text-xs leading-relaxed text-ink-400">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
