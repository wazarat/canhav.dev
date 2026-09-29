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
import { getCurve } from "@/lib/indexer";
import { getLaunchesByProject } from "@/lib/launches-db";
import { curveState, launchUrl, launchView, summarizeCurve } from "@/lib/mcp/launch-views";
import {
  errorResult,
  jsonResult,
  mcpUserId,
  promptResult,
  registerMeteredPrompt,
  registerMeteredTool,
} from "@/lib/mcp/register";
import {
  AGENT_CHANGE_LIMITS,
  buildStepsPatchSchema,
  changeLines,
  projectPatchSchema,
  tokenDesignPatchSchema,
} from "@/lib/agent-writes";
import { agentStateOf, listAgentChanges } from "@/lib/agent-writes-db";
import { submitAgentChange } from "@/lib/agent-writes-server";
import { checklistFor } from "@/content/kits/checklists";
import { REVIEW_VERDICT_LABELS, shapeLabel, shapeLabels } from "@/content/kits/copy";
import { NO_SHAPE_HINT, buildResourcePack, buildReviewView } from "@/lib/kit-pack";
import { checklistProgress, kitShapes } from "@/lib/kits";
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
  "No token has been launched from this project and no token design is linked to it. Launch one from the project's page in the CanHav studio, or link a design there.";
