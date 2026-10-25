import { type EconValues, type EconomicsFamily, defaultValues } from "./economics.ts";

/**
 * Hand calculated cases for the unit economics model (M166), one per
 * family, asserted by scripts/check-economics.mjs. Costs are the same
 * in every case: team 36,000 and infrastructure 2,000 a month, a 24,000
 * audit over twelve months, nothing else, 40,000 a month in all.
 */
const COSTS = { incentivesMonthly: 0, auditOneOff: 24_000, auditMonths: 12, infraMonthly: 2_000, teamMonthly: 36_000, oracleKeeperMonthly: 0, growthMonthlyPct: 10 };

export interface EconFixture {
  family: EconomicsFamily;
  values: EconValues;
  revenueMonthly: number;
  costMonthly: number;
  breakEvenScale: number | null;
  monthsToBreakEven: number | null;
  lpCostMonthly?: number;
}

export const ECON_FIXTURES: readonly EconFixture[] = [
  // 10M x 80% x 6% x 10% / 12 = 4,000. Break even 40,000 / 0.0004 = 100M. ln(10) / ln(1.1) = 24.16, so 25 months.
  { family: "lending", values: { ...defaultValues("lending"), ...COSTS, tvl: 10_000_000, utilizationPct: 80, borrowRatePct: 6, reserveFactorPct: 10, protocolFeePct: 0 }, revenueMonthly: 4_000, costMonthly: 40_000, breakEvenScale: 100_000_000, monthsToBreakEven: 25 },
  // (10M x 12% x 10% + 10M x 1%) / 12 = 18,333.33. Break even 40,000 / 0.00183333 = 21,818,181.8. ln(2.18) / ln(1.1) = 8.18, so 9 months.
  { family: "vaults", values: { ...defaultValues("vaults"), ...COSTS, tvl: 10_000_000, strategyYieldPct: 12, performanceFeePct: 10, managementFeePct: 1, leverage: 1 }, revenueMonthly: 18_333.33, costMonthly: 40_000, breakEvenScale: 21_818_181.82, monthsToBreakEven: 9 },
  // 1M x 50% x 30 x 0.3% x 10% = 4,500; LP cost 1M x 5% / 12 = 4,166.67. Break even 40,000 / 0.0045 = 8,888,888.9. ln(8.89) / ln(1.1) = 22.9, so 23 months.
  { family: "pools", values: { ...defaultValues("pools"), ...COSTS, tvl: 1_000_000, volumeToTvlPct: 50, feeTierPct: 0.3, protocolSharePct: 10, impermanentLossPct: 5 }, revenueMonthly: 4_500, costMonthly: 40_000, breakEvenScale: 8_888_888.89, monthsToBreakEven: 23, lpCostMonthly: 4_166.67 },
  // 100M x (0.05% + 0.01%) x 80% = 48,000, above the cost, so 0 months. Break even 40,000 / 0.00048 = 83,333,333.3.
  { family: "perps", values: { ...defaultValues("perps"), ...COSTS, volume: 100_000_000, feeRatePct: 0.05, fundingSharePct: 0.01, insuranceSharePct: 20 }, revenueMonthly: 48_000, costMonthly: 40_000, breakEvenScale: 83_333_333.33, monthsToBreakEven: 0 },
  // 10M x 4% x 10% / 12 = 3,333.33. Break even 40,000 / 0.000333 = 120M. ln(12) / ln(1.1) = 26.07, so 27 months.
  { family: "staking", values: { ...defaultValues("staking"), ...COSTS, stakedTvl: 10_000_000, rewardRatePct: 4, commissionPct: 10 }, revenueMonthly: 3_333.33, costMonthly: 40_000, breakEvenScale: 120_000_000, monthsToBreakEven: 27 },
  // 10M x (1% + 0 - 0) / 12 = 8,333.33. Break even 40,000 / 0.000833 = 48M. ln(4.8) / ln(1.1) = 16.46, so 17 months.
  { family: "rwa", values: { ...defaultValues("rwa"), ...COSTS, aum: 10_000_000, feeRateAumPct: 1, premiumRatePct: 0, expectedLossPct: 0 }, revenueMonthly: 8_333.33, costMonthly: 40_000, breakEvenScale: 48_000_000, monthsToBreakEven: 17 },
];
