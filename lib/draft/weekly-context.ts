import "server-only";

import { sectionsFor } from "@/content/kits/checklists";
import { MILESTONES, groupsByMilestone } from "@/lib/build-milestones";
import type { ProjectDoc } from "@/lib/ideation";
import { groupProgress, kitShapes } from "@/lib/kits";
import { DEFAULT_CADENCE, periodLabel, periodOf } from "@/lib/updates";
import { weekActivity } from "@/lib/updates-db";

/** Done of total per build milestone, for the model (M174). Launch rows are derived elsewhere, so it is left out. */
function milestoneLines(doc: ProjectDoc): string[] {
  const kit = doc.kit;
  const by = groupsByMilestone(sectionsFor(kitShapes(kit), kit ?? {}));
  return MILESTONES.filter((m) => m !== "launch").map((m) => {
    const p = groupProgress(by[m], kit);
    return `${m} ${p.done} of ${p.total}`;
  });
}

/**
 * The period's activity as model context (M124, shared with Auto-summarize
 * in M174): agent sessions and changes, check runs, saved versions, the
 * build progress, the GitHub sync line and the agent's summary.
 */
export async function weeklyContext(doc: ProjectDoc, projectId: string | null): Promise<string> {
  const cadence = doc.updateCadence ?? DEFAULT_CADENCE;
  const period = periodOf(cadence);
  const lines: string[] = [`## This period (${periodLabel(cadence, period)}, the team posts ${cadence.replace(/_/g, " ")})`]; // copy-ok, model context
  if (projectId) {
    const a = await weekActivity(projectId, `${period}T00:00:00Z`);
    if (a.sessions.length) lines.push("", "Agent sessions:", ...a.sessions.map((s) => `- ${s.at.slice(0, 10)} ${s.title ?? ""} ${s.message ?? ""}`.trim())); // copy-ok, model context
    if (a.changes.length) lines.push("", "Agent changes:", ...a.changes.map((c) => `- ${c.at.slice(0, 10)} ${c.kind} (${c.status})${c.note ? `, ${c.note}` : ""}`)); // copy-ok, model context
    if (a.checks.length) lines.push("", "Check runs:", ...a.checks.map((c) => `- ${c.at.slice(0, 10)} ${c.tool} ${c.result}`)); // copy-ok, model context
    if (a.revisions.length) lines.push("", `Saved versions of the record: ${a.revisions.length}, by ${[...new Set(a.revisions.map((r) => r.author))].join(", ")}.`); // copy-ok, model context
  }
  if (doc.kit?.shape) lines.push("", `Build progress: ${milestoneLines(doc).join("; ")}.`); // copy-ok, model context
  if (doc.githubSync) lines.push("", `GitHub sync: commit ${doc.githubSync.sha.slice(0, 7)} on ${doc.githubSync.at.slice(0, 10)}, ${doc.githubSync.contracts} contracts, ${doc.githubSync.steps} steps.`); // copy-ok, model context
  if (doc.summary) lines.push("", "Agent summary, built:", ...doc.summary.built.map((l) => `- ${l}`), "", "Being built:", ...doc.summary.building.map((l) => `- ${l}`)); // copy-ok, model context
  if (lines.length === 1) lines.push("", "No recorded activity in this period. Write from the record and say it was quiet."); // copy-ok, model context
  return lines.join("\n");
}
