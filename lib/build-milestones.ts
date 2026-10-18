import {
  type KitStep,
  type ProductSection,
  type ProjectKit,
  type StepGroup,
  groupState,
} from "@/lib/kits";

/**
 * The four build milestones of the BUILD page (M93). Every build step sits
 * under one of them, decided by the editor step the catalog gave it, so the
 * Build tab, the MCP tools and the exports all group the same way. Pure,
 * no React and no content, so the server tools can import it.
 */
export type Milestone = "design" | "testnet" | "review" | "launch";

/** Milestone order on the page. */
export const MILESTONES: readonly Milestone[] = ["design", "testnet", "review", "launch"];

/**
 * The editor step a catalog item informs decides its milestone. Launch has
 * no catalog steps of its own; its rows are derived from the record
 * (deployments, token, publishing).
 */
export const STEP_MILESTONE: Record<KitStep, Milestone> = {
  basics: "design",
  architecture: "design",
  reality: "testnet",
  security: "review",
  review: "review",
};

/** The milestone of an editor step. A step the team added carries none and lands under Design. */
export function milestoneOfStep(step: KitStep | null | undefined): Milestone {
  return step ? STEP_MILESTONE[step] : "design";
}

/**
 * The milestone of a step group. Custom steps (id prefix "custom.") go to
 * Design whatever editor step their group carries, since customGroup fills
 * in "review" only as a placeholder.
 */
export function milestoneOf(group: Pick<StepGroup, "key" | "step"> & { custom?: true }): Milestone {
  if (group.custom || group.key.startsWith("custom.")) return "design";
  return STEP_MILESTONE[group.step];
}

/** Every group of the sections bucketed by milestone, section order kept inside each bucket. */
export function groupsByMilestone(sections: readonly ProductSection[]): Record<Milestone, StepGroup[]> {
  const out: Record<Milestone, StepGroup[]> = { design: [], testnet: [], review: [], launch: [] };
  for (const section of sections) for (const g of section.groups) out[milestoneOf(g)].push(g);
  return out;
}

type StepStateKit = Pick<ProjectKit, "checklist" | "notApplicable">;

/**
 * What to do next (the Now view): the first open or partial groups in
 * milestone order then section order. Done and not applicable groups are
 * skipped. At most `limit` rows.
 */
export function nowSteps(
  groups: Readonly<Record<Milestone, readonly StepGroup[]>>,
  kit: StepStateKit | undefined,
  limit = 3,
): StepGroup[] {
  const out: StepGroup[] = [];
  for (const m of MILESTONES) {
    for (const g of groups[m]) {
      if (out.length >= limit) return out;
      const state = groupState(g, kit);
      if (state === "open" || state === "partial") out.push(g);
    }
  }
  return out.slice(0, limit);
}
