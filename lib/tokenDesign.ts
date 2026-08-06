import {
  type CohortVesting,
  type TokenDesignDoc,
  type VestedCohort,
  isSaleEvent,
  vestedCohorts,
} from "@/lib/ideation";

/**
 * Pure tokenomics derivation from a TokenDesignDoc. Never ask for a number we
 * can derive: these run live in the editor (client) and are recomputed when
 * rendering public pages (server) — derived values are never stored.
 *
 * Modeling assumptions (documented here because they shape every output):
 * - Treasury/ecosystem and "other" allocations are held, not circulating —
 *   they never enter the float or the unlock calendar.
 * - Public allocation circulates at month 0 when a distribution event exists;
 *   liquidity circulates at month 0 only when a market exists at launch.
 * - "linear" vesting is the standard schedule: at the cliff month the accrued
 *   fraction (cliff/duration) releases at once, then equal monthly releases
 *   through the duration.
 * - "cliff then linear" releases nothing at the cliff, then spreads the full
 *   amount evenly over the months after it.
 * - "milestone-conditional" cannot be dated, so it is plotted at the latest
 *   possible month (the duration) and `milestoneUncertain` is set.
 */

export type DesignWarning =
  | "low_float"
  | "team_cliff_short"
  | "unlock_cluster"
  | "sale_no_undersub_plan"
  | "rationale_unsure";

export type UnlockCohort = VestedCohort | "public" | "liquidity";

export interface MonthUnlock {
  /** Months since TGE. */
  month: number;
  /** Percent of total supply unlocking this month. */
  totalPct: number;
  byCohort: Partial<Record<UnlockCohort, number>>;
}

export interface DerivedTokenomics {
  /** Percent of total supply circulating at launch. */
  floatAtLaunchPct: number;
  /** Fully-diluted-to-float ratio; null when the float is zero. */
  fdvToFloat: number | null;
  treasuryPct: number;
  unlockCalendar: MonthUnlock[];
  /** Months (>0) where two or more cohorts' first unlocks coincide. */
  clusterMonths: number[];
  teamVsInvestors: {
    team?: CohortVesting;
    investors?: CohortVesting;
    teamCliffShorter: boolean;
  };
  /** True when any cohort is milestone-conditional (calendar is worst-case). */
  milestoneUncertain: boolean;
  warnings: DesignWarning[];
}

const LOW_FLOAT_THRESHOLD_PCT = 5;

/** Text heuristic for "this is a loyalty program wearing a token costume". */
const LOYALTY_PATTERN = /loyalt|reward point|points program|cashback|coupon|discount program/i;

/** Per-cohort monthly unlock amounts (percent of total supply), index = month. */
function cohortSchedule(
  allocationPct: number,
  row: CohortVesting,
  release: TokenDesignDoc["vesting"]["release"],
): number[] {
  const { cliffMonths: c, durationMonths: d } = row;
  const out: number[] = new Array(Math.max(d, c) + 1).fill(0);
  if (allocationPct <= 0) return out;

  if (d <= 0) {
    // No vesting period: everything at the cliff (month 0 when no cliff).
    out[c] = allocationPct;
    return out;
  }
  if (release === "milestone_conditional") {
    out[d] = allocationPct;
    return out;
  }
  if (release === "cliff_then_linear") {
    const span = d - c;
    if (span <= 0) {
      out[d] = allocationPct;
    } else {
      for (let m = c + 1; m <= d; m++) out[m] = allocationPct / span;
    }
    return out;
  }
  // "linear" (default): accrued catch-up at the cliff, then monthly.
  out[c] += (allocationPct * c) / d;
  for (let m = c + 1; m <= d; m++) out[m] += allocationPct / d;
  return out;
}

/** The month a cohort's first tokens actually move. */
function firstUnlockMonth(schedule: number[]): number | null {
  for (let m = 0; m < schedule.length; m++) if (schedule[m] > 1e-9) return m;
  return null;
}

