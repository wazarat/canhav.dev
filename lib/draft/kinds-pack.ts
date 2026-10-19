import "server-only";

import { GRANT_PROGRAMS, grantProgram } from "@/content/grants";
import { DRAFT_VOICE } from "@/lib/draft/context";
import { registerDraftKind } from "@/lib/draft/kinds";
import type { ProjectDoc } from "@/lib/ideation";
import { PACK_LIMITS, deckDraftSchema, grantsDraftSchema, onepagerDraftSchema } from "@/lib/investor-pack";

/**
 * The investor and grant pack (M126), three kinds on Sonnet: the one
 * pager, the deck and the grant answers for one programme. All three
 * build on the record, the canvas, the ICP and the competitor line,
 * which the project context already carries.
 */
function packExtras(doc: ProjectDoc): string[] {
  const lines: string[] = [];
  if (doc.investorPack?.onepager) lines.push(`## The one pager as it stands\n${doc.investorPack.onepager}`); // copy-ok, model context
  if (doc.summary) lines.push(`## What the agent reports as built\n${doc.summary.built.map((l) => `- ${l}`).join("\n")}`); // copy-ok, model context
  return lines;
}

registerDraftKind("onepager", {
  schema: onepagerDraftSchema,
  long: true,
  extras: (doc) => packExtras(doc),
  instructions: () =>
    `${DRAFT_VOICE}\n\nWrite the investor one pager as markdown with these headings in order, each a short paragraph, at most ${PACK_LIMITS.onepager.max} characters in all. The problem. The product. Who pays and why. Where it stands (what is built, on which chain, what is verified). The market and the one or two names it is compared with. The team's ask. Numbers only from the record; where it is silent, say so instead of inventing.`,
  ask: () => "Draft the one pager.",
  fixture: (doc) => ({ onepager: `## The problem\n\nTeams in this subsector lack a plain path to a credible launch.\n\n## The product\n\n${doc.whatItDoes || "The product as the record describes it."}\n\n## Who pays and why\n\nThe payer the record names, for the value the canvas states.\n\n## Where it stands\n\nOn the testnet the record names. (Fixture, no model key is set locally.)\n\n## The ask\n\nTo be stated by the team.` }),
});

registerDraftKind("deck", {
  schema: deckDraftSchema,
  long: true,
  extras: (doc) => packExtras(doc),
  instructions: () =>
    `${DRAFT_VOICE}\n\nWrite a short investor deck as ${PACK_LIMITS.deck.slides.min} to ${PACK_LIMITS.deck.slides.max} slides, each a title of at most ${PACK_LIMITS.deck.title} characters and up to ${PACK_LIMITS.deck.bullets.max} bullets of at most ${PACK_LIMITS.deck.bullets.each} characters. The order a reviewer expects, problem, product, how it works, who pays, where it stands, market and competition, the plan, the team, the ask. One fact per bullet, from the record.`,
  ask: () => "Draft the deck.",
  fixture: (doc) => ({
    deck: [
      { title: doc.name || "The project", bullets: ["One line on what it does, from the record."] },
      { title: "The problem", bullets: ["Who has it", "What it costs them"] },
      { title: "The product", bullets: [doc.whatItDoes.slice(0, 180) || "The product as the record describes it."] },
      { title: "Where it stands", bullets: ["Testnet build as recorded", "(Fixture, no model key is set locally.)"] },
      { title: "The ask", bullets: ["To be stated by the team"] },
    ],
  }),
});

registerDraftKind("grants", {
  schema: grantsDraftSchema,
  long: true,
  extras: (doc, body) => {
    const prog = grantProgram(typeof body.program === "string" ? body.program : "") ?? GRANT_PROGRAMS[0];
    const lines = [`## The programme\n${prog.name}. ${prog.blurb}`, "## The questions, with the word limit each", ...prog.questions.map((q) => `- ${q.id}: ${q.label} (${q.words} words)`)]; // copy-ok, model context
    return [...packExtras(doc), lines.join("\n")];
  },
  instructions: (_doc, body) => {
    const prog = grantProgram(typeof body.program === "string" ? body.program : "") ?? GRANT_PROGRAMS[0];
    return `${DRAFT_VOICE}\n\nAnswer every question of the ${prog.name} form listed in the context, as answers with the question id and the answer text, each within its word limit, in the first person plural. Claims only from the record; where a question asks for something the record lacks (budget, team), write the shape of an answer and mark the gap in square brackets for the team to fill.`;
  },
  ask: (_doc, body) => `Draft the ${(grantProgram(typeof body.program === "string" ? body.program : "") ?? GRANT_PROGRAMS[0]).name} answers.`,
  fixture: (_doc, body) => {
    const prog = grantProgram(typeof body.program === "string" ? body.program : "") ?? GRANT_PROGRAMS[0];
    return { answers: prog.questions.map((q) => ({ question: q.id, answer: `[${q.label}, drafted locally. Fixture, no model key is set.]` })) };
  },
});
