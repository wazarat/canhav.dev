import { PROJECT_LIMITS, type ProjectDoc, validateProjectDoc } from "@/lib/ideation";
import { SECTOR_SUBSECTORS, docSectors, requiresSubsector } from "@/lib/sectors";
import { projectChainOf } from "@/lib/chains";

/**
 * What stops a project from publishing, by area (M93). The same rules the
 * old editor's step dots follow, kept here so the BUILD tabs and the
 * readiness list read one source. `overall` is the first problem
 * validateProjectDoc reports, which is what the Publish button shows.
 *
 * The old editor keeps its own copy of these rules until Phase 7 removes it.
 */
export type ProblemArea = "basics" | "architecture" | "security" | "reality" | "overall";

export type ProjectProblems = Record<ProblemArea, string | null>;

/** The two BUILD tabs that hold publish gated fields. */
export type ProblemTab = "decisions" | "publish";

export const PROBLEM_COPY = {
  basics: "Basics incomplete",
  architecture: "Architecture incomplete",
  security: "Security incomplete",
  reality: "Reality check incomplete",
} as const;

export function projectProblems(doc: ProjectDoc): ProjectProblems {
  const L = PROJECT_LIMITS;
  const short = (v: string, min: number) => v.trim().length < min;

  const sectors = docSectors(doc);
  const subsectors = doc.subsectors ?? [];
  const basics =
    short(doc.name, L.name.min) ||
    sectors.length < L.sectors.min ||
    (sectors.includes("other") &&
      !doc.sectorOther?.trim() &&
      !subsectors.some((v) => SECTOR_SUBSECTORS.other.includes(v))) ||
    sectors.some(
      (sec) =>
        requiresSubsector(sec) &&
        subsectors.filter((v) => SECTOR_SUBSECTORS[sec].includes(v)).length < L.subsectors.min,
    ) ||
    short(doc.whatItDoes, L.whatItDoes.min) ||
    !doc.stage
      ? PROBLEM_COPY.basics
      : null;

  const a = doc.architecture;
  const architecture =
    short(a.contracts, L.architectureField.min) ||
    (!a.externalDepsNone &&
      (a.externalDeps.length === 0 ||
        a.externalDeps.some((d) => short(d.name, L.externalDepName.min)))) ||
    !a.oracleUse ||
    (a.oracleUse === "uses" && short(a.oracles, L.architectureField.min)) ||
    short(a.adminFunctions, L.architectureField.min) ||
    !a.upgradeability
      ? PROBLEM_COPY.architecture
      : null;

  const decls = Object.values(doc.security);
  const security =
    !doc.worstCase ||
    decls.some((d) => !["in_place", "legal_ops", "planned_before_mainnet", "not_yet"].includes(d.status))
      ? PROBLEM_COPY.security
      : null;

  const reality =
    (projectChainOf(doc) === "robinhood_testnet" && doc.mythAck !== true) ||
    short(doc.firstHundredUsers, L.firstHundredUsers.min)
      ? PROBLEM_COPY.reality
      : null;

  return { basics, architecture, security, reality, overall: validateProjectDoc(doc) };
}

/** Which areas each tab owns. Decisions holds the architecture and security fields, Publish the record. */
export const TAB_AREAS: Record<ProblemTab, readonly Exclude<ProblemArea, "overall">[]> = {
  decisions: ["architecture", "security"],
  publish: ["basics", "reality"],
};

/**
 * The first open problem per tab, null when the tab is complete. The tab
 * strip shows a dot where this is set and the readiness list names the tab.
 */
export function tabProblems(problems: ProjectProblems): Record<ProblemTab, string | null> {
  const first = (tab: ProblemTab) => TAB_AREAS[tab].map((a) => problems[a]).find((p) => p !== null) ?? null;
  return { decisions: first("decisions"), publish: first("publish") };
}

/** The tab that owns an area, for the readiness list. */
export function tabOfArea(area: Exclude<ProblemArea, "overall">): ProblemTab {
  return TAB_AREAS.decisions.includes(area) ? "decisions" : "publish";
}
