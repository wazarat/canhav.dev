import "server-only";

import { DRAFT_VOICE } from "@/lib/draft/context";
import { registerDraftKind } from "@/lib/draft/kinds";
import type { ProjectDoc } from "@/lib/ideation";
import { DEFAULT_CADENCE, UPDATE_LIMITS, cleanWeeklyDraft, periodLabel, periodOf, weeklyDraftSchema } from "@/lib/updates";
import { weekActivity } from "@/lib/updates-db";

/**
 * The weekly update (M124): a short status post from the week's activity
 * (agent sessions and changes, check runs, the GitHub sync line, the
 * agent's summary), for the team to edit and publish. The body carries
 * projectId so the activity can be read.
 */
registerDraftKind("weekly", {
  schema: weeklyDraftSchema,
  clean: cleanWeeklyDraft,
  extras: async (doc: ProjectDoc, body) => {
    const projectId = typeof body.projectId === "string" ? body.projectId : null;
    const cadence = doc.updateCadence ?? DEFAULT_CADENCE;
    const period = periodOf(cadence);
    const lines: string[] = [`## This period (${periodLabel(cadence, period)}, the team posts ${cadence.replace(/_/g, " ")})`]; // copy-ok, model context
    if (projectId) {
      const a = await weekActivity(projectId, `${period}T00:00:00Z`);
      if (a.sessions.length) lines.push("", "Agent sessions:", ...a.sessions.map((s) => `- ${s.at.slice(0, 10)} ${s.title ?? ""} ${s.message ?? ""}`.trim())); // copy-ok, model context
      if (a.changes.length) lines.push("", "Agent changes:", ...a.changes.map((c) => `- ${c.at.slice(0, 10)} ${c.kind} (${c.status})${c.note ? `, ${c.note}` : ""}`)); // copy-ok, model context
      if (a.checks.length) lines.push("", "Check runs:", ...a.checks.map((c) => `- ${c.at.slice(0, 10)} ${c.tool} ${c.result}`)); // copy-ok, model context
    }
    if (doc.githubSync) lines.push("", `GitHub sync: commit ${doc.githubSync.sha.slice(0, 7)} on ${doc.githubSync.at.slice(0, 10)}, ${doc.githubSync.contracts} contracts, ${doc.githubSync.steps} steps.`); // copy-ok, model context
    if (doc.summary) lines.push("", "Agent summary, built:", ...doc.summary.built.map((l) => `- ${l}`), "", "Being built:", ...doc.summary.building.map((l) => `- ${l}`)); // copy-ok, model context
    if (lines.length === 1) lines.push("", "No recorded activity in this period. Write from the record and say it was quiet."); // copy-ok, model context
    return [lines.join("\n")];
  },
  instructions: () =>
    `${DRAFT_VOICE}\n\nWrite the team's update for the public page covering the period in the context (a day, two days or a week). The body is two or three short paragraphs, at most ${UPDATE_LIMITS.body.max} characters, in the first person plural, what landed in the period, what is next, and one honest line on what is blocked or slow. Then up to ${UPDATE_LIMITS.highlights.max} highlights of at most ${UPDATE_LIMITS.highlights.each} characters each, one fact per highlight. Nothing that the activity does not support; say the period was quiet if it was.`,
  ask: () => "Draft the update for this period.",
  fixture: (doc) => ({
    body: `In this period we kept building ${doc.name || "the project"}. The record moved forward and the agent reported its sessions; nothing shipped to users yet. Next week we take the open build steps and the review passes. (Fixture, no model key is set locally.)`,
    highlights: ["Record updated", "Agent sessions reported"],
  }),
});
