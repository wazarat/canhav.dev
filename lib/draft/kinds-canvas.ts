import "server-only";

import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { AUDIENCE_OPTIONS, PAYER_OPTIONS, optionLabel } from "@/content/ideation";
import { CANVAS_BLOCKS, CANVAS_LIMITS, type CanvasBlock, canvasBlockDraftSchema, canvasDraftSchema, isCanvasBlock } from "@/lib/canvas";
import { DRAFT_VOICE } from "@/lib/draft/context";
import { registerDraftKind } from "@/lib/draft/kinds";
import { cutAtWord } from "@/lib/text";
import { type ProjectDoc, docAudience, filledConsumerPersonas, filledPersonas } from "@/lib/ideation";

/** The customer and payer facts the canvas builds on, as an extra block. */
function customerExtras(doc: ProjectDoc): string[] {
  const lines: string[] = ["## Customers and payer"]; // copy-ok, model context
  lines.push(`Audience: ${optionLabel(AUDIENCE_OPTIONS, docAudience(doc))}.`); // copy-ok, model context
  for (const p of filledPersonas(doc)) lines.push(`Persona: team of ${p.teamSize || "?"}, ${p.geography || "?"}, ${p.industry || "?"}, contact ${p.primaryContact || "?"}, revenue ${p.revenueRange || "?"}.`); // copy-ok, model context
  for (const p of filledConsumerPersonas(doc)) lines.push(`Consumer: age ${p.ageRange || "?"}, ${p.geography || "?"}, ${p.cryptoExperience || "?"}, found via ${p.howTheyFindYou || "?"}, holds ${p.holdings || "?"}.`); // copy-ok, model context
  lines.push(`Payer: ${doc.payer ? optionLabel(PAYER_OPTIONS, doc.payer) : "not set"}${doc.whoPays ? `, ${doc.whoPays}` : ""}.`); // copy-ok, model context
  if (doc.firstHundredUsers) lines.push(`First hundred users: ${doc.firstHundredUsers}`); // copy-ok, model context
  if (doc.whyThisChain) lines.push(`Why this chain: ${doc.whyThisChain}`); // copy-ok, model context
  return [lines.join("\n")];
}

const labels = STUDIO_PLUS_COPY.canvas.blocks;

function blockGuide(): string {
  return CANVAS_BLOCKS.map((b) => `${b}: ${labels[b].label}. ${labels[b].hint}`).join("\n"); // copy-ok, model context
}

function fixtureFor(doc: ProjectDoc): Record<CanvasBlock, string> {
  const name = doc.name || "The product";
  return Object.fromEntries(CANVAS_BLOCKS.map((b) => [b, `${labels[b].label} for ${name}, drafted from the record. (Fixture, no model key is set locally.)`])) as Record<CanvasBlock, string>;
}

registerDraftKind("canvas", {
  schema: canvasDraftSchema,
  clean: (value) => Object.fromEntries(CANVAS_BLOCKS.map((b) => [b, cutAtWord((value[b] ?? "").trim(), CANVAS_LIMITS.block.max)])) as typeof value,
  extras: (doc) => customerExtras(doc),
  instructions: () =>
    `${DRAFT_VOICE}\n\nWrite a Business Model Canvas for this project, one paragraph of at most 600 characters per block, no lists. Name the payer from the record in revenue streams. The blocks are\n${blockGuide()}`,
  ask: () => "Draft all nine blocks.",
  fixture: (doc) => fixtureFor(doc),
});

registerDraftKind("canvas_block", {
  schema: canvasBlockDraftSchema,
  clean: (value) => ({ text: cutAtWord(value.text.trim(), CANVAS_LIMITS.block.max) }),
  extras: (doc, body) => {
    const block = body.block;
    const current = doc.canvas ?? {};
    const others = CANVAS_BLOCKS.filter((b) => b !== block && current[b]).map((b) => `${labels[b].label}: ${current[b]}`); // copy-ok, model context
    return [...customerExtras(doc), ...(others.length ? [`## The other blocks as they stand\n${others.join("\n")}`] : [])];
  },
  instructions: (_doc, body) => {
    const block = isCanvasBlock(body.block) ? body.block : "valueProposition";
    return `${DRAFT_VOICE}\n\nRewrite one block of the Business Model Canvas, ${labels[block].label}. ${labels[block].hint} One paragraph of at most 600 characters, no lists, consistent with the other blocks.`;
  },
  ask: (_doc, body) => `Redraft ${isCanvasBlock(body.block) ? labels[body.block].label : "the block"}.`,
  fixture: (doc, body) => ({ text: fixtureFor(doc)[isCanvasBlock(body.block) ? body.block : "valueProposition"] }),
});
