"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Select, optionClasses } from "@/components/ui/Select";
import { SECTOR_COPY, SECTOR_OPTIONS, subsectorLabel } from "@/content/ideation";
import { PROJECT_LIMITS, type ProjectDoc, addCustomSubsector } from "@/lib/ideation";
import { SECTOR_SUBSECTORS, type Sector, type Subsector } from "@/lib/sectors";

const sectorLabel = (s: Sector) => SECTOR_OPTIONS.find((o) => o.value === s)?.label ?? s;

/**
 * Subsectors the team adds itself (M182), under any picked sector, each with
 * the closest of ours, which lends its contract templates and resources so
 * the team starts from the nearest templates and adds its own modules.
 */
export function CustomSubsectors({ doc, sectors, patch }: { doc: ProjectDoc; sectors: readonly Sector[]; patch: (p: Partial<ProjectDoc>) => void }) {
  const C = SECTOR_COPY.custom;
  const L = PROJECT_LIMITS.customSubsectors;
  const [open, setOpen] = useState(false);
  const [sector, setSector] = useState<Sector | "">(sectors[0] ?? "");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [closest, setClosest] = useState<Subsector | "">("");
  const list = (doc.customSubsectors ?? []).filter((c) => sectors.includes(c.sector));
  if (!sectors.length) return null;
  const pickSector = sector && sectors.includes(sector) ? sector : sectors[0];
  const full = (doc.customSubsectors?.length ?? 0) >= L.max;
  const add = () => {
    if (title.trim().length < L.titleMin || full) return;
    patch(addCustomSubsector(doc, { sector: pickSector, title, detail, ...(closest ? { closest } : {}) }));
    setTitle("");
    setDetail("");
    setClosest("");
    setOpen(false);
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink-200">{C.title}</p>
      {list.length ? (
        <ul className="space-y-1.5">
          {list.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-ink-700/60 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-ink-50">{c.title}</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {[sectorLabel(c.sector), c.closest ? C.closestLine(subsectorLabel(c.closest)) : null, c.detail || null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                aria-label={C.remove(c.title)}
                onClick={() => {
                  const left = (doc.customSubsectors ?? []).filter((x) => x.id !== c.id);
                  patch({ customSubsectors: left.length ? left : undefined });
                }}
                className="rounded p-1 text-ink-500 hover:bg-ink-800/60 hover:text-ink-100"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <div className="space-y-3 rounded-lg border border-ink-700/60 p-3">
          <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_14rem]">
            <Field label={C.sector}>
              <Select value={pickSector} onChange={(e) => { setSector(e.target.value as Sector); setClosest(""); }}>
                {sectors.map((s) => (
                  <option key={s} value={s} className={optionClasses}>
                    {sectorLabel(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={C.name}>
              <Input autoFocus value={title} maxLength={L.titleMax} placeholder={C.namePlaceholder} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label={C.closest}>
              <Select value={closest} onChange={(e) => setClosest(e.target.value as Subsector | "")}>
                <option value="" className={optionClasses}>
                  {C.noClosest}
                </option>
                {SECTOR_SUBSECTORS[pickSector].map((x) => (
                  <option key={x} value={x} className={optionClasses}>
                    {subsectorLabel(x)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={C.detail}>
            <Input value={detail} maxLength={L.detailMax} placeholder={C.detailPlaceholder} onChange={(e) => setDetail(e.target.value)} />
          </Field>
          <p className="text-xs text-ink-500">{C.closestHint}</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={title.trim().length < L.titleMin} onClick={add}>
              {C.add}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {C.cancel}
            </Button>
          </div>
        </div>
      ) : full ? null : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-ink-300 hover:text-ink-50">
          <Plus aria-hidden className="h-3.5 w-3.5" /> {C.addOwn}
        </button>
      )}
    </div>
  );
}
