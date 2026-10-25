import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { buildProgress } from "@/content/kits/checklists";
import { mcpAlias } from "@/content/launch";
import { chainInfo, chainIsBeta, projectChainOf } from "@/lib/chains";
import { itemTexts } from "@/lib/canvas-items";
import { economicsLines } from "@/lib/economics";
import { reachLine } from "@/lib/reach";
import { briefLines } from "@/lib/draft/briefs";
import { buildProjectMarkdown } from "@/lib/export-md";
import { type ProjectDoc, testnetContractRows } from "@/lib/ideation";
import { type PackFileKind, PACK_LIMITS } from "@/lib/investor-pack";
import { shapeLabel } from "@/content/kits/copy";
import { kitShapes } from "@/lib/kits";
import { PROFILE_KEYS, VALUE_AREAS, unanswered } from "@/lib/value-canvas";

/**
 * The pack prompt (M159, F17): everything an AI needs to build the one
 * pager or the deck, from the whole record. The record markdown (product,
 * customers, profiles, canvases, positioning, architecture, security),
 * build progress and the recorded testnet contracts, the token, the brand
 * kit in full, the team's brief for the kind, then the brief for the
 * output and the brand rules. Never the prospects, which are not on the
 * record. Pure, client and server, so the studio can show its length.
 */
export interface PackPromptInput {
  doc: ProjectDoc;
  projectId: string;
  /** The launched or linked token, when one exists. */
  token?: { name: string; symbol: string | null; address: string } | null;
}

const C = STUDIO_PLUS_COPY.pack.prompt;

function brandBlock(doc: ProjectDoc): string[] {
  const b = doc.brand;
  if (!b) return [C.noBrand];
  return [
    `Palette, primary ${b.palette.primary}, secondary ${b.palette.secondary}, accent ${b.palette.accent}, surface ${b.palette.surface}.`,
    `Fonts, ${b.fonts.display} for titles and headings, ${b.fonts.body} for body text (both on Google Fonts).`,
    ...(b.tone.length ? [`Tone, ${b.tone.join(", ")}.`] : []),
    ...(b.tagline ? [`Tagline, ${b.tagline}`] : []),
    ...(doc.logo ? [`Logo, ${doc.logo}`] : [C.noLogo]),
    C.banners,
  ];
}

function facts(input: PackPromptInput): string[] {
  const { doc } = input;
  const chain = projectChainOf(doc);
  const out: string[] = [];
  out.push(`Chain, ${chainInfo(chain).name}${chainIsBeta(chain) ? " (beta)" : ""}, standing in for ${chainInfo(chain).mainnetName}.`);
  const shapes = kitShapes(doc.kit);
  if (shapes.length) out.push(`Product modules, ${shapes.map((s) => shapeLabel(s) ?? s).join(", ")}.`);
  const progress = buildProgress(doc.kit);
  if (progress.total) out.push(`Build progress, ${progress.done} of ${progress.total} steps done.`);
  const contracts = testnetContractRows(doc).filter((c) => /^0x[0-9a-f]{40}$/i.test(c.address));
  if (contracts.length) out.push(`Recorded testnet contracts, ${contracts.map((c) => `${c.label ?? "unlabelled"} ${c.address}`).join("; ")}.`);
  if (input.token) out.push(`Token, ${input.token.name}${input.token.symbol ? ` (${input.token.symbol})` : ""} at ${input.token.address}.`);
  else out.push(C.noToken);
  // The unit economics (M167): the chosen case and its break even, when the team stored a model.
  if (doc.economics && doc.economics.family !== "governance") out.push(`Unit economics, ${economicsLines(doc.economics).slice(0, 3).join(" ")}`);
  for (const k of PROFILE_KEYS) {
    const r = doc.reach?.[k];
    if (r) out.push(reachLine(doc.icp?.[Number(k)]?.name?.trim() || `profile ${Number(k) + 1}`, r));
  }
  const vc = doc.valueCanvas;
  if (vc) {
    for (const k of PROFILE_KEYS) {
      const c = vc[k];
      if (!c) continue;
      const who = doc.icp?.[Number(k)]?.name?.trim() || `profile ${Number(k) + 1}`;
      out.push(`Value proposition for ${who}, ${VALUE_AREAS.filter((a) => c[a].length).map((a) => `${a} ${itemTexts(c[a]).join("; ")}`).join(". ")}. Pains without a reliever ${unanswered(c, "pains").length}, gains without a creator ${unanswered(c, "gains").length}.`);
    }
  }
  return out;
}

export function packPrompt(kind: PackFileKind, input: PackPromptInput): string {
  const { doc, projectId } = input;
  const name = doc.name || "the project";
  const alias = mcpAlias(doc.name, projectId);
  const brief = briefLines(kind, doc.briefs?.[kind]);
  const sections = [
    C.opening(kind, name),
    `## The record\n\n${buildProjectMarkdown(doc).trim()}`,
    `## Facts beside the record\n\n${facts(input).map((f) => `- ${f}`).join("\n")}`,
    `## The brand kit\n\n${brandBlock(doc).map((l) => `- ${l}`).join("\n")}`,
    ...(brief ? [brief] : []),
    `## What to build\n\n${kind === "onepager" ? C.onepager : C.deck(PACK_LIMITS.deck.slides)}`,
    `## Rules\n\n${C.rules.map((r) => `- ${r}`).join("\n")}`,
    C.closing(kind, alias),
  ];
  return sections.join("\n\n");
}

/** The prompt's length in characters, for the menu. */
export function packPromptLength(kind: PackFileKind, input: PackPromptInput): number {
  return packPrompt(kind, input).length;
}
