import { mcpAlias } from "@/content/launch";

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
