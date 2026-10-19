import { mcpAlias } from "@/content/launch";
import type { DraftKind } from "@/lib/draft/limits";

/**
 * Paste prompts that ask the owner's own agent to write a Studio+ field
 * over MCP (M112), the M104 pattern, so a team without drafts left this
 * month still fills the record. Each feature milestone adds its prompt.
 */
export function draftFieldPrompt(name: string, projectId: string, field: string, what: string, how: string): string {
  const alias = mcpAlias(name, projectId);
  return [
    `Use the ${alias} MCP server for my CanHav project.`,
    `1. Call get_project and read this repository.`,
    `2. Write the ${what}. ${how}`,
    `3. Call update_project with the ${field} field holding it, then tell me what you wrote and what you assumed.`,
  ].join("\n\n");
}

export function draftCanvasPrompt(name: string, projectId: string): string {
  return draftFieldPrompt(
    name,
    projectId,
    "canvas",
    "Business Model Canvas",
    "Nine blocks (customerSegments, valueProposition, channels, customerRelationships, revenueStreams, keyResources, keyActivities, keyPartners, costStructure), one paragraph of at most 600 characters each, no lists, built on the product, the personas and who pays as the record states them.",
  );
}

export function draftIcpPrompt(name: string, projectId: string): string {
  return draftFieldPrompt(
    name,
    projectId,
    "icp",
    "ideal customer profiles",
    "One or two profiles, each with name, summary, walletsTheyUse, channels, protocolsTheyUse, buyingTrigger and objection (lists of up to eight short items), built on the persona table and on protocols in the same subsector.",
  );
}

export function draftCompetitorsPrompt(name: string, projectId: string): string {
  return draftFieldPrompt(
    name,
    projectId,
    "competitors",
    "differentiator line",
    "Call get_competitors first for the landscape (the protocols in the subsector on the chain, with TVL and age). Then one line of at most 300 characters on how this project differs from the one or two it will be compared with, as { differentiator }.",
  );
}

/** The prompt per kind, for the MCP prompts (M117) and the paste blocks. Grows with the run. */
export function draftBrandPrompt(name: string, projectId: string): string {
  return draftFieldPrompt(
    name,
    projectId,
    "brand",
    "brand kit",
    "palette (primary, secondary, accent, surface as lowercase hex, starting from the logo's colours), fonts (display and body, Google Fonts names), tone (two to five words) and tagline (at most 90 characters), consistent with the product and its customers.",
  );
}

export const DRAFT_AGENT_PROMPTS: Partial<Record<DraftKind, (name: string, projectId: string) => string>> = {
  canvas: draftCanvasPrompt,
  canvas_block: draftCanvasPrompt,
  icp: draftIcpPrompt,
  competitors: draftCompetitorsPrompt,
  brand: draftBrandPrompt,
};
