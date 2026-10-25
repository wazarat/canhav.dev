import { z } from "zod";

import { ECONOMICS_COPY } from "../content/economics.ts";
import type { ProductShape } from "./kits";

/**
 * Unit economics (M166, V3): one model per product family, every shape
 * mapped to a family, three scenarios stored on the record. Pure, with
 * relative imports only, so scripts/check-economics.mjs runs the model
 * under node against hand calculated fixtures. Rates are percentages as
 * typed (6 means six percent); money is dollars; the scale is TVL,
 * monthly volume, staked TVL or assets under management as the family
 * names it. Revenue is linear in the scale, so break even is one division.
 */
export const ECONOMICS_FAMILIES = ["lending", "vaults", "pools", "perps", "staking", "rwa", "governance"] as const;
export type EconomicsFamily = (typeof ECONOMICS_FAMILIES)[number];

export const SHAPE_ECONOMICS_FAMILY: Record<ProductShape, EconomicsFamily> = {
  collateral_loans: "lending",
  pt_backed_borrowing: "lending",
  fixed_rate_yield: "lending",
  embedded_fixed_rate: "lending",
  yield_token_exposure: "lending",
  curated_vault: "vaults",
  embedded_earn: "vaults",
  permissioned_vault: "vaults",
  liquidity_allocator: "vaults",
  leveraged_fixed_yield: "vaults",
  option_vault: "vaults",
  delta_neutral_vault: "vaults",
  basic_amm_pool: "pools",
  concentrated_liquidity_pool: "pools",
  hook_pool: "pools",
  perp_exchange: "perps",
  liquid_staking_token: "staking",
  restaking_service: "staking",
  liquid_restaking_token: "staking",
  tokenized_security: "rwa",
  private_credit_pool: "rwa",
  asset_backed_token: "rwa",
  cover_pool: "rwa",
  governance_stack: "governance",
};

export function isEconomicsFamily(v: unknown): v is EconomicsFamily {
  return typeof v === "string" && (ECONOMICS_FAMILIES as readonly string[]).includes(v);
}

/** The family of a project's shapes, the first shape deciding. Null without shapes. */
export function familyOf(shapes: readonly ProductShape[]): EconomicsFamily | null {
  return shapes.length ? SHAPE_ECONOMICS_FAMILY[shapes[0]] : null;
}

export type EconUnit = "usd" | "pct" | "ratio" | "months" | "x";

export interface EconInput {
  key: string;
  label: string;
  explain: string;
  unit: EconUnit;
  min: number;
  max: number;
  default: number;
}

const I = ECONOMICS_COPY.inputs;
const input = (key: keyof typeof I, unit: EconUnit, min: number, max: number, def: number): EconInput => ({ key, label: I[key].label, explain: I[key].explain, unit, min, max, default: def });

/** The revenue inputs per family, the scale first. */
export const FAMILY_INPUTS: Record<EconomicsFamily, readonly EconInput[]> = {
  lending: [input("tvl", "usd", 0, 1e12, 5_000_000), input("utilizationPct", "pct", 0, 100, 80), input("borrowRatePct", "pct", 0, 200, 6), input("reserveFactorPct", "pct", 0, 100, 10), input("protocolFeePct", "pct", 0, 50, 0)],
  vaults: [input("tvl", "usd", 0, 1e12, 5_000_000), input("strategyYieldPct", "pct", 0, 500, 8), input("performanceFeePct", "pct", 0, 100, 10), input("managementFeePct", "pct", 0, 50, 1), input("leverage", "x", 1, 20, 1)],
  pools: [input("tvl", "usd", 0, 1e12, 2_000_000), input("volumeToTvlPct", "pct", 0, 1000, 20), input("feeTierPct", "pct", 0, 10, 0.3), input("protocolSharePct", "pct", 0, 100, 10), input("impermanentLossPct", "pct", 0, 100, 5)],
  perps: [input("volume", "usd", 0, 1e13, 50_000_000), input("feeRatePct", "pct", 0, 5, 0.05), input("fundingSharePct", "pct", 0, 5, 0.01), input("insuranceSharePct", "pct", 0, 100, 20)],
  staking: [input("stakedTvl", "usd", 0, 1e12, 10_000_000), input("rewardRatePct", "pct", 0, 200, 4), input("commissionPct", "pct", 0, 100, 10)],
  rwa: [input("aum", "usd", 0, 1e12, 10_000_000), input("feeRateAumPct", "pct", 0, 50, 1), input("premiumRatePct", "pct", 0, 100, 0), input("expectedLossPct", "pct", 0, 100, 0)],
  governance: [],
};

