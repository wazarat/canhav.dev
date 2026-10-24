import "server-only";

import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { itemTexts } from "@/lib/canvas-items";
import { DRAFT_VOICE } from "@/lib/draft/context";
import { registerDraftKind } from "@/lib/draft/kinds";
import type { ProjectDoc } from "@/lib/ideation";
import { cutAtWord } from "@/lib/text";
import { VALUE_AREAS, VALUE_CANVAS_LIMITS, type ValueArea, isProfileKey, valueCanvasDraftSchema } from "@/lib/value-canvas";

const labels = STUDIO_PLUS_COPY.valueCanvas.areas;

function cleanItems(lines: readonly string[]): string[] {
  return lines
    .map((l) => cutAtWord(l.trim().replace(/^[-*\u2022]\s*/, ""), VALUE_CANVAS_LIMITS.item.max))
    .filter((l) => l.length >= VALUE_CANVAS_LIMITS.item.min)
    .slice(0, VALUE_CANVAS_LIMITS.items.max);
}

function profileOf(doc: ProjectDoc, body: Record<string, unknown>) {
  const key = isProfileKey(String(body.profile ?? "0")) ? String(body.profile ?? "0") : "0";
  return { key, profile: doc.icp?.[Number(key)] ?? null };
}

/** The profile the canvas is for, its trigger and objection, the value proposition block and the competitor line, as an extra block. */
function extras(doc: ProjectDoc, body: Record<string, unknown>): string[] {
  const { key, profile } = profileOf(doc, body);
  const lines: string[] = [`## The customer this canvas is for (profile ${Number(key) + 1})`]; // copy-ok, model context
  if (profile) {
    lines.push(`Name: ${profile.name || "unnamed"}. ${profile.summary}`); // copy-ok, model context
    if (profile.buyingTrigger) lines.push(`Buying trigger: ${profile.buyingTrigger}`); // copy-ok, model context
    if (profile.objection) lines.push(`Objection: ${profile.objection}`); // copy-ok, model context
    if (profile.protocolsTheyUse.length) lines.push(`Protocols they use: ${profile.protocolsTheyUse.join(", ")}`); // copy-ok, model context
  } else lines.push("No profile is written yet; build on the record's customers."); // copy-ok, model context
  const vp = doc.canvas?.valueProposition;
  if (vp?.length) lines.push(`Value proposition block of the business model canvas: ${itemTexts(vp).join("; ")}`); // copy-ok, model context
  if (doc.competitors?.differentiator) lines.push(`How the team says it differs: ${doc.competitors.differentiator}`); // copy-ok, model context
  const current = doc.valueCanvas?.[key as "0" | "1"];
  if (current) {
    const filled = VALUE_AREAS.filter((a) => current[a].length).map((a) => `${labels[a].label}: ${itemTexts(current[a]).join("; ")}`); // copy-ok, model context
    if (filled.length) lines.push("The canvas as it stands", ...filled); // copy-ok, model context
  }
  return [lines.join("\n")];
}

registerDraftKind("value_canvas", {
  schema: valueCanvasDraftSchema,
  clean: (value) => Object.fromEntries(VALUE_AREAS.map((a) => [a, cleanItems(value[a] ?? [])])) as typeof value,
  extras,
  instructions: () =>
    `${DRAFT_VOICE}\n\nWrite a Value Proposition Canvas for this customer. Six areas, each a list of three to six short items of at most ${VALUE_CANVAS_LIMITS.item.max} characters, one idea each. The areas are\n${VALUE_AREAS.map((a) => `${a}: ${labels[a].label}. ${labels[a].hint}`).join("\n")}\nStart the customer side from the profile's trigger and objection; every pain reliever should answer a pain you list and every gain creator a gain.`, // copy-ok, model context
  ask: (_doc, body) => `Draft the six areas for profile ${Number(profileOf(_doc, body).key) + 1}.`,
  fixture: (doc, body) => {
    const { profile } = profileOf(doc, body);
    const who = profile?.name || "the customer";
    return Object.fromEntries(VALUE_AREAS.map((a) => [a, [`${labels[a].label} for ${who}`, "Drafted from the record", "Fixture, no model key is set locally"]])) as Record<ValueArea, string[]>;
  },
});
