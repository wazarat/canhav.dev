"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { Select, optionClasses } from "@/components/ui/Select";
import { BUILD_COPY } from "@/content/build";
import { shapeLabel } from "@/content/kits/copy";
import { KIT_LIMITS, PRODUCT_SHAPE_VALUES, type ProductShape } from "@/lib/kits";

/**
 * Add a shape from the Build tab (M176): one of ours offered under the
 * project's sectors, or one the team makes, blank or copied from any of
 * ours. At the plan's cap the menu says so instead.
 */
export function AddShape({
  offered,
  count,
  cap,
  plus,
  onAddOurs,
  onCreateOwn,
}: {
  /** Our shapes for the project's sectors that are not on it yet. */
  offered: readonly ProductShape[];
  /** Shapes on the project, ours and own. */
  count: number;
  cap: number;
  plus: boolean;
  onAddOurs: (shape: ProductShape) => void;
  onCreateOwn: (input: { title: string; detail: string; basedOn?: ProductShape }) => void;
}) {
  const S = BUILD_COPY.shapes;
  const [creating, setCreating] = useState(false);
  const full = count >= cap;
  return (
    <>
      <Menu
        align="left"
        width="w-72 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-ink-700/60 px-2.5 text-xs text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" /> {S.add}
          </button>
        )}
      >
        {full ? (
          <p className="px-3.5 py-2.5 text-xs leading-relaxed text-ink-400">{S.cap(cap, plus)}</p>
        ) : (
          <>
            <MenuItem onSelect={() => setCreating(true)}>
              <span className="flex flex-col items-start">
                <span>{S.createOwn}</span>
                <span className="text-xs text-ink-500">{S.createOwnHint}</span>
              </span>
            </MenuItem>
            <p className="border-t border-ink-700/40 px-3.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">{S.ours}</p>
            {offered.length === 0 ? <p className="px-3.5 pb-2 text-xs text-ink-500">{S.noneLeft}</p> : null}
            {offered.map((s) => (
              <MenuItem key={s} onSelect={() => onAddOurs(s)} className="py-1.5">
                {shapeLabel(s) ?? s}
              </MenuItem>
            ))}
          </>
        )}
      </Menu>
      {creating && !full ? (
        <OwnShapeForm
          onCancel={() => setCreating(false)}
          onCreate={(input) => {
            onCreateOwn(input);
            setCreating(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Name a new shape and pick where it starts: blank, or a copy of one of ours. */
function OwnShapeForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (input: { title: string; detail: string; basedOn?: ProductShape }) => void }) {
  const S = BUILD_COPY.shapes;
  const L = KIT_LIMITS.ownShapes;
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [from, setFrom] = useState<ProductShape | "">("");
  const ok = title.trim().length >= L.titleMin;
  return (
    <Card className="basis-full">
      <CardSection className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-ink-50">{S.formTitle}</h3>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_16rem]">
          <Field label={S.name}>
            <Input autoFocus value={title} maxLength={L.titleMax} placeholder={S.namePlaceholder} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={S.detail}>
            <Input value={detail} maxLength={L.detailMax} placeholder={S.detailPlaceholder} onChange={(e) => setDetail(e.target.value)} />
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
        <div className="flex gap-2">
          <Button size="sm" disabled={!ok} onClick={() => onCreate({ title, detail, ...(from ? { basedOn: from } : {}) })}>
            {S.create}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {S.cancel}
          </Button>
        </div>
      </CardSection>
    </Card>
  );
}