/** The cost inputs, shared by every family. */
export const COST_INPUTS: readonly EconInput[] = [
  input("incentivesMonthly", "usd", 0, 1e9, 0),
  input("auditOneOff", "usd", 0, 1e8, 60_000),
  input("auditMonths", "months", 1, 120, 12),
  input("infraMonthly", "usd", 0, 1e8, 2_000),
  input("teamMonthly", "usd", 0, 1e9, 25_000),
  input("oracleKeeperMonthly", "usd", 0, 1e8, 500),
];

export const GROWTH_INPUT: EconInput = input("growthMonthlyPct", "pct", 0, 200, 10);

export function inputsFor(family: EconomicsFamily): readonly EconInput[] {
  return family === "governance" ? [] : [...FAMILY_INPUTS[family], ...COST_INPUTS, GROWTH_INPUT];
}

/** The scale input of a family, null for governance. */
export function scaleInput(family: EconomicsFamily): EconInput | null {
  return FAMILY_INPUTS[family][0] ?? null;
}

export type EconValues = Record<string, number>;

export function defaultValues(family: EconomicsFamily): EconValues {
  return Object.fromEntries(inputsFor(family).map((i) => [i.key, i.default]));
}

export interface EconOutputs {
  scale: number;
  scaleLabel: string;
  revenueMonthly: number;
  costMonthly: number;
  /** Revenue one dollar of scale earns in a month. */
  revenuePerUnit: number;
  /** The scale at which revenue meets cost; null when revenue per unit is zero. */
  breakEvenScale: number | null;
  /** Months to reach break even at the growth rate; 0 when the scale already covers it; null when growth is zero and the scale is short. */
  monthsToBreakEven: number | null;
  /** The liquidity providers' impermanent loss per month, pools only. */
  lpCostMonthly?: number;
}

const pct = (v: number | undefined) => (v ?? 0) / 100;

/** Revenue per dollar of scale per month, the model's one number per family. */
export function revenuePerUnit(family: EconomicsFamily, v: EconValues): number {
  switch (family) {
    case "lending":
      return (pct(v.utilizationPct) * pct(v.borrowRatePct) * pct(v.reserveFactorPct) + pct(v.protocolFeePct)) / 12;
    case "vaults":
      return ((v.leverage ?? 1) * pct(v.strategyYieldPct) * pct(v.performanceFeePct) + pct(v.managementFeePct)) / 12;
    case "pools":
      return pct(v.volumeToTvlPct) * 30 * pct(v.feeTierPct) * pct(v.protocolSharePct);
    case "perps":
      return (pct(v.feeRatePct) + pct(v.fundingSharePct)) * (1 - pct(v.insuranceSharePct));
    case "staking":
      return (pct(v.rewardRatePct) * pct(v.commissionPct)) / 12;
    case "rwa":
      return (pct(v.feeRateAumPct) + pct(v.premiumRatePct) - pct(v.expectedLossPct)) / 12;
    default:
      return 0;
  }
}

export function fixedCostMonthly(v: EconValues): number {
  const months = Math.max(1, v.auditMonths ?? 12);
  return (v.incentivesMonthly ?? 0) + (v.auditOneOff ?? 0) / months + (v.infraMonthly ?? 0) + (v.teamMonthly ?? 0) + (v.oracleKeeperMonthly ?? 0);
}

export function computeEconomics(family: EconomicsFamily, v: EconValues): EconOutputs | null {
  const scaleIn = scaleInput(family);
  if (!scaleIn) return null;
  const scale = v[scaleIn.key] ?? 0;
  const per = revenuePerUnit(family, v);
  const revenueMonthly = scale * per;
  const costMonthly = fixedCostMonthly(v);
  const breakEvenScale = per > 0 ? costMonthly / per : null;
  const growth = pct(v.growthMonthlyPct);
  let monthsToBreakEven: number | null;
  if (breakEvenScale === null) monthsToBreakEven = null;
  else if (scale >= breakEvenScale) monthsToBreakEven = 0;
  else if (growth <= 0 || scale <= 0) monthsToBreakEven = null;
  else monthsToBreakEven = Math.ceil(Math.log(breakEvenScale / scale) / Math.log(1 + growth));
  const out: EconOutputs = { scale, scaleLabel: ECONOMICS_COPY.scaleLabel[family], revenueMonthly, costMonthly, revenuePerUnit: per, breakEvenScale, monthsToBreakEven };
  if (family === "pools") out.lpCostMonthly = (scale * pct(v.impermanentLossPct)) / 12;
  return out;
}

