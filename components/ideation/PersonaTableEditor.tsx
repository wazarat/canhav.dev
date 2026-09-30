"use client";

import { Plus, Trash2 } from "lucide-react";

import { Input, inputClasses } from "@/components/ui/Input";
import { PERSONA_COPY, type PersonaRowSpec } from "@/content/ideation";
import { PROJECT_LIMITS } from "@/lib/ideation";
import { cn } from "@/lib/utils";

/** Literal classes so Tailwind sees each column count. */
const GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-[110px_minmax(0,1fr)]",
  2: "sm:grid-cols-[110px_repeat(2,minmax(0,1fr))]",
  3: "sm:grid-cols-[110px_repeat(3,minmax(0,1fr))]",
};

/** Every cell shares one height so the label column lines up with the inputs. */
const CELL = "sm:h-[42px]";

/**
 * Ideal customer persona table: one column per persona, one row per spec in
 * `rows` (the B2B and B2C tables share this component, M42). Starts with
 * one column, the plus adds up to three. Every cell is optional. From `sm`
 * up it reads as a table with the row labels on the left; on a phone each
 * persona stacks as its own card with the labels above the inputs.
 */
export function PersonaTableEditor<T extends { [K in keyof T]: string }>({
  rows,
  personas,
  onChange,
  empty,
  note,
}: {
  rows: ReadonlyArray<PersonaRowSpec<keyof T & string>>;
  /** Undefined until the builder first edits the table. */
  personas: T[] | undefined;
  onChange: (personas: T[]) => void;
  empty: () => T;
  /** The line at the top right. */
  note: string;
}) {
  const L = PROJECT_LIMITS.personas;
  const list = personas?.length ? personas : [empty()];

  const update = (i: number, key: keyof T & string, value: string) =>
    onChange(list.map((p, j) => (j === i ? { ...p, [key]: value } : p)));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink-200">{PERSONA_COPY.label}</span>
        <span className="text-xs text-ink-500">{note}</span>
      </div>

      <div className={cn("space-y-3 sm:grid sm:gap-x-3 sm:space-y-0", GRID_COLS[list.length])}>
        <div className="hidden sm:block sm:space-y-2">
          <div className="h-6" />
          {rows.map((row) => (
            <div key={row.key} className={cn("flex items-center text-xs text-ink-400", CELL)}>
              {row.label}
            </div>
          ))}
        </div>

        {list.map((persona, i) => (
          <div
            key={i}
            className="space-y-2 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
          >
            <div className="flex h-6 items-center justify-between">
              <span className="text-xs font-medium text-ink-400">{PERSONA_COPY.column(i + 1)}</span>
              {list.length > L.min ? (
                <button
                  type="button"
                  aria-label={PERSONA_COPY.remove(i + 1)}
                  onClick={() => onChange(list.filter((_, j) => j !== i))}
                  className="text-ink-500 transition-colors hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {rows.map((row) => {
              const value = persona[row.key] as string;
              return (
                <label key={row.key} className="block space-y-1 sm:space-y-0">
                  <span className="text-[11px] text-ink-400 sm:sr-only">{row.label}</span>
                  {row.kind === "select" ? (
                    <select
                      value={value}
                      onChange={(e) => update(i, row.key, e.target.value)}
                      className={cn(inputClasses, "appearance-none", CELL, !value && "text-ink-500")}
                    >
                      <option value="">{row.placeholder}</option>
                      {(row.options ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-ink-950 text-ink-50">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={value}
                      maxLength={row.max}
                      inputMode={row.kind === "digits" ? "numeric" : undefined}
                      placeholder={row.placeholder}
                      className={CELL}
                      onChange={(e) =>
                        update(
                          i,
                          row.key,
                          row.kind === "digits" ? e.target.value.replace(/[^\d\s-]/g, "") : e.target.value,
                        )
                      }
                    />
                  )}
                </label>
              );
            })}
          </div>
        ))}
      </div>

      {list.length < L.max ? (
        <button
          type="button"
          onClick={() => onChange([...list, empty()])}
          className="inline-flex items-center gap-1.5 text-xs text-electric-300 transition-colors hover:text-electric-200"
        >
          <Plus className="h-3.5 w-3.5" /> {PERSONA_COPY.add}
        </button>
      ) : null}
    </div>
  );
}
