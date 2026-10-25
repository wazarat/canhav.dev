"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { SHAPE_ICONS, ShapeGlyph, shapeColorValue } from "@/components/build/shape-icons";
import { Input } from "@/components/ui/Input";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { BUILD_COPY } from "@/content/build";
import { SHAPE_ICON_NAMES } from "@/content/kits/shape-icons";
import { SHAPE_COLORS, type ProjectKit, type ShapeId, setShapeStyle } from "@/lib/kits";
import { cn } from "@/lib/utils";

/**
 * A shape's icon and colour (M177), after Linear's icon picker: a colour
 * row, a search and the icon grid. A colour keeps the panel open, an icon
 * closes it. The glyph is the trigger, so it sits wherever the shape is
 * named with room to edit (the board header).
 */
export function ShapeIconPicker({ kit, shape, onPatchKit }: { kit: ProjectKit; shape: ShapeId; onPatchKit: (partial: Partial<ProjectKit>) => void }) {
  const S = BUILD_COPY.shapes;
  const [q, setQ] = useState("");
  const current = kit.shapeStyles?.[shape];
  const color = current?.color ?? "grey";
  const icons = SHAPE_ICON_NAMES.filter((n) => !q.trim() || n.includes(q.trim().toLowerCase()));
  return (
    <Menu
      align="left"
      width="w-80 max-w-[calc(100vw-2rem)]"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={S.iconLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700/60 bg-ink-900 transition-colors hover:border-ink-500"
        >
          <ShapeGlyph kit={kit} shape={shape} className="h-4 w-4" />
        </button>
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 pb-2 pt-2">
        {SHAPE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={S.colorLabel(c)}
            aria-pressed={c === color}
            onClick={() => onPatchKit(setShapeStyle(kit, shape, { color: c }))}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: shapeColorValue(c) }}
          >
            {c === color ? <Check aria-hidden className="h-3.5 w-3.5 text-ink-950" /> : null}
          </button>
        ))}
      </div>
      <div className="border-t border-ink-700/40 px-3 py-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={S.iconSearch} aria-label={S.iconSearch} className="h-8 text-xs" />
      </div>
      <div className="grid max-h-64 grid-cols-8 gap-0.5 overflow-y-auto border-t border-ink-700/40 p-2">
        {icons.map((n) => {
          const Icon = SHAPE_ICONS[n];
          return (
            <MenuItem
              key={n}
              onSelect={() => onPatchKit(setShapeStyle(kit, shape, { icon: n }))}
              className={cn("w-auto justify-center rounded-md p-1.5", current?.icon === n && "bg-ink-800/60")}
            >
              <Icon aria-label={n} className="h-4 w-4" style={{ color: shapeColorValue(color) }} />
            </MenuItem>
          );
        })}
        {icons.length === 0 ? <p className="col-span-8 px-1 py-2 text-xs text-ink-500">{S.iconNone}</p> : null}
      </div>
    </Menu>
  );
}
