import { PROJECT_LIMITS, type ProjectDoc, validateProjectDoc } from "@/lib/ideation";
import { docSectors } from "@/lib/sectors";
import { projectChainOf } from "@/lib/chains";
import { FIELD_TAB, openFields } from "@/lib/project-fields";

/**
 * What stops a project from publishing, by area (M93, cut down in M130),
 * kept here so the Studio tabs and the readiness list read one source. Since
 * M130 only the name, a sector, what it does, the stage and the Robinhood
 * acknowledgement block; the contract and security fields are recommended
 * and counted by `recommendedOpen`. `overall` is the first problem
 * validateProjectDoc reports, which is what the Publish button shows.
 */
export type ProblemArea = "building" | "basics" | "reality" | "overall";

export type ProjectProblems = Record<ProblemArea, string | null>;

/** The two Studio tabs that hold publish gated fields. */
export type ProblemTab = "decisions" | "publish";

export const PROBLEM_COPY = {
  building: "Pick a sector",
  basics: "Name, what it does or the stage is missing",
  reality: "The distribution acknowledgement is missing",
} as const;

export function projectProblems(doc: ProjectDoc): ProjectProblems {
  const L = PROJECT_LIMITS;
  const short = (v: string, min: number) => v.trim().length < min;

  const building = docSectors(doc).length < L.sectors.min ? PROBLEM_COPY.building : null;
  const basics = short(doc.name, L.name.min) || short(doc.whatItDoes, L.whatItDoes.min) || !doc.stage ? PROBLEM_COPY.basics : null;
  const reality = projectChainOf(doc) === "robinhood_testnet" && doc.mythAck !== true ? PROBLEM_COPY.reality : null;

  return { building, basics, reality, overall: validateProjectDoc(doc) };
}

/** The recommended fields still open, by the tab that edits them (M130). */
export function recommendedOpen(doc: ProjectDoc): Record<ProblemTab, number> {
  const out: Record<ProblemTab, number> = { decisions: 0, publish: 0 };
  for (const f of openFields(doc)) out[FIELD_TAB[f.key]] += 1;
  return out;
}

/** Which areas each tab owns. Decisions holds the classification, Publish the record. */
export const TAB_AREAS: Record<ProblemTab, readonly Exclude<ProblemArea, "overall">[]> = {
  decisions: ["building"],
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
