import { mcpAlias } from "@/content/launch";
import type { DraftKind } from "@/lib/draft/limits";

/**
 * Paste prompts that ask the owner's own agent to write a Studio+ field
 * over MCP (M112), the M104 pattern, so a team without drafts left this
 * month still fills the record. Each feature milestone adds its prompt.
 */
export function draftFieldPrompt(name: string, projectId: string, field: string, what: string, how: string, brief = ""): string {
  const alias = mcpAlias(name, projectId);
  return [
    `Use the ${alias} MCP server for my CanHav project.`,
    `1. Call get_project and read this repository.`,
    `2. Write the ${what}. ${how}`,
    ...(brief ? [brief] : []),
    `3. Call update_project with the ${field} field holding it, then tell me what you wrote and what you assumed.`,
  ].join("\n\n");
}

export function draftCanvasPrompt(name: string, projectId: string, brief = ""): string {
  return draftFieldPrompt(
    name,
    projectId,
    "canvas",
    "Business Model Canvas",
    "Nine blocks (customerSegments, valueProposition, channels, customerRelationships, revenueStreams, keyResources, keyActivities, keyPartners, costStructure), one paragraph of at most 600 characters each, no lists, built on the product, the personas and who pays as the record states them.",
    brief,
  );
}

export function draftIcpPrompt(name: string, projectId: string, brief = ""): string {
  return draftFieldPrompt(
    name,
    projectId,
    "icp",
    "ideal customer profiles",
    "One or two profiles, each with name, summary, walletsTheyUse, channels, protocolsTheyUse, buyingTrigger and objection (lists of up to eight short items), built on the persona table and on protocols in the same subsector.",
    brief,
  );
}

export function draftValueCanvasPrompt(name: string, projectId: string, brief = ""): string {
  return draftFieldPrompt(
    name,
    projectId,
    "valueCanvas",
    "Value Proposition Canvas for the first ideal customer profile (valueCanvas.0, or .1 for the second)",
    "Six areas, products (products and services), painRelievers, gainCreators, jobs (customer jobs), pains and gains, each a list of three to six short items of at most 140 characters, one idea each, built on that profile's trigger and objection, the canvas and the competitor line. Call get_project first and reuse the ids of items that already exist; a reliever or creator may carry answers, the ids of the pains or gains it addresses.",
    brief,
  );
}

export function draftCompetitorsPrompt(name: string, projectId: string, brief = ""): string {
  return draftFieldPrompt(
    name,
    projectId,
    "competitors",
    "differentiator line",
    "Call get_competitors first for the landscape (the protocols in the subsector on the chain, with TVL and age). Then one line of at most 300 characters on how this project differs from the one or two it will be compared with, as { differentiator }.",
    brief,
  );
}

export function draftPackPrompt(name: string, projectId: string, brief = ""): string {
  return draftFieldPrompt(
    name,
    projectId,
    "investorPack",
    "investor and grant pack",
    "Three parts, any of them. onepager, markdown with the headings The problem, The product, Who pays and why, Where it stands, The market, The ask, at most 6000 characters. deck, five to twelve slides as title and up to six bullets. grants, per programme id (arbitrum, gitcoin or general; optimism is read as general) the answers per question id within the word limits the studio lists, the project's chain's own programme first. Numbers only from the record and this repository; mark gaps in square brackets.",
    brief,
  );
}

/** The weekly update writes a row, not a field (M124), so its prompt ends on set_weekly_update. */
export function draftWeeklyPrompt(name: string, projectId: string, brief = ""): string {
  const alias = mcpAlias(name, projectId);
  return [
    `Use the ${alias} MCP server for my CanHav project.`,
    `1. Call get_project_status and get_agent_changes, and read this repository's commits from the last seven days.`,
    `2. Write the team update for the public page, two or three short paragraphs in the first person plural, what landed, what is next, one honest line on what is blocked, and up to five one line highlights. Nothing the activity does not support.`,
    ...(brief ? [brief] : []),
    `3. Call set_weekly_update with body and highlights, then tell me what you wrote. I publish it from the Overview.`,
  ].join("\n\n");
}

/** The prompt per kind, for the MCP prompts (M117) and the paste blocks. Grows with the run. */
export function draftBrandPrompt(name: string, projectId: string, brief = ""): string {
  return draftFieldPrompt(
    name,
    projectId,
    "brand",
    "brand kit",
    "palette (primary, secondary, accent, surface as lowercase hex, starting from the logo's colours), fonts (display and body, Google Fonts names), tone (two to five words) and tagline (at most 90 characters), consistent with the product and its customers.",
    brief,
  );
}

export const DRAFT_AGENT_PROMPTS: Partial<Record<DraftKind, (name: string, projectId: string, brief?: string) => string>> = {
  canvas: draftCanvasPrompt,
  canvas_block: draftCanvasPrompt,
  icp: draftIcpPrompt,
  value_canvas: draftValueCanvasPrompt,
  competitors: draftCompetitorsPrompt,
  brand: draftBrandPrompt,
  weekly: draftWeeklyPrompt,
  onepager: draftPackPrompt,
  deck: draftPackPrompt,
  grants: draftPackPrompt,
};
