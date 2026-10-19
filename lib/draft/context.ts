import "server-only";

import { DRAFT_LIMITS } from "@/lib/draft/limits";
import { buildProjectMarkdown } from "@/lib/export-md";
import type { ProjectDoc } from "@/lib/ideation";
import { buildResourcePack, packSummary } from "@/lib/kit-pack";

/**
 * The project as the model reads it (M112): the same markdown the export
 * produces, a short kit summary, then the kind's extras. Cut at the
 * context limit, never silently past it.
 */
export function renderProjectContext(doc: ProjectDoc, extras: string[] = []): string {
  const parts = [buildProjectMarkdown(doc)];
  const pack = buildResourcePack(doc);
  if (pack) {
    const s = packSummary(pack);
    parts.push(
      "",
      "## Kit",
      "",
      `Shapes: ${s.shapeLabels.join(", ") || "none"}. Chain: ${s.chain}. Build steps ${s.sections.checklist.done} of ${s.sections.checklist.total} done.`, // copy-ok, model context
    );
  }
  // The kind's extras carry what the draft is about (the questions, the
  // landscape), so the record is what gets cut, never the extras.
  const tail = extras.filter((e) => e.trim()).map((e) => `\n\n${e.trim()}`).join("");
  const room = Math.max(DRAFT_LIMITS.maxContextChars - tail.length, 4_000);
  const head = parts.join("\n");
  const cutHead = head.length <= room ? head : `${head.slice(0, room)}\n\n(The record was cut here for length.)`;
  return `${cutHead}${tail}`;
}

/** One system line every draft shares. */
export const DRAFT_VOICE =
  "You write for a DeFi team on the chain the record names. Plain words, short sentences, no hype, no bullet lists unless the shape asks for lists. Do not restate the record; build on it. Where the record is silent, say what a reasonable team in this subsector would decide and mark it as an assumption in the text.";
