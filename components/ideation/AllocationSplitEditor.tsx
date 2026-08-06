"use client";

import { Input } from "@/components/ui/Input";
import { ALLOCATION_FIELDS } from "@/content/ideation";
import type { AllocationSplit } from "@/lib/ideation";
import { cn } from "@/lib/utils";

/**
 * Seven whole-percent inputs with a live remainder readout. The sum must hit
 * exactly 100 to publish; the readout turns signal when it does.
 */
export function AllocationSplitEditor({
  value,
  onChange,
}: {
  value: AllocationSplit;
  onChange: (value: AllocationSplit) => void;
}) {
  const sum = ALLOCATION_FIELDS.reduce((acc, f) => acc + (value[f.key] || 0), 0);
  const met = sum === 100;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-200">
          Allocation split <span className="text-rose-400">*</span>
        </span>
        <span className="text-xs">
          <span className={cn("tabular font-medium", met ? "text-signal-400" : "text-ink-200")}>
            {sum}
          </span>
          <span className="tabular font-medium text-ink-300"> / 100%</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ALLOCATION_FIELDS.map((f) => (
          <label key={f.key} className="block space-y-1">
            <span className="text-[11px] text-ink-400">{f.label}</span>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={value[f.key] === 0 ? "0" : value[f.key] || ""}
                onChange={(e) => {
                  const n = Math.max(0, Math.min(100, Math.floor(Number(e.target.value) || 0)));
                  onChange({ ...value, [f.key]: n });
                }}
                className="pr-7"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-500">
                %
              </span>
            </div>
          </label>
        ))}
      </div>
      {value.other > 0 && (
        <label className="block space-y-1">
          <span className="text-[11px] text-ink-400">What is &quot;other&quot;?</span>
          <Input
            value={value.otherLabel ?? ""}
            onChange={(e) => onChange({ ...value, otherLabel: e.target.value })}
            maxLength={60}
            placeholder="Label the other allocation"
          />
        </label>
      )}
      {!met && (
        <p className="text-xs text-ink-500">
          {sum < 100 ? `${100 - sum}% unallocated.` : `${sum - 100}% over — trim it back.`}
        </p>
      )}
    </div>
  );
}