export function deriveTokenomics(doc: TokenDesignDoc): DerivedTokenomics {
  const { allocations } = doc.supply;
  const hasDistribution = doc.distribution.event !== "" && doc.distribution.event !== "none";
  const marketAtLaunch = doc.market.when === "at_launch";

  // --- Unlock calendar ------------------------------------------------------
  const byCohortSchedules = new Map<UnlockCohort, number[]>();
  if (hasDistribution && allocations.public > 0)
    byCohortSchedules.set("public", [allocations.public]);
  if (marketAtLaunch && allocations.liquidity > 0)
    byCohortSchedules.set("liquidity", [allocations.liquidity]);

  let milestoneUncertain = false;
  for (const cohort of vestedCohorts(allocations)) {
    const row = doc.vesting.cohorts.find((r) => r.cohort === cohort);
    if (!row) continue; // draft state; validation requires it at publish
    if (doc.vesting.release === "milestone_conditional") milestoneUncertain = true;
    byCohortSchedules.set(cohort, cohortSchedule(allocations[cohort], row, doc.vesting.release));
  }

  const horizon = Math.max(0, ...[...byCohortSchedules.values()].map((s) => s.length - 1));
  const unlockCalendar: MonthUnlock[] = [];
  for (let month = 0; month <= horizon; month++) {
    const byCohort: MonthUnlock["byCohort"] = {};
    let totalPct = 0;
    for (const [cohort, schedule] of byCohortSchedules) {
      const v = schedule[month] ?? 0;
      if (v > 1e-9) {
        byCohort[cohort] = v;
        totalPct += v;
      }
    }
    unlockCalendar.push({ month, totalPct, byCohort });
  }

  // --- Float and ratios -----------------------------------------------------
  const floatAtLaunchPct = unlockCalendar[0]?.totalPct ?? 0;
  const fdvToFloat = floatAtLaunchPct > 0 ? 100 / floatAtLaunchPct : null;
  const treasuryPct = allocations.treasuryEcosystem;

  // --- Cluster detection: cohorts whose first unlock lands in the same month
  const firstMonths = new Map<number, UnlockCohort[]>();
  for (const [cohort, schedule] of byCohortSchedules) {
    const first = firstUnlockMonth(schedule);
    if (first === null || first === 0) continue; // month 0 is launch, not a cluster
    firstMonths.set(first, [...(firstMonths.get(first) ?? []), cohort]);
  }
  const clusterMonths = [...firstMonths.entries()]
    .filter(([, cohorts]) => cohorts.length >= 2)
    .map(([month]) => month)
    .sort((a, b) => a - b);

  // --- Team vs investors ----------------------------------------------------
  const team = doc.vesting.cohorts.find((r) => r.cohort === "team");
  const investors = doc.vesting.cohorts.find((r) => r.cohort === "investors");
  const teamCliffShorter = Boolean(
    team &&
      investors &&
      allocations.team > 0 &&
      allocations.investors > 0 &&
      team.cliffMonths < investors.cliffMonths,
  );

  // --- Warnings -------------------------------------------------------------
  const warnings: DesignWarning[] = [];
  // A near-zero float is only a problem when tokens are actually meant to
  // circulate — "issue and lock" with no market is a fine reason for 0%.
  if ((hasDistribution || marketAtLaunch) && floatAtLaunchPct < LOW_FLOAT_THRESHOLD_PCT)
    warnings.push("low_float");
  if (teamCliffShorter) warnings.push("team_cliff_short");
  if (clusterMonths.length > 0) warnings.push("unlock_cluster");
  if (isSaleEvent(doc.distribution.event) && doc.distribution.sale?.undersubscription === "no_plan")
    warnings.push("sale_no_undersub_plan");
  if (
    doc.rationale.why === "not_sure" ||
    LOYALTY_PATTERN.test(doc.rationale.beyondDatabaseRow)
  )
    warnings.push("rationale_unsure");

  return {
    floatAtLaunchPct,
    fdvToFloat,
    treasuryPct,
    unlockCalendar,
    clusterMonths,
    teamVsInvestors: { team, investors, teamCliffShorter },
    milestoneUncertain,
    warnings,
  };
}