const NO_TOKEN =
  "This project's token design has not been deployed and no token has been launched from the project yet. Launch it from the project's page in the CanHav studio.";

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
        "What is left before this project can publish and launch. Validation problem if any, whether a token design is linked, whether each side is published, whether a token is deployed, the research kit's build progress when the project has a product shape, and the next action. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const projectProblem = validateProjectDoc(project.draft_doc);
      const designProblem = design ? validateTokenDesignDoc(design.draft_doc) : null;
      const deployed = design?.deployed_token_address ?? null;
      // A token launched from this project through the studio (M19d), the
      // newest first. Independent of the design path.
      const launched = (await getLaunchesByProject(project.id))?.[0] ?? null;
      const tokenAddress = deployed ?? launched?.token_address ?? null;
      // A curve launch's state rides along so an agent sees graduation
      // progress without a second call. Null curve for factory launches.
      const curve = tokenAddress ? await getCurve(tokenAddress) : null;
      const launchHint = `Launch a token from canhav.com/launch?project=${project.id}.`;
      const nextAction = projectProblem
        ? "Fix the project draft in the studio."
        : project.status !== "published"
          ? "Publish the project."
          : tokenAddress
            ? curve && !curve.graduated
              ? "The token is on its curve. Nothing left in the studio."
              : curve?.graduated
                ? "Nothing left. The project is published and its token has graduated."
                : "Nothing left. The project is published and its token is deployed."
            : !design
              ? `Link a token design to this project, or launch a token from canhav.com/launch?project=${project.id}.`
              : designProblem
                ? "Fix the token design draft in the studio."
                : design.status !== "published"
                  ? "Publish the token design."
                  : launchHint;
      const kit = project.draft_doc.kit;
      const now = Math.floor(Date.now() / 1000);
      return jsonResult({
        project: {
          id: project.id,
          name: project.draft_doc.name,
          status: project.status,
          slug: project.slug,
          firstProblem: projectProblem,
          publicUrl: publicUrl("p", project),
        },
        kit: kit?.shape
          ? {
              kits: kit.kits,
              shape: kit.shape,
              shapeLabel: shapeLabel(kit.shape),
              shapes: kitShapes(kit),
              shapeLabels: shapeLabels(kit),
              build: checklistProgress(checklistFor(kitShapes(kit)), kit),
            }
          : null,
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
        deployedToken: tokenAddress
          ? {
              address: tokenAddress,
              launchUrl: launchUrl(tokenAddress),
              curve: curve
                ? { state: curveState(curve, now), progressPct: summarizeCurve(curve, now).progressPct }
                : null,
            }
          : null,
        launchedToken: launched
          ? {
              address: launched.token_address,
              launchUrl: launchUrl(launched.token_address),
              launchedAt: launched.created_at,
              launchTxHash: launched.tx_hash,
            }
          : null,
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

  // -------------------------------------------------------------------------
  // Writes (M39). Drafts only. The owner's mode on the project decides
  // whether a change is proposed or written. Nothing here publishes.

  const noteField = z
    .string()
    .max(AGENT_CHANGE_LIMITS.note.max)
    .optional()
    .describe("One or two sentences for the owner on why this change is right.");

  const WRITE_RULES =
    "Drafts only, nothing is published. The project owner chose in the studio whether agent changes are proposed for review or written at once, and the result says which happened. Send only the fields you are changing.";

  registerMeteredTool(
    server,
    "update_project",
    {
      title: "Change this project's draft",
      description: `Change fields of this project's draft across the editor steps. Basics (name, whatItDoes, personas, payer, whoPays, whyThisChain, stage), architecture (contracts, externalDeps, externalDepsNone, oracleUse, oracles, adminFunctions, upgradeability), security (worstCase and the five status declarations), reality (firstHundredUsers) and the verification fields (githubRepo, testnetContracts, verifyWallet). Lists replace the stored list. Sectors, subsectors, product shapes and the distribution acknowledgement can only be set by a person in the studio. ${WRITE_RULES} Run check_project afterwards to see what is still missing.`,
      inputSchema: z.object({ changes: projectPatchSchema, note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(
        project,
        design,
        project.owner_id,
        { target: "project", kind: "fields", patch: args.changes },
        args.note,
      );
      if (!result.ok) return errorResult(result.message);
      return jsonResult({
        outcome: result.outcome,
        changeId: result.changeId,
        message: result.message,
        changed: changeLines(project.draft_doc, args.changes).map((l) => l.path),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_build_steps",
    {
      title: "This project's build steps",
      description:
        "The build steps for this project's product shapes, in order, each with its id, what done looks like, the editor step it informs, and whether it is ticked. Use the ids with set_build_steps. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const kit = loaded.value.project.draft_doc.kit;
      const items = checklistFor(kitShapes(kit));
      if (!kit || items.length === 0) return errorResult(NO_SHAPE_HINT);
      return jsonResult({
        progress: checklistProgress(items, kit),
        steps: items.map((i) => ({
          id: i.id,
          title: i.title,
          detail: i.detail,
          editorStep: i.step,
          done: kit.checklist?.[i.id] === true,
        })),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "set_build_steps",
    {
      title: "Tick or untick build steps",
      description: `Mark build steps of this project as done or not done, by id from get_build_steps. Tick a step when the work is written down and you can point to it, not when it is started. ${WRITE_RULES}`,
      inputSchema: z.object({ ...buildStepsPatchSchema.shape, note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(
        project,
        design,
        project.owner_id,
        { target: "project", kind: "build_steps", patch: { done: args.done, undone: args.undone } },
        args.note,
      );
      if (!result.ok) return errorResult(result.message);
      return jsonResult({
        outcome: result.outcome,
        changeId: result.changeId,
        message: result.message,
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "update_linked_token_design",
    {
      title: "Change the linked token design's draft",
      description: `Change fields of the token design linked to this project. Name and ticker, rationale, supply and allocations, vesting, distribution, market, governance, legal and post-launch. The vesting cohort list replaces the stored list. Allocations are whole percentages and must total 100 before the design can publish. ${WRITE_RULES} Run check_design afterwards for warnings.`,
      inputSchema: z.object({ changes: tokenDesignPatchSchema, note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(
        project,
        design,
        project.owner_id,
        { target: "token_design", kind: "fields", patch: args.changes },
        args.note,
      );
      if (!result.ok) return errorResult(result.message);
      return jsonResult({
        outcome: result.outcome,
        changeId: result.changeId,
        message: result.message,
        changed: changeLines(design?.draft_doc, args.changes).map((l) => l.path),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_agent_changes",
    {
      title: "Agent changes on this project",
      description:
        "How the owner lets agents write to this project (off, propose or direct) and the recent agent changes with their status. Proposed means waiting on the owner, accepted and applied mean the draft has it, rejected means the owner declined. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      const changes = await listAgentChanges(project.id, project.owner_id);
      return jsonResult({ mode: agentStateOf(project).mode, changes });
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
    "get_resource_pack",
    {
      title: "This project's resource pack",
      description:
        "The curated reading list CanHav recommends for this project's product shape, in read-first order, with fetchable URLs, the family each resource comes from, caveat flags, and where the relevant protocols can run on Robinhood Chain today. Returns the resources the team ticked in the studio; pass includeUnselected to see everything. Narrow with step, priority or family.",
      inputSchema: z.object({
        step: z.enum(["basics", "architecture", "security", "reality", "review"]).optional(),
        priority: z.enum(["core", "recommended", "deep_dive"]).optional(),
        family: z.enum(["shared", "robinhood", "morpho", "pendle", "uniswap", "boros"]).optional(),
        includeUnselected: z.boolean().optional(),
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const pack = buildResourcePack(loaded.value.project.draft_doc, args);
      if (!pack) return errorResult(NO_SHAPE_HINT);
      return jsonResult({ source: "draft", ...pack });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_prelaunch_review",
    {
      title: "This project's pre-launch review",
      description:
        "The review passes that apply to this project's product shape, each with what a reviewer checks, the resources that define it, and the team's recorded verdict (pass, fail, not applicable, or open). Takes no arguments. Run the prelaunch_review prompt to walk them against a repository.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const view = buildReviewView(loaded.value.project.draft_doc);
      if (!view) return errorResult(NO_SHAPE_HINT);
      return jsonResult({ source: "draft", ...view });
    },
    scope,
  );

  registerMeteredPrompt(
    server,
    "prelaunch_review",
    {
      title: "Walk the pre-launch review",
      description:
        "Walks this project's review passes against the repository the agent is working in, one pass at a time, and reports a verdict with evidence for each. Reads get_prelaunch_review and get_resource_pack first.",
      argsSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return promptResult(loaded.message);
      const view = buildReviewView(loaded.value.project.draft_doc);
      if (!view) return promptResult(NO_SHAPE_HINT);
      const list = view.passes
        .map(
          (p, i) =>
            `${i + 1}. ${p.title} [${p.verdict ? REVIEW_VERDICT_LABELS[p.verdict] : "open"}]\n   ${p.detail}\n   Defined by ${p.resources.map((r) => r.url).join(", ")}`,
        )
        .join("\n");
      const text = [
        `You are reviewing a ${view.shapeLabels.join(" and ") || view.shape} product before it holds value. Work inside the repository you have open.`,
        "",
        "First call get_prelaunch_review and get_resource_pack on this project's CanHav MCP server. Fetch the rawUrl of any resource a pass is defined by before judging that pass.",
        "",
        "Then take the passes below one at a time. For each, look for evidence in the repository (code, tests, screenshots, documents). Report Pass only when you can point at the evidence, Fail when the check is not met, Not applicable with a one-line reason. Never guess.",
        "",
        list,
        "",
        "Finish with a table of verdicts and a list of the smallest changes that would turn each Fail into a Pass. The team records the verdicts in the CanHav studio; do not claim they are recorded.",
      ].join("\n");
      return promptResult(text, `Pre-launch review for ${loaded.value.project.draft_doc.name}`);
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_launch",
    {
      title: "This project's token",
      description:
        "Everything CanHav knows about the token deployed from this project's design, or launched from this project in the studio. Token metadata, the commitment verified against its on-chain hash, milestone updates, vesting, escrow tranches, allocation sales, the launch's AMM pool, the bonding curve for a curve launch and the project block. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const launched = (await getLaunchesByProject(project.id))?.[0] ?? null;
      const address = design?.deployed_token_address ?? launched?.token_address ?? null;
      if (!address) return errorResult(design ? NO_TOKEN : NO_DESIGN);
      const view = await launchView(address, { includePrivateProject: true });
      return view.ok ? jsonResult(view.value) : errorResult(view.message);
    },
    scope,
  );
}
