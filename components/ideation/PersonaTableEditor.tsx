"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

import { Input, inputClasses } from "@/components/ui/Input";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { PERSONA_COPY, PERSONA_PICKABLE, type PersonaRowSpec, defaultPersonaFields, personaDetailSpec } from "@/content/ideation";
import { type Audience, PROJECT_LIMITS, type PersonaField, personaCell, withPersonaCell } from "@/lib/ideation";
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
 * persona stacks as its own card with the labels above the inputs. Since
 * M187 each of the five row names opens a menu to rename the row or pick
 * the detail it records, the same for every persona.
 */
export function PersonaTableEditor<T extends object>({
  audience,
  rows,
  fields,
  onFields,
  personas,
  onChange,
  empty,
  note,
}: {
  audience: Audience;
  rows: ReadonlyArray<PersonaRowSpec<string>>;
  /** The team's rows, or undefined for the audience's defaults. */
  fields: PersonaField[] | undefined;
  onFields: (fields: PersonaField[] | undefined) => void;
  /** Undefined until the builder first edits the table. */
  personas: T[] | undefined;
  onChange: (personas: T[]) => void;
  empty: () => T;
  /** The line at the top right. */
  note: string;
}) {
  const L = PROJECT_LIMITS.personas;
  const list = personas?.length ? personas : [empty()];
  const current = fields?.length ? fields : defaultPersonaFields(audience);

  const update = (i: number, key: string, value: string) => onChange(list.map((p, j) => (j === i ? withPersonaCell(p, key, value, audience) : p)));
  const setField = (i: number, next: PersonaField) => onFields(current.map((f, j) => (j === i ? next : f)));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink-200">{PERSONA_COPY.label}</span>
        <span className="text-xs text-ink-500">
          {note}
          {fields?.length ? (
            <button type="button" onClick={() => onFields(undefined)} className="ml-2 text-ink-400 hover:text-ink-100 hover:underline">
              {PERSONA_COPY.rowsReset}
            </button>
          ) : null}
        </span>
      </div>

      <div className={cn("space-y-3 sm:grid sm:gap-x-3 sm:space-y-0", GRID_COLS[list.length])}>
        <div className="hidden sm:block sm:space-y-2">
          <div className="h-6" />
          {rows.map((row, i) => (
            <div key={row.key} className={cn("flex items-center text-xs text-ink-400", CELL)}>
              <RowLabel field={current[i]} taken={current.map((f) => f.key)} onChange={(next) => setField(i, next)} />
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
              const value = personaCell(persona, row.key);
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

/**
 * One row's name as a menu (M187): rename it, or pick the detail it records
 * from the business details, the individual details or the team's own. A
 * detail already in another row is shown but cannot be picked twice.
 */
function RowLabel({ field, taken, onChange }: { field: PersonaField; taken: readonly string[]; onChange: (next: PersonaField) => void }) {
  const C = PERSONA_COPY;
  const [name, setName] = useState(field.label);
  const commit = () => {
    const v = name.trim().slice(0, PROJECT_LIMITS.personaFields.labelMax);
    if (v && v !== field.label) onChange({ ...field, label: v });
    else setName(field.label);
  };
  return (
    <Menu
      align="left"
      width="w-72"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={() => {
            setName(field.label);
            toggle();
          }}
          aria-expanded={open}
          aria-label={C.rowEdit(field.label)}
          className="inline-flex max-w-full items-center gap-1 truncate text-left text-ink-400 transition-colors hover:text-ink-100"
        >
          <span className="truncate">{field.label}</span>
          <ChevronDown aria-hidden className="h-3 w-3 shrink-0" />
        </button>
      )}
    >
      <div className="space-y-1 px-3 pb-2 pt-2">
        <p className="text-[11px] text-ink-500">{C.rowName}</p>
        <Input
          value={name}
          maxLength={PROJECT_LIMITS.personaFields.labelMax}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          aria-label={C.rowName}
          className="h-8 text-xs"
        />
      </div>
      <div className="max-h-72 overflow-y-auto border-t border-ink-700/40 py-1">
        <p className="px-3 pt-1 text-[11px] text-ink-500">{C.rowDetail}</p>
        {PERSONA_PICKABLE.map((g) => (
          <div key={g.group} className="py-1">
            <p className="px-3 py-1 text-[11px] font-medium text-ink-400">{C.rowGroups[g.group]}</p>
            {g.keys.map((k) => {
              const spec = personaDetailSpec(k);
              const elsewhere = k !== field.key && taken.includes(k);
              return (
                <MenuItem key={k} disabled={elsewhere} onSelect={() => onChange({ key: k, label: spec.label })} className={cn(k === field.key && "bg-ink-800/60")}>
                  <span className="flex-1 truncate">{spec.label}</span>
                  {elsewhere ? <span className="text-[11px] text-ink-500">{C.rowInUse}</span> : null}
                </MenuItem>
              );
            })}
          </div>
        ))}
      </div>
    </Menu>
  );
}
