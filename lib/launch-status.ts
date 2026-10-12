/**
 * Which studio records have a launched token (M75). A project has launched
 * when a launch row points at it or its linked design carries a deployed
 * address; a design has launched when it carries a deployed address or a
 * launch row names it. Computed from the same facts projectChainLocked
 * uses, never stored on the document, so hashes and the MCP tools stay as
 * they are. Pure, so the studio home, the launches page and tests share it.
 */
export interface LaunchedFacts {
  launches: ReadonlyArray<{
    address: string;
    project: { id: string } | null;
    design: { id: string } | null;
  }>;
  designs: ReadonlyArray<{ id: string; deployed_token_address: string | null }>;
  links: Iterable<{ projectId: string; designId: string; deployedTokenAddress: string | null }>;
}

export interface LaunchedSets {
  /** Project id to the lowercase address of its newest launched token. */
  projects: Map<string, string>;
  /** Design id to the lowercase address of its deployed token. */
  designs: Map<string, string>;
}

export function launchedSets({ launches, designs, links }: LaunchedFacts): LaunchedSets {
  const projects = new Map<string, string>();
  const designMap = new Map<string, string>();
  // Launches arrive newest first, so the first hit per record wins.
  for (const l of launches) {
    const address = l.address.toLowerCase();
    if (l.project && !projects.has(l.project.id)) projects.set(l.project.id, address);
    if (l.design && !designMap.has(l.design.id)) designMap.set(l.design.id, address);
  }
  for (const d of designs) {
    if (d.deployed_token_address && !designMap.has(d.id)) designMap.set(d.id, d.deployed_token_address.toLowerCase());
  }
  for (const link of links) {
    if (link.deployedTokenAddress && !projects.has(link.projectId))
      projects.set(link.projectId, link.deployedTokenAddress.toLowerCase());
  }
  return { projects, designs: designMap };
}
