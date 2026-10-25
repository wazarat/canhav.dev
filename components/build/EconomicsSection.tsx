"use client";

import { useState } from "react";

import { EconomicsChart } from "@/components/build/EconomicsChart";
import { FIELD_GRID } from "@/components/build/layout";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { ECONOMICS_COPY } from "@/content/economics";
import { VIABILITY_COPY } from "@/content/viability";
import { COST_INPUTS, type EconInput, type EconValues, type Economics, FAMILY_INPUTS, GROWTH_INPUT, SCENARIOS, type Scenario, computeEconomics, defaultEconomics, familyOf, formatScale, normalizeEconomics } from "@/lib/economics";
import type { MarketFill } from "@/lib/economics-market";
import { formatDayShort } from "@/lib/format";
import type { ProjectDoc } from "@/lib/ideation";
import { kitShapes } from "@/lib/kits";

const C = ECONOMICS_COPY;

function Big({ label, value, line }: { label: string; value: string; line: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-ink-400">{label}</p>
      <p className="font-display text-2xl font-semibold leading-tight text-ink-50">{value}</p>
      <p className="text-xs leading-relaxed text-ink-400">{line}</p>
    </div>
  );
}

function NumberField({ input, value, source, onChange }: { input: EconInput; value: number; source?: { source: string; readAt: string }; onChange: (n: number) => void }) {
  const unit = C.units[input.unit];
  return (
    <Field label={input.label} hint={source ? C.market.source(formatDayShort(source.readAt)) : input.explain}>
      <span className="relative block">
        <Input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? String(value) : ""}
          min={input.min}
          max={input.max}
          step={input.unit === "usd" ? 1000 : input.unit === "months" ? 1 : 0.01}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className={unit ? "pr-10" : undefined}
        />
        {unit ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">{unit}</span> : null}
      </span>
    </Field>
  );
}

/**
 * Do the numbers work (M167, V3): the scenario switch, the inputs on the
 * left in the field grid with units, the three outputs on the right as
 * large numbers with a sentence each, Fill from market, and the chart
 * below. Defaults show until the team edits; every write stamps the
 * record as the team's.
 */
export function EconomicsSection({ projectId, doc, patch }: { projectId: string; doc: ProjectDoc; patch: (p: Partial<ProjectDoc>) => void }) {
  const family = doc.economics?.family ?? familyOf(kitShapes(doc.kit));
  const stored = doc.economics ?? null;
  const record: Economics | null = family ? (stored ?? defaultEconomics(family)) : null;
  const [market, setMarket] = useState<"idle" | "loading" | "failed">("idle");
  const [marketNote, setMarketNote] = useState<string | null>(null);
  if (!family || !record) return <p className="text-sm leading-relaxed text-ink-400">{VIABILITY_COPY.dependencies.noShape}</p>;
  if (family === "governance") return <p className="text-sm leading-relaxed text-ink-300">{C.governance}</p>;
  const scenario = record.chosen;
  const values = record.scenarios[scenario];
  const out = computeEconomics(family, values);
  const write = (next: Partial<Economics>) => {
    const clean = normalizeEconomics({ ...record, ...next, updatedAt: new Date().toISOString(), by: "team" });
    if (clean) patch({ economics: clean });
  };
  const setValue = (key: string, n: number) => write({ scenarios: { ...record.scenarios, [scenario]: { ...values, [key]: n } } });
  const fill = async () => {
    setMarket("loading");
    setMarketNote(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/economics/market?family=${family}`);
      if (!res.ok) throw new Error(String(res.status));
      const { fill } = (await res.json()) as { fill: MarketFill };
      const keys = Object.keys(fill.values);
      if (!keys.length) setMarketNote(C.market.nothing);
      else {
        write({ scenarios: { ...record.scenarios, [scenario]: { ...values, ...fill.values } }, sources: { ...(record.sources ?? {}), ...fill.sources } });
        setMarketNote(C.market.filled(keys.length));
      }
      setMarket("idle");
    } catch {
      setMarket("failed");
    }
  };
  const growth = `${values[GROWTH_INPUT.key] ?? 0}%`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented size="sm" ariaLabel={C.groups.revenue} value={scenario} onChange={(s: Scenario) => write({ chosen: s })} options={SCENARIOS.map((s) => ({ value: s, label: C.scenarios[s] }))} />
        <p className="text-xs text-ink-400">{stored ? C.filledBy[stored.by](formatDayShort(stored.updatedAt)) : C.defaultsNote}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-ink-100">{C.groups.revenue}</h3>
              <div className="flex items-center gap-2 text-xs text-ink-400">
                {marketNote ? <span>{marketNote}</span> : null}
                {market === "failed" ? <span className="text-rose-400">{VIABILITY_COPY.dependencies.failed}</span> : null}
                <Button type="button" size="sm" variant="outline" disabled={market === "loading"} onClick={() => void fill()} title={C.market.hint}>
                  {market === "loading" ? C.market.filling : C.market.fill}
                </Button>
              </div>
            </div>
            <div className={FIELD_GRID}>
              {FAMILY_INPUTS[family].map((i) => (
                <NumberField key={i.key} input={i} value={values[i.key]} source={record.sources?.[i.key]} onChange={(n) => setValue(i.key, n)} />
              ))}
            </div>
            <p className="text-xs text-ink-500">{C.market.hint}</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ink-100">{C.groups.costs}</h3>
            <div className={FIELD_GRID}>
              {COST_INPUTS.map((i) => (
                <NumberField key={i.key} input={i} value={values[i.key]} onChange={(n) => setValue(i.key, n)} />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ink-100">{C.groups.growth}</h3>
            <div className={FIELD_GRID}>
              <NumberField input={GROWTH_INPUT} value={values[GROWTH_INPUT.key]} onChange={(n) => setValue(GROWTH_INPUT.key, n)} />
            </div>
          </div>
        </div>
        {out ? (
          <div className="space-y-5 lg:border-l lg:border-ink-700/40 lg:pl-6">
            <Big label={C.outputs.revenue} value={formatScale(out.revenueMonthly)} line={C.outputs.revenueLine(formatScale(out.scale), out.scaleLabel)} />
            <Big label={C.outputs.cost} value={formatScale(out.costMonthly)} line={C.outputs.costLine(formatScale((values.auditOneOff ?? 0) / Math.max(1, values.auditMonths ?? 12)))} />
            <Big
              label={C.outputs.breakEven}
              value={out.breakEvenScale === null ? "" : formatScale(out.breakEvenScale)}
              line={out.breakEvenScale === null ? C.outputs.neverLine : C.outputs.breakEvenLine(formatScale(out.breakEvenScale), out.scaleLabel, out.monthsToBreakEven, growth)}
            />
            {out.lpCostMonthly !== undefined ? <p className="text-xs leading-relaxed text-ink-400">{C.outputs.lpCost(formatScale(out.lpCostMonthly))}</p> : null}
            <p className="text-xs text-ink-500">{C.scenarioHint}</p>
          </div>
        ) : null}
      </div>
      <EconomicsChart family={family} scenarios={record.scenarios} chosen={scenario} />
    </div>
  );
}