export const ECONOMICS_FORMULAS: Record<EconomicsFamily, readonly string[]> = ECONOMICS_COPY.formulas;

/** Revenue and cost sampled over a log range of the scale, for the chart. */
export function seriesFor(family: EconomicsFamily, v: EconValues, points = 40, range: { min: number; max: number } | null = null): Array<{ scale: number; revenue: number; cost: number }> {
  const out = computeEconomics(family, v);
  if (!out) return [];
  const centre = Math.max(out.scale, out.breakEvenScale ?? 0, 1_000);
  const min = range?.min ?? centre / 100;
  const max = range?.max ?? centre * 100;
  const lmin = Math.log10(Math.max(min, 1));
  const lmax = Math.log10(Math.max(max, min * 10));
  return Array.from({ length: points }, (_, i) => {
    const scale = 10 ** (lmin + ((lmax - lmin) * i) / (points - 1));
    return { scale, revenue: scale * out.revenuePerUnit, cost: out.costMonthly };
  });
}

// ---------------------------------------------------------------------------
// The record

export const SCENARIOS = ["low", "base", "high"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export interface EconSource {
  source: string;
  readAt: string;
}

export interface Economics {
  family: EconomicsFamily;
  scenarios: Record<Scenario, EconValues>;
  chosen: Scenario;
  /** Per input key, where a value came from (Fill from market). */
  sources?: Record<string, EconSource>;
  updatedAt: string;
  by: "team" | "agent";
}

export const ECONOMICS_LIMITS = { source: 60 } as const;

/**
 * The three scenarios from the defaults: low at half the scale with the
 * family's rates trimmed by a quarter, high at twice the scale with the
 * rates up a quarter, costs and growth the same, so the three lines sit
 * apart on the chart from the first look.
 */
export function defaultEconomics(family: EconomicsFamily, now = new Date().toISOString()): Economics {
  const base = defaultValues(family);
  const scale = scaleInput(family);
  const low = { ...base };
  const high = { ...base };
  if (scale) {
    low[scale.key] = base[scale.key] / 2;
    high[scale.key] = base[scale.key] * 2;
  }
  for (const i of FAMILY_INPUTS[family].slice(1)) {
    if (i.unit !== "pct" || i.key === "impermanentLossPct" || i.key === "insuranceSharePct" || i.key === "expectedLossPct") continue;
    low[i.key] = clamp(Number((base[i.key] * 0.75).toFixed(4)), i);
    high[i.key] = clamp(Number((base[i.key] * 1.25).toFixed(4)), i);
  }
  return { family, scenarios: { low, base, high }, chosen: "base", updatedAt: now, by: "team" };
}

function clamp(n: number, i: EconInput): number {
  return Math.min(i.max, Math.max(i.min, n));
}

/** Values as stored: known keys only, finite, clamped to the input bounds; missing keys take the default. */
export function normalizeValues(family: EconomicsFamily, raw: unknown): EconValues {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: EconValues = {};
  for (const i of inputsFor(family)) {
    const v = src[i.key];
    out[i.key] = typeof v === "number" && Number.isFinite(v) ? clamp(v, i) : i.default;
  }
  return out;
}

export function normalizeEconomics(raw: unknown): Economics | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isEconomicsFamily(r.family)) return null;
  const family = r.family;
  const sc = r.scenarios && typeof r.scenarios === "object" ? (r.scenarios as Record<string, unknown>) : {};
  const fallback = defaultEconomics(family).scenarios;
  const scenarios = Object.fromEntries(SCENARIOS.map((s) => [s, normalizeValues(family, sc[s] ?? fallback[s])])) as Record<Scenario, EconValues>;
  const chosen = (SCENARIOS as readonly string[]).includes(r.chosen as string) ? (r.chosen as Scenario) : "base";
  const keys = new Set(inputsFor(family).map((i) => i.key));
  let sources: Record<string, EconSource> | undefined;
  if (r.sources && typeof r.sources === "object") {
    for (const [k, v] of Object.entries(r.sources as Record<string, unknown>)) {
      if (!keys.has(k) || !v || typeof v !== "object") continue;
      const o = v as { source?: unknown; readAt?: unknown };
      if (typeof o.source !== "string" || !o.source.trim() || typeof o.readAt !== "string" || Number.isNaN(Date.parse(o.readAt))) continue;
      (sources ??= {})[k] = { source: o.source.trim().slice(0, ECONOMICS_LIMITS.source), readAt: o.readAt };
    }
  }
  const updatedAt = typeof r.updatedAt === "string" && !Number.isNaN(Date.parse(r.updatedAt)) ? r.updatedAt : new Date().toISOString();
  const by = r.by === "agent" ? "agent" : "team";
  return { family, scenarios, chosen, ...(sources ? { sources } : {}), updatedAt, by };
}

