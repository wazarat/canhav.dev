"use client";

import { Plus, Trash2 } from "lucide-react";

import { Input, inputClasses } from "@/components/ui/Input";
import { PERSONA_COPY, REVENUE_RANGE_OPTIONS } from "@/content/ideation";
import { PROJECT_LIMITS, type Persona, type RevenueRange, emptyPersona } from "@/lib/ideation";
import { cn } from "@/lib/utils";

/** Literal classes so Tailwind sees each column count. */
const GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-[110px_minmax(0,1fr)]",
  2: "sm:grid-cols-[110px_repeat(2,minmax(0,1fr))]",
  3: "sm:grid-cols-[110px_repeat(3,minmax(0,1fr))]",
};

/** Every cell shares one height so the label column lines up with the inputs. */
const CELL = "sm:h-[42px]";

type TextKey = "teamSize" | "geography" | "industry" | "primaryContact";

const TEXT_ROWS: ReadonlyArray<{ key: TextKey; max: number; numeric?: boolean }> = [
  { key: "teamSize", max: PROJECT_LIMITS.personaTeamSize.max, numeric: true },
  { key: "geography", max: PROJECT_LIMITS.personaText.max },
  { key: "industry", max: PROJECT_LIMITS.personaText.max },
  { key: "primaryContact", max: PROJECT_LIMITS.personaText.max },
];

/**
 * Ideal customer persona table: one column per persona, five rows. Starts
 * with one column, the plus adds up to three. Every cell is optional. From
 * `sm` up it reads as a table with the row labels on the left; on a phone
 * each persona stacks as its own card with the labels above the inputs.
 */
export function PersonaTableEditor({
  personas,
  onChange,
}: {
  /** Undefined until the builder first edits the table. */
  personas: Persona[] | undefined;
  onChange: (personas: Persona[]) => void;
}) {
  const L = PROJECT_LIMITS.personas;
  const list = personas?.length ? personas : [emptyPersona()];
  const R = PERSONA_COPY.rows;

  const update = (i: number, patch: Partial<Persona>) =>
    onChange(list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink-200">{PERSONA_COPY.label}</span>
        <span className="text-xs text-ink-500">{PERSONA_COPY.note}</span>
      </div>

      <div className={cn("space-y-3 sm:grid sm:gap-x-3 sm:space-y-0", GRID_COLS[list.length])}>
        <div className="hidden sm:block sm:space-y-2">
          <div className="h-6" />
          {[R.teamSize, R.geography, R.industry, R.primaryContact, R.revenueRange].map((row) => (
            <div key={row.label} className={cn("flex items-center text-xs text-ink-400", CELL)}>
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
            {TEXT_ROWS.map(({ key, max, numeric }) => (
              <label key={key} className="block space-y-1 sm:space-y-0">
                <span className="text-[11px] text-ink-400 sm:sr-only">{R[key].label}</span>
                <Input
                  value={persona[key]}
                  maxLength={max}
                  inputMode={numeric ? "numeric" : undefined}
                  placeholder={R[key].placeholder}
                  className={CELL}
                  onChange={(e) =>
                    update(i, {
                      [key]: numeric ? e.target.value.replace(/[^\d\s-]/g, "") : e.target.value,
                    })
                  }
                />
              </label>
            ))}
            <label className="block space-y-1 sm:space-y-0">
              <span className="text-[11px] text-ink-400 sm:sr-only">{R.revenueRange.label}</span>
              <select
                value={persona.revenueRange}
                onChange={(e) => update(i, { revenueRange: e.target.value as RevenueRange | "" })}
                className={cn(
                  inputClasses,
                  "appearance-none",
                  CELL,
                  !persona.revenueRange && "text-ink-500",
                )}
              >
                <option value="">{R.revenueRange.placeholder}</option>
                {REVENUE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-ink-950 text-ink-50">
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>

      {list.length < L.max ? (
        <button
          type="button"
          onClick={() => onChange([...list, emptyPersona()])}
          className="inline-flex items-center gap-1.5 text-xs text-electric-300 transition-colors hover:text-electric-200"
        >
          <Plus className="h-3.5 w-3.5" /> {PERSONA_COPY.add}
        </button>
      ) : null}
    </div>
  );
}
