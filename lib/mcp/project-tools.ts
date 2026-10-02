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
  designDeployChain,
} from "@/lib/ideation-db";
import {
  designConstraints,
  designDeployability,
  designWarnings,
} from "@/lib/mcp/design-views";
import { type IndexedCurve, getCurve } from "@/lib/indexer";
import { type LaunchRow, getLaunchesByProject } from "@/lib/launches-db";
import {
  type View,
  curveState,
  curveStatusView,
  journeyView,
  launchUrl,
  launchView,
  milestoneUpdatesView,
  poolStatusView,
  saleStatusView,
  summarizeCurve,
} from "@/lib/mcp/launch-views";
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
import { buildProgress, checklistFor, sectionsFor } from "@/content/kits/checklists";
import { tokenBuildProgressOf, tokenBuildRowsOf } from "@/content/token-steps";
import type { TokenLaunchFacts } from "@/lib/token-steps";
import { REVIEW_VERDICT_LABELS, shapeLabel, shapeLabels } from "@/content/kits/copy";
import { NO_SHAPE_HINT, buildResourcePack, buildReviewView } from "@/lib/kit-pack";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { kitShapes } from "@/lib/kits";
import { shapeAdviceFor } from "@/lib/token-advice";
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

/** The one token a project server speaks for (M45). */
interface ProjectToken {
  /** The linked design's deployed address, else the newest launch from the project, else null. */
  address: string | null;
  deployed: string | null;
  launched: LaunchRow | null;
}

async function projectTokenAddress(ctx: ProjectCtx): Promise<ProjectToken> {
  const deployed = ctx.design?.deployed_token_address ?? null;
  const launched = (await getLaunchesByProject(ctx.project.id))?.[0] ?? null;
  return { address: deployed ?? launched?.token_address ?? null, deployed, launched };
}

function noTokenMessage(ctx: ProjectCtx): string {
  return ctx.design ? NO_TOKEN : NO_DESIGN;
}

/** What the platform knows about the linked design's launch, for the token build steps (M46). */
async function tokenFacts(design: TokenDesignRow, curve?: IndexedCurve | null): Promise<TokenLaunchFacts> {
  const address = design.deployed_token_address ?? null;
  const read = curve === undefined ? (address ? await getCurve(address, designDeployChain(design)) : null) : curve;
  return {
    published: design.status === "published",
    // The design is linked to this project by construction.
    linked: true,
    deployedAddress: address,
    curve: read,
    now: Math.floor(Date.now() / 1000),
  };
}

function curveSummary(curve: IndexedCurve | null, now: number) {
  return curve ? { state: curveState(curve, now), progressPct: summarizeCurve(curve, now).progressPct } : null;
}

function publicUrl(base: "p" | "t", row: { slug: string | null; status: string }) {
  return row.status === "published" && row.slug
    ? `https://www.canhav.com/${base}/${row.slug}`
    : null;
}