const valuesSchema = z.record(z.string().max(40), z.number().finite());

/** What update_project accepts: the family, any of the scenarios (each a full or partial input set, the rest from the defaults), the chosen one. Stamps are set by the server. */
export const economicsPatchSchema = z.strictObject({
  family: z.enum(ECONOMICS_FAMILIES),
  scenarios: z
    .strictObject({ low: valuesSchema.optional(), base: valuesSchema.optional(), high: valuesSchema.optional() })
    .optional(),
  chosen: z.enum(SCENARIOS).optional(),
  sources: z.record(z.string().max(40), z.strictObject({ source: z.string().min(1).max(ECONOMICS_LIMITS.source), readAt: z.string().max(40) })).optional(),
});
export type EconomicsPatch = z.infer<typeof economicsPatchSchema>;

/** A patch merged over the stored record: a scenario sent replaces its values (missing keys from the stored or default ones), unknown input keys drop. */
export function mergeEconomics(stored: Economics | undefined, patch: EconomicsPatch, by: "team" | "agent", now = new Date().toISOString()): Economics {
  const base = stored && stored.family === patch.family ? stored : defaultEconomics(patch.family, now);
  const scenarios = { ...base.scenarios };
  for (const s of SCENARIOS) {
    const v = patch.scenarios?.[s];
    if (v) scenarios[s] = normalizeValues(patch.family, { ...base.scenarios[s], ...v });
  }
  const sources = { ...(base.sources ?? {}), ...(patch.sources ?? {}) };
  return normalizeEconomics({ family: patch.family, scenarios, chosen: patch.chosen ?? base.chosen, sources, updatedAt: now, by }) as Economics;
}

/** Compact dollars for sentences, $4.2M, $980K, $12,000. */
export function formatScale(n: number): string {
  const trim = (s: string) => s.replace(/\.0$/, "");
  if (n >= 1e9) return `$${trim((n / 1e9).toFixed(n >= 1e11 ? 0 : 1))}B`;
  if (n >= 1e6) return `$${trim((n / 1e6).toFixed(n >= 1e8 ? 0 : 1))}M`;
  if (n >= 1e4) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** One sentence per scenario, for the summary card, the chart and the prompts. */
export function breakEvenSentence(economics: Economics, scenario: Scenario = economics.chosen): string {
  const out = computeEconomics(economics.family, economics.scenarios[scenario]);
  const name = ECONOMICS_COPY.scenarios[scenario].toLowerCase();
  if (!out || out.breakEvenScale === null) return ECONOMICS_COPY.summaryNever(name);
  return ECONOMICS_COPY.summary(name, formatScale(out.breakEvenScale), out.scaleLabel);
}

/** The lines the exports and the pack prompt carry. */
export function economicsLines(economics: Economics): string[] {
  const out = computeEconomics(economics.family, economics.scenarios[economics.chosen]);
  if (!out) return [ECONOMICS_COPY.governance];
  const scenario = ECONOMICS_COPY.scenarios[economics.chosen];
  return [
    `${ECONOMICS_COPY.families[economics.family]}, ${scenario.toLowerCase()} case at ${formatScale(out.scale)} ${out.scaleLabel}.`,
    `Monthly revenue ${formatScale(out.revenueMonthly)}, monthly cost ${formatScale(out.costMonthly)}.`,
    breakEvenSentence(economics),
    ...(out.lpCostMonthly !== undefined ? [ECONOMICS_COPY.outputs.lpCost(formatScale(out.lpCostMonthly))] : []),
    `Inputs, ${inputsFor(economics.family).map((i) => `${i.label.toLowerCase()} ${economics.scenarios[economics.chosen][i.key]}${i.unit === "pct" ? "%" : i.unit === "usd" ? " dollars" : i.unit === "months" ? " months" : i.unit === "x" ? "x" : ""}`).join(", ")}.`,
  ];
}
