"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { type ExternalDep, PROJECT_LIMITS } from "@/lib/ideation";

/**
 * Repeatable external-dependency rows: one entry per contract/protocol, each
 * with an optional link. "No external dependencies" is a first-class answer
 * that clears the list.
 */
export function ExternalDepsEditor({
  deps,
  none,
  onChange,
}: {
  deps: ExternalDep[];
  none: boolean;
  onChange: (deps: ExternalDep[], none: boolean) => void;
}) {
  const L = PROJECT_LIMITS;
  const atMax = deps.length >= L.externalDeps.max;

  const update = (i: number, patch: Partial<ExternalDep>) => {
    const next = deps.map((d, j) => (j === i ? { ...d, ...patch } : d));
    onChange(next, false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink-200">
          External dependencies <span className="text-rose-400">*</span>
        </span>
        <span className="text-xs text-ink-500">One entry per contract or protocol.</span>
      </div>
      {!none && (
        <div className="space-y-2">
          {deps.map((dep, i) => (
            <div key={i} className="flex items-start gap-2">
              <Input
                value={dep.name}
                onChange={(e) => update(i, { name: e.target.value })}
                maxLength={L.externalDepName.max}
                placeholder="Uniswap v3, Chainlink, Morpho…"
                className="flex-1"
              />
              <Input
                value={dep.url ?? ""}
                onChange={(e) => update(i, { url: e.target.value.trim() || undefined })}
                maxLength={L.externalDepUrl.max}
                placeholder="https:// (optional)"
                className="flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange(deps.filter((_, j) => j !== i), false)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={atMax}
            onClick={() => onChange([...deps, { name: "" }], false)}
          >
            Add dependency
          </Button>
          {atMax && (
            <p className="text-xs text-ink-500">At most {L.externalDeps.max} dependencies.</p>
          )}
        </div>
      )}
      <label className="flex items-start gap-2.5 text-sm text-ink-200">
        <input
          type="checkbox"
          checked={none}
          onChange={(e) => onChange(e.target.checked ? [] : deps, e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-ink-700 bg-ink-950 accent-electric-500"
        />
        No external dependencies. Our contracts call nothing outside this project.
      </label>
    </div>
  );
}
