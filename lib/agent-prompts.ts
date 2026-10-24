import { mcpAlias } from "@/content/launch";

/**
 * Prompts the project page hands the owner to paste into the AI IDE
 * (M104): one that asks the agent for the summary, one that sends back
 * the points the owner disagrees with, one that carries on with the open
 * build steps. Plain words, numbered where there are steps, no colons
 * before whitespace and no em dashes.
 */

function serverLine(alias: string): string {
  return `Use the ${alias} MCP server for my CanHav project.`;
}

export function askSummaryPrompt(name: string, projectId: string): string {
  const alias = mcpAlias(name, projectId);
  return [
    serverLine(alias),
    `1. Call get_project and get_build_steps and read this repository.`,
    `2. Call set_summary with two short lists in plain words, built (what works today, with the file or contract that proves each line) and building (what is in progress or next). At most twelve lines each, one sentence per line, no jargon.`,
    `3. Tell me what you wrote.`,
  ].join("\n\n");
}

export function reviseSummaryPrompt(
  name: string,
  projectId: string,
  points: readonly string[],
  note: string,
): string {
  const alias = mcpAlias(name, projectId);
  const list = points.length ? points.map((p) => `- ${p}`).join("\n") : "- (none picked)";
  return [
    serverLine(alias),
    `I read the summary on the project page and I do not agree with these points.`,
    list,
    note.trim() ? `What I want instead.\n${note.trim()}` : `Tell me whether each point is wrong in the summary or wrong in the code, then fix the right one.`,
    `1. Check each point against this repository.`,
    `2. Where the code is behind the summary, do the work, tick the build steps with set_build_steps and evidence, and record facts with update_project.`,
    `3. Where the summary is wrong, call set_summary with the corrected built and building lists.`,
    `4. Tell me what changed, point by point.`,
  ].join("\n\n");
}

export function continueBuildPrompt(name: string, projectId: string, openSteps: readonly string[]): string {
  const alias = mcpAlias(name, projectId);
  const list = openSteps.length ? openSteps.map((s) => `- ${s}`).join("\n") : "- (every step is done)";
  return [
    serverLine(alias),
    `These build steps are still open on the project page.`,
    list,
    `1. Call get_build_steps and get_comparables, then report_session with your plan for the first three.`,
    `2. Work through them in this repository. Before any deploy, make sure get_project_status shows the deployer key's address; when it does not, make the key on this machine and record its address with update_project deployer first, so the record matches what happened. Tick each one with set_build_steps as soon as it is done, with the file, test or address as evidence. Mark a step that does not fit this product notApplicable with the reason.`,
    `3. Call set_summary with the updated built and building lists, then tell me where things stand.`,
  ].join("\n\n");
}

/**
 * For a key made in the browser (M151, F8): the agent asks the owner to
 * paste the env line into the file themselves. The key never goes into the
 * chat, an MCP answer or a transcript.
 */
export function deployerPastePrompt(name: string, projectId: string, envFile: string): string {
  const alias = mcpAlias(name, projectId);
  return [
    serverLine(alias),
    `I made the project's deployer key in the CanHav studio and recorded its address there. The private key is only on my clipboard, so do not ask me to paste it into this chat.`,
    `1. Ask me to paste the DEPLOYER_PRIVATE_KEY line into ${envFile} myself, and wait until I say it is there.`,
    `2. Check that ${envFile} is ignored by git (git check-ignore ${envFile}); add it to .gitignore if it is not.`,
    `3. Call get_project_status, confirm the deployer block shows the address, and record the real path with update_project deployerEnvFile if the file is somewhere else.`,
    `4. Never print the key, and never send it through any MCP tool.`,
  ].join("\n\n");
}
