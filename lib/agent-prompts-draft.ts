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
