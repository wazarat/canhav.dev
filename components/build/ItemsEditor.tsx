"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { type CanvasItem, type ItemLimits, newItemId } from "@/lib/canvas-items";

/**
 * Edit a short list of items in place (M155), shared by the Business Model
 * Canvas blocks and the Value Proposition Canvas areas (M157). One Input
 * per item with Remove, Add an item, Done; Enter adds the next item and
 * focuses it, Escape closes. Items keep their ids; a new one gets its id
 * here so a later link to it holds. Empty items are dropped on Done.
 */
export function ItemsEditor({
  items,
  onChange,
  onDone,
  limits,
  placeholder = STUDIO_PLUS_COPY.canvas.itemPlaceholder,
  autoFocus = true,
}: {
  items: readonly CanvasItem[];
  onChange: (items: CanvasItem[]) => void;
  onDone: () => void;
  limits: ItemLimits;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const C = STUDIO_PLUS_COPY.canvas;
  const shown: readonly CanvasItem[] = items.length ? items : [{ id: newItemId(), text: "" }];
  const focusIndex = useRef<number | null>(autoFocus ? shown.length - 1 : null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => {
    const i = focusIndex.current;
    if (i === null) return;
    inputs.current[i]?.focus();
    focusIndex.current = null;
  });
  const full = shown.length >= limits.max;
  const set = (i: number, text: string) => onChange(shown.map((it, j) => (j === i ? { ...it, text } : it)));
  const remove = (i: number) => onChange(shown.filter((_, j) => j !== i));
  const add = (after?: number) => {
    if (full) return;
    const next = [...shown];
    const at = after === undefined ? next.length : after + 1;
    next.splice(at, 0, { id: newItemId(), text: "" });
    focusIndex.current = at;
    onChange(next);
  };
  const done = () => {
    onChange(shown.filter((it) => it.text.trim().length >= limits.min).map((it) => ({ ...it, text: it.text.trim() })));
    onDone();
  };
  return (
    <div className="space-y-2" onKeyDown={(e) => e.key === "Escape" && done()}>
      {shown.map((it, i) => (
        <div key={it.id} className="flex items-center gap-2">
          <Input
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={it.text}
            maxLength={limits.maxChars}
            placeholder={placeholder}
            aria-label={`${C.addItem} ${i + 1}`}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(i);
              }
            }}
            className="h-8 text-sm"
          />
          <button type="button" onClick={() => remove(i)} className="shrink-0 text-xs text-ink-400 transition-colors hover:text-ink-50 hover:underline">
            {C.remove}
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" variant="outline" disabled={full} onClick={() => add()}>
          {C.addItem}
        </Button>
        <Button type="button" size="sm" onClick={done}>
          {C.done}
        </Button>
        <span className="text-xs text-ink-500">
          {C.count(shown.filter((it) => it.text.trim()).length, limits.max)}. {C.keys}
        </span>
      </div>
    </div>
  );
}
