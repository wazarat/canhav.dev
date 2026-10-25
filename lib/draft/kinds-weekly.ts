import "server-only";

import { DRAFT_VOICE } from "@/lib/draft/context";
import { registerDraftKind } from "@/lib/draft/kinds";
import { weeklyContext } from "@/lib/draft/weekly-context";
import type { ProjectDoc } from "@/lib/ideation";
import { UPDATE_LIMITS, cleanWeeklyDraft, weeklyDraftSchema } from "@/lib/updates";

/**
 * The team update (M124, kind weekly): a short status post from the period's activity
 * (agent sessions and changes, check runs, the GitHub sync line, the
 * agent's summary), for the team to edit and publish. The body carries
 * projectId so the activity can be read.
 */
registerDraftKind("weekly", {
  schema: weeklyDraftSchema,
  clean: cleanWeeklyDraft,
  extras: async (doc: ProjectDoc, body) => [await weeklyContext(doc, typeof body.projectId === "string" ? body.projectId : null)],
  instructions: () =>
    `${DRAFT_VOICE}\n\nWrite the team's update for the public page covering the period in the context (a day, two days or a week). The body is two or three short paragraphs, at most ${UPDATE_LIMITS.body.max} characters, in the first person plural, what landed in the period, what is next, and one honest line on what is blocked or slow. Then up to ${UPDATE_LIMITS.highlights.max} highlights of at most ${UPDATE_LIMITS.highlights.each} characters each, one fact per highlight, each with the build milestone it moved (design, testnet, review or launch, null when none fits). Nothing that the activity does not support; say the period was quiet if it was.`,
  ask: () => "Draft the update for this period.",
  fixture: (doc) => ({
    body: `In this period we kept building ${doc.name || "the project"}. The record moved forward and the agent reported its sessions; nothing shipped to users yet. Next week we take the open build steps and the review passes. (Fixture, no model key is set locally.)`,
    highlights: [
      { text: "Record updated", milestone: "design" as const },
      { text: "Agent sessions reported", milestone: null },
    ],
  }),
});
