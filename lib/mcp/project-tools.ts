import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
  type ProjectDoc,
  type TokenDesignDoc,
  validateProjectDoc,
  validateTokenDesignDoc,
} from "@/lib/ideation";
import {
  type ProjectRow,
  type TokenDesignRow,
  getLinkedTokenDesign,
  getProject,
  getSnapshot,
} from "@/lib/ideation-db";
import {
  designConstraints,
  designDeployability,
  designWarnings,
} from "@/lib/mcp/design-views";
import { launchView } from "@/lib/mcp/launch-views";
import {
  errorResult,
  jsonResult,
  mcpUserId,
  registerMeteredTool,
} from "@/lib/mcp/register";
import { deriveTokenomics } from "@/lib/tokenDesign";

/**
 * Tools for one project, mounted at /mcp/p/[id]. Every tool is bound to the
 * project id the route carries, so none of them takes a slug or an address —
 * an agent added against this server sees that project and nothing else.
 *
 * Ownership is enforced per call by getProject(id, userId), not by the URL.
 * The URL is a tool surface, not a secret: Clerk issues tokens for the origin,
 * so a token minted at /mcp is accepted here too.
 *
 * Nothing in registerProjectTools may read the database. Registration runs on
 * every request, including tools/list, because mcp-handler serves the MCP SDK
 * statelessly.
 */

const AUTH_HINT =
  "Authorize this MCP server via OAuth (a free CanHav account) to read this project.";
const NOT_YOURS =
  "No CanHav project with this id belongs to you. Open the project in the studio and copy its MCP server URL again.";
const NO_DESIGN =
  "No token design is linked to this project. Link one from the project's page in the CanHav studio.";
const NO_TOKEN =
  "This project's token design has not been deployed yet. Launch it from canhav.com/launch to make the token readable here.";

interface ProjectCtx {
  project: ProjectRow;
  design: TokenDesignRow | null;
}

async function loadProjectContext(
  projectId: string,
  userId: string,
): Promise<ProjectCtx | null> {
  const project = await getProject(projectId, userId);
  if (!project) return null;
  const design = await getLinkedTokenDesign(project.id);
  return { project, design };
}

/** The preamble every tool shares. Returns a ToolResult on any failure. */
async function withProject(
  projectId: string,
  ctx: unknown,
): Promise<{ ok: true; value: ProjectCtx } | { ok: false; message: string }> {
  const userId = mcpUserId(ctx);
  if (!userId) return { ok: false, message: AUTH_HINT };
  const loaded = await loadProjectContext(projectId, userId);
  if (!loaded) return { ok: false, message: NOT_YOURS };
  return { ok: true, value: loaded };
}

function publicUrl(base: "p" | "t", row: { slug: string | null; status: string }) {
  return row.status === "published" && row.slug
    ? `https://www.canhav.com/${base}/${row.slug}`
    : null;
}