export function registerProjectTools(server: McpServer, projectId: string): void {
  const scope = { scope: `project:${projectId}` };

  // Shared by every write tool (M39). Declared first because the token build
  // step tools (M46) sit beside the design tools, above the M39 block.
  const noteField = z
    .string()
    .max(AGENT_CHANGE_LIMITS.note.max)
    .optional()
    .describe("One or two sentences for the owner on why this change is right.");
  const WRITE_RULES =
    "Drafts only, nothing is published. The project owner chose in the studio whether agent changes are proposed for review or written at once, and the result says which happened. Send only the fields you are changing.";

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
        "What is left before this project can publish and launch. Validation problem if any, whether a token design is linked with its float, FDV to float, treasury share and warning codes, whether each side is published, whether a token is deployed or launched with the curve state of either, the research kit's build progress when the project has a product shape, and the next action. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const projectProblem = validateProjectDoc(project.draft_doc);
      const designProblem = design ? validateTokenDesignDoc(design.draft_doc) : null;
      // The design's deployed token, else a token launched from this project
      // through the studio (M19d), the newest first.
      const { address: tokenAddress, deployed, launched } = await projectTokenAddress(loaded.value);
      // A curve launch's state rides along so an agent sees graduation
      // progress without a second call. Null curve for factory launches. A
      // separate studio launch beside a design deployed elsewhere gets its own read.
      const launchedAddress = launched?.token_address ?? null;
      const [curve, launchedCurve] = await Promise.all([
        tokenAddress ? getCurve(tokenAddress, projectChainOf(project.draft_doc)) : null,
        launchedAddress && launchedAddress !== tokenAddress
          ? getCurve(launchedAddress, projectChainOf(project.draft_doc))
          : null,
      ]);
      const derived = design
        ? deriveTokenomics(design.draft_doc, { shapes: kitShapes(project.draft_doc.kit) })
        : null;
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
          // The testnet the project builds on and its token launches on (M52).
          chain: projectChainOf(project.draft_doc),
          chainId: chainInfo(projectChainOf(project.draft_doc)).chainId,
        },
        kit: kit?.shape
          ? {
              kits: kit.kits,
              shape: kit.shape,
              shapeLabel: shapeLabel(kit.shape),
              shapes: kitShapes(kit),
              shapeLabels: shapeLabels(kit),
              build: buildProgress(kit),
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
              // A summary of the tokenomics (M45). The full picture and the
              // warning text are on get_linked_token_design and check_design.
              derived: derived
                ? {
                    floatAtLaunchPct: derived.floatAtLaunchPct,
                    fdvToFloat: derived.fdvToFloat,
                    treasuryPct: derived.treasuryPct,
                  }
                : null,
              warnings: derived?.warnings ?? [],
              build: tokenBuildProgressOf(
                design.draft_doc,
                await tokenFacts(design, deployed && deployed === tokenAddress ? curve : undefined),
              ),
            }
          : null,
        deployedTokenAddress: deployed,
        deployedToken: tokenAddress
          ? {
              address: tokenAddress,
              launchUrl: launchUrl(tokenAddress),
              curve: curveSummary(curve, now),
            }
          : null,
        launchedToken: launched
          ? {
              address: launched.token_address,
              launchUrl: launchUrl(launched.token_address),
              launchedAt: launched.created_at,
              launchTxHash: launched.tx_hash,
              curve: curveSummary(launched.token_address === tokenAddress ? curve : launchedCurve, now),
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
        "The token design linked to this project, with its derived tokenomics, its warnings (including whether the rationale fits this project's product shapes), what the CanHav contracts can deploy of it, an advice block per product shape on whether a token fits and what it should lock, and its deployed token address when it has one. Read the advice before changing the rationale with update_linked_token_design. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      if (!design) return errorResult(NO_DESIGN);
      const shapes = kitShapes(project.draft_doc.kit);
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
        derived: deriveTokenomics(design.draft_doc, { shapes }),
        warnings: designWarnings(design.draft_doc, { shapes }),
        deployability: designDeployability(design.draft_doc),
        advice: shapeAdviceFor(shapes),
        build: tokenBuildProgressOf(design.draft_doc, await tokenFacts(design)),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_token_build_steps",
    {
      title: "The linked design's build steps",
      description:
        "The token build steps for the design linked to this project, in order. Eight design steps and eight launch stages, each with its id, phase, what done looks like, the editor step it informs and its state. Rows marked computed are read from the platform (publish, link, launch, the snipe window, graduation) and cannot be ticked; a row that does not apply is left out of the progress count. Use the manual ids with set_token_build_steps. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { design } = loaded.value;
      if (!design) return errorResult(NO_DESIGN);
      const facts = await tokenFacts(design);
      return jsonResult({
        progress: tokenBuildProgressOf(design.draft_doc, facts),
        facts,
        steps: tokenBuildRowsOf(design.draft_doc, facts).map((r) => ({
          id: r.step.id,
          title: r.step.title,
          detail: r.step.detail,
          phase: r.step.phase,
          editorStep: r.step.step,
          state: r.state,
          done: r.state === "done",
          computed: r.computed,
        })),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "set_token_build_steps",
    {
      title: "Tick or untick the linked design's build steps",
      description: `Mark token build steps of the linked design as done or not done, by id from get_token_build_steps. Only the manual steps, the computed ones are refused. Tick a step when the work is written down and you can point to it, not when it is started. ${WRITE_RULES}`,
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
        { target: "token_design", kind: "build_steps", patch: { done: args.done, undone: args.undone } },
        args.note,
      );
      if (!result.ok) return errorResult(result.message);
      return jsonResult({ outcome: result.outcome, changeId: result.changeId, message: result.message });
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
        "Run CanHav's design warning rules and deployability classification against this project's token design draft, including whether the rationale fits this project's product shapes. Pass an inline TokenDesignDoc JSON (kind 'token_design', version 1) to check an edit before saving it. Otherwise takes no arguments.",
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
      const shapes = kitShapes(loaded.value.project.draft_doc.kit);
      return jsonResult({
        checked: doc ? "inline doc" : "this project's linked design draft",
        valid: firstProblem === null,
        firstProblem,
        warnings: designWarnings(candidate, { shapes }),
        deployability: designDeployability(candidate),
      });
    },
    scope,
  );

  // -------------------------------------------------------------------------
  // Writes (M39). Drafts only. The owner's mode on the project decides
  // whether a change is proposed or written. Nothing here publishes.

  registerMeteredTool(
    server,
    "update_project",
    {
      title: "Change this project's draft",
      description: `Change fields of this project's draft across the editor steps. Basics (name, whatItDoes, audience b2b or b2c, personas for a b2b audience with teamSize, geography, industry, primaryContact and revenueRange, consumerPersonas for a b2c audience with ageRange, geography, cryptoExperience, howTheyFindYou and holdings, payer, whoPays, whyThisChain, stage), architecture (contracts, externalDeps, externalDepsNone, oracleUse, oracles, adminFunctions, upgradeability), security (worstCase and the five status declarations), reality (firstHundredUsers) and the verification fields (githubRepo, testnetContracts, verifyWallet). What the project is classed as (sectors, sectorOther, subsectors, and under kit the product shapes, startingPoint scratch or existing_product, existingProduct, resources with tick and untick lists of resource ids from get_resource_pack, and review, a list of pass and verdict pairs with ids from get_prelaunch_review and verdict pass, fail, na or open to clear). Also references, the team's own files as title, location (a link or a path on the team's machine) and note, which are never published and are read back on get_project under draft.references. Also chain, robinhood_testnet or arbitrum_sepolia, the testnet the project builds on and its token launches on, which is refused once a token has launched from the project. A sector marked Coming soon is refused, a subsector must belong to a chosen sector, and a shape must be offered under the chosen subsectors, so send sectors, subsectors and kit.shapes together when starting from nothing. Changing sectors or subsectors drops the shapes they no longer offer. Lists replace the stored list. The distribution acknowledgement can only be ticked by a person in the studio. ${WRITE_RULES} Run check_project afterwards to see what is still missing.`,
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
        "The build steps for this project's product shapes, in order, each with its id, its shape, what done looks like, the editor step it informs, whether it is ticked, whether the team added it (custom), and sharedWith, the ids of the same step under the project's other shapes. Steps shared between shapes count once in progress, so tick every id in sharedWith together. removed lists the catalog steps the team took out, which can be restored. Use the ids with set_build_steps. Takes no arguments.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const kit = loaded.value.project.draft_doc.kit;
      const items = checklistFor(kitShapes(kit));
      // A shape may hold only steps the team added, so the shapes decide, not the catalog (M52).
      if (!kit || kitShapes(kit).length === 0) return errorResult(NO_SHAPE_HINT);
      const groupOf = new Map<string, readonly string[]>();
      for (const section of sectionsFor(kitShapes(kit), kit))
        for (const g of section.groups) for (const id of g.ids) groupOf.set(id, g.ids);
      const hidden = new Set(kit.hiddenSteps ?? []);
      return jsonResult({
        progress: buildProgress(kit),
        steps: [
          ...items
            .filter((i) => !hidden.has(i.id))
            .map((i) => ({
              id: i.id,
              shape: i.id.slice(0, i.id.indexOf(".")),
              title: i.title,
              detail: i.detail,
              editorStep: i.step as string | null,
              done: kit.checklist?.[i.id] === true,
              custom: false,
              sharedWith: (groupOf.get(i.id) ?? []).filter((id) => id !== i.id),
            })),
          // Steps the team added (M50), at the end of their shape.
          ...(kit.customSteps ?? []).map((c) => ({
            id: c.id,
            shape: c.shape as string,
            title: c.title,
            detail: c.detail,
            editorStep: null,
            done: kit.checklist?.[c.id] === true,
            custom: true,
            sharedWith: [] as string[],
          })),
        ],
        removed: items.filter((i) => hidden.has(i.id)).map((i) => ({ id: i.id, title: i.title })),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "set_build_steps",
    {
      title: "Tick, add, remove or restore build steps",
      description: `Change this project's build steps. done and undone tick or untick steps by id from get_build_steps; tick a step when the work is written down and you can point to it, not when it is started. add puts new steps under one of the project's product shapes (shape, title, optional detail on what done looks like). remove takes steps out of the list by id; a step shared between shapes goes for all of them, and a step the team added is deleted. restore brings removed catalog steps back. ${WRITE_RULES}`,
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
        {
          target: "project",
          kind: "build_steps",
          patch: { done: args.done, undone: args.undone, add: args.add, remove: args.remove, restore: args.restore },
        },
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
      description: `Change fields of the token design linked to this project. Name and ticker, rationale, supply and allocations, vesting, distribution, market, governance, legal and post-launch. The vesting cohort list replaces the stored list. Allocations are whole percentages and must total 100 before the design can publish. Read the advice block on get_linked_token_design before changing the rationale. ${WRITE_RULES} Run check_design afterwards for warnings.`,
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
        "How the owner lets agents write to this project (off, propose or direct) and the recent agent changes with their status. Proposed means waiting on the owner, accepted and applied mean the draft has it, rejected means the owner declined. An accepted row carries appliedPatch, the part of the proposal the owner let through, possibly edited line by line, so compare it with patch to see what was dropped or changed. Takes no arguments.",
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
        "The curated reading list CanHav recommends for this project's product shape, in read-first order, with fetchable URLs, the family each resource comes from, caveat flags, the chain the project builds on, and where the relevant protocols run on it today. Returns the resources the team ticked in the studio; pass includeUnselected to see everything. Narrow with step, priority or family.",
      inputSchema: z.object({
        step: z.enum(["basics", "architecture", "security", "reality", "review"]).optional(),
        priority: z.enum(["core", "recommended", "deep_dive"]).optional(),
        family: z.enum(["shared", "robinhood", "arbitrum", "morpho", "pendle", "uniswap", "boros"]).optional(),
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
      const { address } = await projectTokenAddress(loaded.value);
      if (!address) return errorResult(noTokenMessage(loaded.value));
      const view = await launchView(address, { includePrivateProject: true });
      return view.ok ? jsonResult(view.value) : errorResult(view.message);
    },
    scope,
  );

  // The five activity tools of the shared server, bound to this project's
  // token (M45). Same names, so a prompt written for one server reads on the
  // other; no address argument, and an error until a token exists.
  const RECENT = z.object({ recentLimit: z.number().int().min(1).max(50).optional() });
  function registerTokenActivity<S extends z.ZodType>(
    name: string,
    config: { title: string; description: string; inputSchema: S },
    build: (address: string, args: z.infer<S>) => Promise<View<unknown>>,
  ): void {
    registerMeteredTool(
      server,
      name,
      config,
      async (args, ctx) => {
        const loaded = await withProject(projectId, ctx);
        if (!loaded.ok) return errorResult(loaded.message);
        const { address } = await projectTokenAddress(loaded.value);
        if (!address) return errorResult(noTokenMessage(loaded.value));
        const view = await build(address, args);
        return view.ok ? jsonResult(view.value) : errorResult(view.message);
      },
      scope,
    );
  }

  registerTokenActivity(
    "get_curve_status",
    {
      title: "This project's token on its curve",
      description:
        "The bonding curve behind the token launched from this project. Reserves and price, ETH raised against the graduation threshold with progress, the snipe tax window, trade counts, the most recent trades and after graduation the locked pool. Null curve for a factory launch. Takes no address and answers with an error until a token has been launched from this project.",
      inputSchema: RECENT,
    },
    (address, { recentLimit }) => curveStatusView(address, recentLimit),
  );

  registerTokenActivity(
    "get_pool_status",
    {
      title: "This project's token pool",
      description:
        "The AMM pool behind this project's token with reserves, LP shares, protocol fee, swap count, ETH volume and the most recent swaps. For a curve launch this is the locked pool the launcher seeded at graduation. Takes no address.",
      inputSchema: RECENT,
    },
    (address, { recentLimit }) => poolStatusView(address, recentLimit),
  );

  registerTokenActivity(
    "get_sale_status",
    {
      title: "This project's token sales",
      description:
        "Allocation sales for this project's token with their phase, amounts sold and raised, proceeds tranches and the most recent purchases. Takes no address.",
      inputSchema: RECENT,
    },
    (address, { recentLimit }) => saleStatusView(address, recentLimit),
  );

  registerTokenActivity(
    "get_launch_journey",
    {
      title: "This project's token commitment",
      description:
        "The journey document committed at launch for this project's token, with the on-chain hash, the recomputed hash and whether they match. Takes no arguments.",
      inputSchema: z.object({}),
    },
    (address) => journeyView(address),
  );

  registerTokenActivity(
    "get_milestone_updates",
    {
      title: "This project's milestone updates",
      description:
        "Progress updates the creator anchored on-chain for this project's token, grouped by milestone. Takes no arguments.",
      inputSchema: z.object({}),
    },
    (address) => milestoneUpdatesView(address),
  );
}
