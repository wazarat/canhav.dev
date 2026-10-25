"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { Field, Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { Select, optionClasses } from "@/components/ui/Select";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { BUILD_COPY } from "@/content/build";
import { SECTOR_OPTIONS, subsectorLabel } from "@/content/ideation";
import { shapeBlurb, shapeLabel } from "@/content/kits/copy";
import { KIT_LIMITS, PRODUCT_SHAPE_VALUES, type ProductShape, shapesFor } from "@/lib/kits";
import { SECTOR_SUBSECTORS, type Sector, type Subsector } from "@/lib/sectors";
import { cn } from "@/lib/utils";

/**
 * Add a shape (M176, a pop-up since M177). Ours: pick a sector, a
 * subsector and one of its shapes; a sector or subsector the project lacks
 * comes with it. Your own: a name, what the team wants it to do and where
 * it starts, with the team's agent asked to ideate it over MCP or a prompt
 * to paste. At the plan's cap the pop-up says so instead.
 */
export function AddShape({
  onProject,
  sectors,
  count,
  cap,
  plus,
  canAsk,
  prompt,
  onAddOurs,
  onCreateOwn,
}: {
  /** Our shapes already on the project. */
  onProject: readonly ProductShape[];
  /** The project's sectors, picked first in the pop-up. */
  sectors: readonly Sector[];
  /** Shapes on the project, ours and own. */
  count: number;
  cap: number;
  plus: boolean;
  /** An agent is connected and may take requests. */
  canAsk: boolean;
  /** The ideate prompt for a shape of this name and description. */
  prompt: (title: string, detail: string) => string;
  onAddOurs: (shape: ProductShape, sector: Sector, subsector: Subsector) => void;
  onCreateOwn: (input: { title: string; detail: string; basedOn?: ProductShape }, ask: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-ink-700/60 px-2.5 text-xs text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
      >
        <Plus aria-hidden className="h-3.5 w-3.5" /> {BUILD_COPY.shapes.add}
      </button>
      {open ? (
        <AddShapeDialog
          onClose={() => setOpen(false)}
          onProject={onProject}
          sectors={sectors}
          full={count >= cap}
          cap={cap}
          plus={plus}
          canAsk={canAsk}
          prompt={prompt}
          onAddOurs={(...a) => {
            onAddOurs(...a);
            setOpen(false);
          }}
          onCreateOwn={(input, ask) => {
            onCreateOwn(input, ask);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function AddShapeDialog({
  onClose,
  onProject,
  sectors,
  full,
  cap,
  plus,
  canAsk,
  prompt,
  onAddOurs,
  onCreateOwn,
}: {
  onClose: () => void;
  onProject: readonly ProductShape[];
  sectors: readonly Sector[];
  full: boolean;
  cap: number;
  plus: boolean;
  canAsk: boolean;
  prompt: (title: string, detail: string) => string;
  onAddOurs: (shape: ProductShape, sector: Sector, subsector: Subsector) => void;
  onCreateOwn: (input: { title: string; detail: string; basedOn?: ProductShape }, ask: boolean) => void;
}) {
  const S = BUILD_COPY.shapes;
  const containerRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ onClose, containerRef });
  const [tab, setTab] = useState<"ours" | "own">("ours");
  const open = SECTOR_OPTIONS.filter((o) => o.available !== false);
  const [sector, setSector] = useState<Sector>(sectors.find((s) => open.some((o) => o.value === s)) ?? open[0].value);
  const [sub, setSub] = useState<Subsector | "">("");
  const subs = SECTOR_SUBSECTORS[sector] ?? [];
  const shapes = useMemo(() => (sub ? shapesFor([sub]) : []), [sub]);
  const L = KIT_LIMITS.ownShapes;
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [from, setFrom] = useState<ProductShape | "">("");
  const [ask, setAsk] = useState(canAsk);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={S.dialogTitle} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 md:py-14">
      <div className="fixed inset-0 bg-ink-950/80" onClick={onClose} />
      <div ref={containerRef} tabIndex={-1} className="relative z-10 w-full max-w-2xl rounded-xl border border-ink-700/60 bg-ink-900 focus:outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700/40 px-5 py-4 md:px-6">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">{S.dialogTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">{S.dialogIntro}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={S.close} className="rounded-lg border border-ink-700/60 p-1.5 text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        {full ? (
          <p className="px-5 py-5 text-sm text-ink-300 md:px-6">{S.cap(cap, plus)}</p>
        ) : (
          <div className="space-y-5 px-5 py-5 md:px-6">
            <Segmented
              value={tab}
              onChange={setTab}
              ariaLabel={S.dialogTitle}
              role="tablist"
              options={[
                { value: "ours", label: S.tabOurs },
                { value: "own", label: S.tabOwn },
              ]}
            />
            {tab === "ours" ? (
              <div className="space-y-4">
                <Field label={S.sector}>
                  <Select
                    value={sector}
                    onChange={(e) => {
                      setSector(e.target.value as Sector);
                      setSub("");
                    }}
                  >
                    {open.map((o) => (
                      <option key={o.value} value={o.value} className={optionClasses}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {!sectors.includes(sector) ? <p className="-mt-2 text-xs text-ink-500">{S.addsSector(open.find((o) => o.value === sector)?.label ?? sector)}</p> : null}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-ink-200">{S.subsector}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {subs.map((x) => (
                      <button
                        key={x}
                        type="button"
                        aria-pressed={sub === x}
                        onClick={() => setSub(x)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs transition-colors",
                          sub === x ? "border-ink-500 bg-ink-800/60 text-ink-50" : "border-ink-700/60 text-ink-400 hover:text-ink-100",
                        )}
                      >
                        {subsectorLabel(x)}
                      </button>
                    ))}
                  </div>
                </div>
                {sub ? (
                  <ul className="space-y-1.5">
                    {shapes.map((s) => {
                      const here = onProject.includes(s);
                      return (
                        <li key={s} className="flex items-start justify-between gap-3 rounded-lg border border-ink-700/60 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm text-ink-50">{shapeLabel(s) ?? s}</p>
                            {shapeBlurb(s) ? <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{shapeBlurb(s)}</p> : null}
                          </div>
                          {here ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-500">
                              <Check aria-hidden className="h-3.5 w-3.5" /> {S.onProject}
                            </span>
                          ) : (
                            <Button size="sm" variant="outline" className="shrink-0" onClick={() => onAddOurs(s, sector, sub)}>
                              {S.addThis}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-500">{S.pickSubsector}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
                  <Field label={S.name}>
                    <Input autoFocus value={title} maxLength={L.titleMax} placeholder={S.namePlaceholder} onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                  <Field label={S.startFrom}>
                    <Select value={from} onChange={(e) => setFrom(e.target.value as ProductShape | "")}>
                      <option value="" className={optionClasses}>
                        {S.blank}
                      </option>
                      {PRODUCT_SHAPE_VALUES.map((s) => (
                        <option key={s} value={s} className={optionClasses}>
                          {S.copyOf(shapeLabel(s) ?? s)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label={S.wants} counter={`${detail.length} / ${L.detailMax}`}>
                  <textarea
                    value={detail}
                    maxLength={L.detailMax}
                    rows={3}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder={S.wantsPlaceholder}
                    className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-electric-500 focus:outline-none"
                  />
                </Field>
                {canAsk ? (
                  <label className="flex items-start gap-2.5 text-sm text-ink-100">
                    <input type="checkbox" checked={ask} onChange={(e) => setAsk(e.target.checked)} className="mt-1" />
                    <span>
                      {S.askAgent}
                      <span className="block text-xs leading-relaxed text-ink-500">{S.askAgentHint}</span>
                    </span>
                  </label>
                ) : (
                  <p className="text-xs text-ink-500">{S.noAgent}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" disabled={title.trim().length < L.titleMin} onClick={() => onCreateOwn({ title, detail, ...(from ? { basedOn: from } : {}) }, canAsk && ask)}>
                    {S.create}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onClose}>
                    {S.cancel}
                  </Button>
                </div>
                {title.trim().length >= L.titleMin ? <CopyBlock label={S.promptLabel} text={prompt(title.trim(), detail.trim())} /> : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
