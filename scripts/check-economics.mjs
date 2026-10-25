#!/usr/bin/env node
/**
 * Unit economics check (M166). Runs lib/economics.ts under node (type
 * stripping, relative imports only) against the hand calculated fixtures
 * in lib/economics.fixtures.ts, and a few shape rules: every product
 * shape maps to a family, the series grows with the scale, a governance
 * stack has no outputs, the normalizer clamps and is idempotent.
 *
 *   npm run check:economics
 */
import { ECONOMICS_FAMILIES, SHAPE_ECONOMICS_FAMILY, computeEconomics, defaultEconomics, normalizeEconomics, seriesFor } from "../lib/economics.ts";
import { ECON_FIXTURES } from "../lib/economics.fixtures.ts";

const problems = [];
const near = (a, b, tol = 0.01) => (a === null || b === null ? a === b : Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)));

for (const f of ECON_FIXTURES) {
  const out = computeEconomics(f.family, f.values);
  if (!out) {
    problems.push(`${f.family}: no outputs`);
    continue;
  }
  const expect = (name, got, want) => {
    if (!near(got, want)) problems.push(`${f.family}: ${name} is ${got}, expected ${want}`);
  };
  expect("revenueMonthly", out.revenueMonthly, f.revenueMonthly);
  expect("costMonthly", out.costMonthly, f.costMonthly);
  expect("breakEvenScale", out.breakEvenScale, f.breakEvenScale);
  if (out.monthsToBreakEven !== f.monthsToBreakEven) problems.push(`${f.family}: monthsToBreakEven is ${out.monthsToBreakEven}, expected ${f.monthsToBreakEven}`);
  if (f.lpCostMonthly !== undefined) expect("lpCostMonthly", out.lpCostMonthly, f.lpCostMonthly);
  const series = seriesFor(f.family, f.values, 12);
  for (let i = 1; i < series.length; i++) if (series[i].revenue < series[i - 1].revenue || series[i].scale <= series[i - 1].scale) problems.push(`${f.family}: the series does not grow with the scale`);
}

// Every shape has a family (tsc holds the record to the shape list; this holds the values) and every family has a fixture or is governance.
const shapes = Object.keys(SHAPE_ECONOMICS_FAMILY);
if (shapes.length !== 24) problems.push(`${shapes.length} shapes mapped, expected 24`);
for (const s of shapes) if (!ECONOMICS_FAMILIES.includes(SHAPE_ECONOMICS_FAMILY[s])) problems.push(`shape ${s} has no family`);
for (const fam of ECONOMICS_FAMILIES) if (fam !== "governance" && !ECON_FIXTURES.some((f) => f.family === fam)) problems.push(`family ${fam} has no fixture`);
if (computeEconomics("governance", {}) !== null) problems.push("governance should have no outputs");

// The normalizer clamps, fills and is idempotent.
const n1 = normalizeEconomics({ family: "lending", scenarios: { base: { tvl: -5, utilizationPct: 250, bogus: 1 } }, chosen: "nope", sources: { tvl: { source: "DefiLlama", readAt: "2026-10-24T00:00:00.000Z" }, bogus: { source: "x", readAt: "2026-10-24" } } });
if (!n1 || n1.scenarios.base.tvl !== 0 || n1.scenarios.base.utilizationPct !== 100 || "bogus" in n1.scenarios.base || n1.chosen !== "base" || !n1.sources?.tvl || n1.sources.bogus) problems.push("normalizeEconomics does not clamp, drop or default as it should");
if (n1 && JSON.stringify(normalizeEconomics(n1)) !== JSON.stringify(n1)) problems.push("normalizeEconomics is not idempotent");
const d = defaultEconomics("vaults", "2026-10-24T00:00:00.000Z");
if (d.scenarios.low.tvl * 4 !== d.scenarios.high.tvl) problems.push("defaultEconomics low and high scales are not half and double");
if (normalizeEconomics({ family: "nope" }) !== null) problems.push("an unknown family should normalize to null");

for (const p of problems) console.error(`economics: ${p}`);
console.log(problems.length ? `economics: ${problems.length} problem${problems.length === 1 ? "" : "s"}` : `economics: ${ECON_FIXTURES.length} fixtures pass, ${shapes.length} shapes mapped`);
process.exitCode = problems.length ? 1 : 0;
