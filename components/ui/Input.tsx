import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared text-input styling used by every form on the site. */
export const inputClasses =
  "w-full rounded-xl border border-ink-700/60 bg-ink-950/70 px-3.5 py-2.5 text-sm text-ink-50 " +
  "placeholder:text-ink-500 focus:border-electric-500/60 focus:outline-none focus:ring-1 focus:ring-electric-500/30";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputClasses, className)} {...props} />
));
Input.displayName = "Input";

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputClasses, className)} {...props} />
));
TextArea.displayName = "TextArea";

/**
 * Label + control + hint/error/counter wrapper. Mirrors the field markup of
 * the waitlist/contact modals so forms stay visually consistent.
 */
export function Field({
  label,
  required,
  error,
  hint,
  counter,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-200">
          {label} {required ? <span className="text-rose-400">*</span> : null}
        </span>
        {counter ? <span className="tabular text-xs text-ink-500">{counter}</span> : null}
      </span>
      {children}
      {error ? (
        <span className="block text-xs text-rose-400">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-500">{hint}</span>
      ) : null}
    </label>
  );
}
