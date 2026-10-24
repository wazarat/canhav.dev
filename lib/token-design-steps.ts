import { POST_LAUNCH_MILESTONE_COPY } from "@/content/ideation";
import { TOKEN_DESIGN_LIMITS, type TokenDesignDoc, isSaleEvent, validateTokenDesignDoc, vestedCohorts } from "@/lib/ideation";
import { validateMilestones } from "@/lib/journey";

/**
 * The seven sections of the token design editor (M131, essentials first)
 * and what each still needs. Rationale, Supply, Vesting, Distribution,
 * Market, Governance (with the post launch answers under More) and Legal.
 * Pure, shared by the editor, AGENTS.md and get_project_status so an agent
 * sees the same open sections the team does.
 */
export const TOKEN_DESIGN_STEP_LABELS = ["Rationale", "Supply", "Vesting", "Distribution", "Market", "Governance", "Legal"] as const;

export type TokenDesignStep = (typeof TOKEN_DESIGN_STEP_LABELS)[number];

export interface TokenDesignStepProblems {
  /** One entry per section, in TOKEN_DESIGN_STEP_LABELS order, null when complete. */
  steps: Array<string | null>;
  /** The first problem validateTokenDesignDoc reports, what the Publish button shows. */
  overall: string | null;
}

export function tokenDesignStepProblems(doc: TokenDesignDoc): TokenDesignStepProblems {
  const L = TOKEN_DESIGN_LIMITS;
  const a = doc.supply.allocations;
  const sum = a.team + a.investors + a.treasuryEcosystem + a.public + a.liquidity + a.advisors + a.other;

  const rationale =
    !doc.rationale.why || !doc.rationale.path || doc.rationale.beyondDatabaseRow.trim().length < L.beyondDatabaseRow.min ? "Rationale incomplete" : null;

  const supply =
    doc.name.trim().length < L.name.min || !doc.ticker.trim() || doc.supply.total < L.supplyTotal.min || !doc.supply.policy || sum !== 100 || (a.other > 0 && !a.otherLabel?.trim())
      ? "Supply incomplete"
      : null;

  const needed = vestedCohorts(a);
  const vesting =
    needed.length === 0
      ? null
      : needed.some((c) => !doc.vesting.cohorts.find((r) => r.cohort === c)) ||
          doc.vesting.cohorts.some((r) => r.cliffMonths > r.durationMonths) ||
          !doc.vesting.release ||
          !doc.vesting.founderLeaves
        ? "Vesting incomplete"
        : null;

  const s = doc.distribution.sale;
  const distribution = !doc.distribution.event
    ? "Distribution incomplete"
    : isSaleEvent(doc.distribution.event) && (!s || !(s.price > 0) || !(s.hardCap > 0) || !s.access || !s.undersubscription)
      ? "Sale terms incomplete"
      : null;

  const m = doc.market.atLaunch;
  const market = !doc.market.when
    ? "Market incomplete"
    : doc.market.when === "at_launch" && (!m || !(m.liquidityEth > 0) || m.ethSource.trim().length < L.ethSource.min || !m.lp || !m.antiSniping || (m.lp === "locked" && !m.lpLockMonths))
      ? "Launch-market terms incomplete"
      : null;

  // The post launch answers sit under Governance since M131; only a half filled milestone list is a problem (M48).
  const governance = Object.values(doc.governance).some((d) => !["in_place", "legal_ops", "planned_before_mainnet", "not_yet"].includes(d.status))
    ? "Governance incomplete"
    : doc.postLaunch.milestones !== undefined && validateMilestones(doc.postLaunch.milestones)
      ? POST_LAUNCH_MILESTONE_COPY.stepProblem
      : null;

  const legal = doc.legal.counsel ? null : "Legal incomplete";

  return { steps: [rationale, supply, vesting, distribution, market, governance, legal], overall: validateTokenDesignDoc(doc) };
}

/** The sections still open, by label, for an agent. */
export function tokenDesignOpenSections(doc: TokenDesignDoc): string[] {
  const { steps } = tokenDesignStepProblems(doc);
  return TOKEN_DESIGN_STEP_LABELS.filter((_, i) => steps[i] !== null);
}