export function registerProjectTools(server: McpServer, projectId: string): void {
  const scope = { scope: `project:${projectId}` };

  registerMeteredTool(
    server,
    "get_project",
    {
      title: "Get this project",
      description:
        "The full CanHav project record this server is bound to. Current draft, publication status, and the published snapshot when there is one. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      const snapshot = project.published_hash
        ? await getSnapshot(project.published_hash)
        : null;
      return jsonResult({
        id: project.id,
        slug: project.slug,
        status: project.status,
        name: project.draft_doc.name,
        updatedAt: project.updated_at,
        publicUrl: publicUrl("p", project),
        draft: project.draft_doc,
        published: snapshot
          ? {
              version: snapshot.version,
              publishedAt: snapshot.created_at,
              snapshotHash: snapshot.snapshot_hash,
              doc: snapshot.doc,
            }
          : null,
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_project_status",
    {
      title: "This project's status",
      description:
        "What is left before this project can publish and launch. Validation problem if any, whether a token design is linked, whether each side is published, whether a token is deployed, and the next action. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const projectProblem = validateProjectDoc(project.draft_doc);
      const designProblem = design ? validateTokenDesignDoc(design.draft_doc) : null;
      const deployed = design?.deployed_token_address ?? null;
      const nextAction = projectProblem
        ? "Fix the project draft in the studio."
        : project.status !== "published"
          ? "Publish the project."
          : !design
            ? "Link a token design to this project."
            : designProblem
              ? "Fix the token design draft in the studio."
              : design.status !== "published"
                ? "Publish the token design."
                : !deployed
                  ? "Launch the token from canhav.com/launch."
                  : "Nothing left. The project is published and its token is deployed.";
      return jsonResult({
        project: {
          id: project.id,
          name: project.draft_doc.name,
          status: project.status,
          slug: project.slug,
          firstProblem: projectProblem,
          publicUrl: publicUrl("p", project),
        },
        tokenDesign: design
          ? {
              id: design.id,
              name: design.draft_doc.name,
              ticker: design.draft_doc.ticker,
              status: design.status,
              slug: design.slug,
              firstProblem: designProblem,
              publicUrl: publicUrl("t", design),
            }
          : null,
        deployedTokenAddress: deployed,
        nextAction,
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_linked_token_design",
    {
      title: "This project's token design",
      description:
        "The token design linked to this project, with its derived tokenomics and its deployed token address when it has one. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { design } = loaded.value;
      if (!design) return errorResult(NO_DESIGN);
      return jsonResult({
        id: design.id,
        slug: design.slug,
        status: design.status,
        name: design.draft_doc.name,
        ticker: design.draft_doc.ticker,
        deployedAddress: design.deployed_token_address,
        updatedAt: design.updated_at,
        publicUrl: publicUrl("t", design),
        draft: design.draft_doc,
        derived: deriveTokenomics(design.draft_doc),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_design_constraints",
    {
      title: "This project's design constraints",
      description:
        "This project's token design as testable assertions. Supply, allocations, per-cohort cliffs and durations, release type and derived float or FDV, split into enforced-on-chain versus stated-by-team. Reads the published snapshot when there is one, otherwise the current draft. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { design } = loaded.value;
      if (!design) return errorResult(NO_DESIGN);
      // A bound server has to be useful before publish, so fall back to the
      // draft. The global tool is published-only because it is public.
      let doc: TokenDesignDoc = design.draft_doc;
      let source: "published_snapshot" | "draft" = "draft";
      if (design.published_hash) {
        const snapshot = await getSnapshot(design.published_hash);
        if (snapshot && snapshot.doc.kind === "token_design") {
          doc = snapshot.doc;
          source = "published_snapshot";
        }
      }
      return jsonResult({
        source,
        ...designConstraints(doc, design.deployed_token_address),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "check_design",
    {
      title: "Check this project's token design",
      description:
        "Run CanHav's design warning rules and deployability classification against this project's token design draft. Pass an inline TokenDesignDoc JSON (kind 'token_design', version 1) to check an edit before saving it. Otherwise takes no arguments.",
      inputSchema: z.object({ doc: z.record(z.string(), z.unknown()).optional() }),
    },
    async ({ doc }, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      let candidate: TokenDesignDoc;
      if (doc) {
        if (doc.kind !== "token_design" || doc.version !== 1)
          return errorResult('Inline doc must have kind "token_design" and version 1.');
        candidate = doc as unknown as TokenDesignDoc;
      } else {
        const { design } = loaded.value;
        if (!design) return errorResult(NO_DESIGN);
        candidate = design.draft_doc;
      }
      const firstProblem = validateTokenDesignDoc(candidate);
      return jsonResult({
        checked: doc ? "inline doc" : "this project's linked design draft",
        valid: firstProblem === null,
        firstProblem,
        warnings: designWarnings(candidate),
        deployability: designDeployability(candidate),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "check_project",
    {
      title: "Check this project record",
      description:
        "Validate this project's draft against CanHav's project rules and report the first problem, or that it is ready to publish. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const draft: ProjectDoc = loaded.value.project.draft_doc;
      const firstProblem = validateProjectDoc(draft);
      return jsonResult({ valid: firstProblem === null, firstProblem });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_launch",
    {
      title: "This project's deployed token",
      description:
        "Everything CanHav knows about the token deployed from this project's design. Token metadata, the commitment verified against its on-chain hash, milestone updates, vesting, escrow tranches, allocation sales and the creator's AMM pool. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { design } = loaded.value;
      if (!design) return errorResult(NO_DESIGN);
      if (!design.deployed_token_address) return errorResult(NO_TOKEN);
      const view = await launchView(design.deployed_token_address);
      return view.ok ? jsonResult(view.value) : errorResult(view.message);
    },
    scope,
  );
}
