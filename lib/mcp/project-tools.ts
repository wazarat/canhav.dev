import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { type Owner, ownerOf } from "@/lib/owner";
import { getRevision, listRevisions } from "@/lib/revisions-db";

import {
  PROJECT_LIMITS,
  type ProjectDoc,
  type TokenDesignDoc,
  TOKEN_DESIGN_LIMITS,
  emptyTokenDesignDoc,
  normalizeTokenDesignDoc,
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
  mcpKey,
  mcpOwner,
  promptResult,
  registerMeteredPrompt,
  registerMeteredTool,
} from "@/lib/mcp/register";
import {
  AGENT_CHANGE_LIMITS,
  applyTokenDesignPatch,
  buildStepsPatchSchema,
  changeLines,
  projectPatchSchema,
  tokenDesignPatchSchema,
} from "@/lib/agent-writes";
import { agentStateOf, listAgentChanges, listPendingChanges, recordAgentChange, withdrawAgentChange } from "@/lib/agent-writes-db";
import { linkLaunch } from "@/lib/launch-project";
import { storeImageFromBase64, storeImageFromUrl } from "@/lib/images";
import { milestoneOf, milestoneOfStep } from "@/lib/build-milestones";
import { type PendingView, createLinkedDesign, projectedContext, submitAgentChange } from "@/lib/agent-writes-server";
import { AGENT_COPY } from "@/content/ideation";
import { planProgress, reportSessionSchema, sessionView } from "@/lib/agent-sessions";
import { latestAgentSession, reportAgentSession } from "@/lib/agent-sessions-db";
import { buildProgress, checklistFor, gatedStepsFor, sectionsFor } from "@/content/kits/checklists";
import { featuresFor } from "@/content/kits/features";
import { tokenBuildProgressOf, tokenBuildRowsOf } from "@/content/token-steps";
import type { TokenLaunchFacts } from "@/lib/token-steps";
import { REVIEW_VERDICT_LABELS, shapeLabel, shapeLabels } from "@/content/kits/copy";
import { NO_SHAPE_HINT, PACK_SECTIONS, buildResourcePack, buildReviewView, packSections, packSummary, templatesRead } from "@/lib/kit-pack";
import { type ProjectChain, chainInfo, projectChainOf } from "@/lib/chains";
import { DEPLOYER_HINT, deployerView } from "@/lib/deployer";
import { getDeployerBalances } from "@/lib/deployer-server";
import { launchTargetLabel } from "@/content/launch-targets";
import { launchTargetFit, launchTargetOf } from "@/lib/launch-targets";
import { mainnetView } from "@/lib/mainnet-view";
import { TEMPLATE_ID } from "@/lib/templates";
import { FEATURE_ID, KIT_LIMITS, hasFeature } from "@/lib/kits";

const KIT_LIMITS_FEATURES = KIT_LIMITS.features.max;
import {
  KIT_FAMILY_ORDER,
  KIT_PRIORITY_ORDER,
  KIT_STEPS,
  type KitFamily,
  type KitPriority,
  type KitStep,
  kitShapes,
  PRODUCT_SHAPE_VALUES,
  type ProductShape,
} from "@/lib/kits";
import { shapeAdviceFor } from "@/lib/token-advice";
import { deriveTokenomics } from "@/lib/tokenDesign";

/**
 * Tools for one project, mounted at /mcp/p/[id]. Every tool is bound to the
 * project id the route carries, so none of them takes a slug or an address —
 * an agent added against this server sees that project and nothing else.
 *
 * Ownership is enforced per call by getProject(id, owner), not by the URL; a
 * member of the project's team passes (M107).
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
  "No token has been launched from this project and no token design is linked to it. Start a design with create_linked_token_design, link a token the account already launched with link_launch, or the owner launches one from the project's page in the CanHav studio.";
const NO_TOKEN =
  "This project's token design has not been deployed and no token has been launched from the project yet. Launch it from the project's page in the CanHav studio.";

interface ProjectCtx {
  project: ProjectRow;
  design: TokenDesignRow | null;
  /** draft is the stored draft; projected has the waiting proposals applied (M81). */
  source: "draft" | "projected";
  pending: PendingView;
}

async function loadProjectContext(
  projectId: string,
  owner: Owner,
  preview: boolean | undefined,
): Promise<ProjectCtx | null> {
  const project = await getProject(projectId, owner);
  if (!project) return null;
  const design = await getLinkedTokenDesign(project.id);
  // In propose mode the agent reads what the draft becomes once the owner
  // accepts, so a run can build on its own proposals. preview false reads
  // the stored draft. Direct and off have nothing waiting (M81).
  if (agentStateOf(project).mode === "propose" && preview !== false) {
    const projected = await projectedContext(project, design, project.owner_id);
    return { ...projected, source: "projected" };
  }
  return { project, design, source: "draft", pending: { count: 0, changeIds: [], skipped: [] } };
}

/** The preamble every tool shares. Returns a ToolResult on any failure. */
async function withProject(
  projectId: string,
  ctx: unknown,
  preview?: boolean,
): Promise<{ ok: true; value: ProjectCtx } | { ok: false; message: string }> {
  const owner = mcpOwner(ctx);
  if (!owner) return { ok: false, message: AUTH_HINT };
  // A project key opens its own project only (M111).
  const key = mcpKey(ctx);
  if (key && key.projectId !== projectId) return { ok: false, message: NOT_YOURS };
  const loaded = await loadProjectContext(projectId, owner, preview);
  if (!loaded) return { ok: false, message: NOT_YOURS };
  return { ok: true, value: loaded };
}

/** The studio page where the owner decides proposals. */
function reviewUrl(projectId: string): string {
  return `https://www.canhav.com/studio/project/${projectId}#${AGENT_COPY.anchor}`;
}

/** source and pending in front of every read answer (M81). */
function stateOf(v: ProjectCtx) {
  return {
    source: v.source,
    pending: { ...v.pending, reviewUrl: reviewUrl(v.project.id) },
  };
}

/**
 * What a write answer carries beside its outcome (M81). After a proposal
 * the projected progress, so the agent sees the step it just ticked.
 */
async function afterWrite(projectId: string, ctx: unknown, result: { outcome: "proposed" | "applied"; changeId: string | null; message: string }) {
  const loaded = await withProject(projectId, ctx);
  const kit = loaded.ok ? loaded.value.project.draft_doc.kit : undefined;
  return {
    outcome: result.outcome,
    changeId: result.changeId,
    message: result.message,
    ...(loaded.ok ? { pending: { ...loaded.value.pending, reviewUrl: reviewUrl(projectId) } } : {}),
    ...(loaded.ok && kit?.shape ? { projectedProgress: buildProgress(kit) } : {}),
  };
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
/** The venue a design ideates for and its fit on the project's chain (M69), null until chosen. */
function launchTargetView(doc: TokenDesignDoc, chain: ProjectChain) {
  const target = launchTargetOf(doc);
  if (!target) return null;
  return { target, label: launchTargetLabel(target), fit: launchTargetFit(target, chain) };
}

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

/**
 * An inline design from an agent, read defensively (M80). Missing sections
 * are filled from the empty design so the validator and the derivations
 * never read a field off undefined; the validator then names what is wrong.
 */
function safeTokenDesignDoc(raw: Record<string, unknown>): TokenDesignDoc {
  const empty = emptyTokenDesignDoc() as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...empty };
  for (const [k, v] of Object.entries(raw)) {
    const base = empty[k];
    if (Array.isArray(base) && !Array.isArray(v)) continue;
    merged[k] = base && typeof base === "object" && !Array.isArray(base) && v && typeof v === "object" && !Array.isArray(v)
      ? { ...(base as Record<string, unknown>), ...(v as Record<string, unknown>) }
      : v;
  }
  return normalizeTokenDesignDoc(merged as unknown as TokenDesignDoc);
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

  // Every read takes preview (M81). The description tail says what it does.
  const PREVIEW_NOTE =
    " In propose mode the answer is the projected state, the draft with the waiting proposals applied, and pending names them; pass preview false for the stored draft.";
  const previewField = z
    .boolean()
    .optional()
    .describe("false reads the stored draft instead of the projected state. Only matters in propose mode.");
  const PREVIEW = z.object({ preview: previewField });

  registerMeteredTool(
    server,
    "get_project",
    {
      title: "Get this project",
      description:
        "The full CanHav project record this server is bound to. Current draft, publication status, and the published snapshot when there is one." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      const snapshot = project.published_hash
        ? await getSnapshot(project.published_hash)
        : null;
      return jsonResult({
        ...stateOf(loaded.value),
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
        "What is left before this project can publish and launch. Validation problem if any, whether a token design is linked with its float, FDV to float, treasury share and warning codes, whether each side is published, whether a token is deployed or launched with the curve state of either, the research kit's build progress when the project has a product shape, the deployer key's address with its balance and faucet on each testnet (or the hint on how to make one), and the next action." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
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
        ? deriveTokenomics(design.draft_doc, { shapes: kitShapes(project.draft_doc.kit), chain: projectChainOf(project.draft_doc) })
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
              ? `Start a token design with create_linked_token_design, link a token the account already launched with link_launch, or the owner launches one from canhav.com/launch?project=${project.id}.`
              : designProblem
                ? "Fix the token design draft in the studio."
                : design.status !== "published"
                  ? "Publish the token design."
                  : launchHint;
      const kit = project.draft_doc.kit;
      const now = Math.floor(Date.now() / 1000);
      // The throwaway deployer key (M102): the address, never the key, with one balance read per chain.
      const deployerAddress = deployerView(project.draft_doc, projectChainOf(project.draft_doc));
      const deployer = deployerAddress
        ? await (async () => {
            const balances = await getDeployerBalances(deployerAddress.address);
            return {
              ...deployerAddress,
              chains: deployerAddress.chains.map((c) => {
                const b = balances.find((x) => x.chain === c.chain);
                return { ...c, explorerUrl: `${c.explorerUrl}${deployerAddress.address}`, balanceEth: b?.eth ?? null, funded: b?.funded ?? false };
              }),
            };
          })()
        : { address: null, hint: DEPLOYER_HINT };
      return jsonResult({
        ...stateOf(loaded.value),
        deployer,
        // The agent's own summary (M104), null until set_summary has run.
        summary: project.draft_doc.summary ?? null,
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
          // The mainnet contracts and the Pons pairing the project records (M70), null until recorded.
          mainnet: mainnetView(project.draft_doc),
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
              // The venue the design ideates for (M69), null until chosen.
              launchTarget: launchTargetView(design.draft_doc, projectChainOf(project.draft_doc)),
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
        "The token design linked to this project, with its launchTarget (the venue it ideates for, canhav_curve, pons or pools_xyz, with its fit on this project's chain), its derived tokenomics, its warnings (including whether the rationale fits this project's product shapes and whether the venue runs on this project's mainnet), what the CanHav contracts can deploy of it, an advice block per product shape on whether a token fits and what it should lock, and its deployed token address when it has one. Read the advice before changing the rationale with update_linked_token_design." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      if (!design) return errorResult(NO_DESIGN);
      const shapes = kitShapes(project.draft_doc.kit);
      const chain = projectChainOf(project.draft_doc);
      return jsonResult({
        ...stateOf(loaded.value),
        id: design.id,
        slug: design.slug,
        status: design.status,
        name: design.draft_doc.name,
        ticker: design.draft_doc.ticker,
        deployedAddress: design.deployed_token_address,
        updatedAt: design.updated_at,
        publicUrl: publicUrl("t", design),
        draft: design.draft_doc,
        launchTarget: launchTargetView(design.draft_doc, chain),
        derived: deriveTokenomics(design.draft_doc, { shapes, chain }),
        warnings: designWarnings(design.draft_doc, { shapes, chain }),
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
        "The token build steps for the design linked to this project, in order. Eight design steps and eight launch stages, each with its id, phase, what done looks like, the editor step it informs and its state. Rows marked computed are read from the platform (publish, link, launch, the snipe window, graduation) and cannot be ticked; a row that does not apply is left out of the progress count. Use the manual ids with set_token_build_steps." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const { design } = loaded.value;
      if (!design) return errorResult(NO_DESIGN);
      const facts = await tokenFacts(design);
      return jsonResult({
        ...stateOf(loaded.value),
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
          ...(design.draft_doc.stepEvidence?.[r.step.id] ? { evidence: design.draft_doc.stepEvidence[r.step.id] } : {}),
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
      description: `Mark token build steps of the linked design as done or not done, by id from get_token_build_steps. Only the manual steps, the computed ones are refused. Tick a step when the work is written down and you can point to it, not when it is started. evidence takes id and text pairs (a file, a test, a tx, an REA evidence id, up to 200 characters) stored beside the step and shown in the studio and the exports; empty text clears it. ${WRITE_RULES}`,
      inputSchema: z.object({ ...buildStepsPatchSchema.shape, note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(
        project,
        design,
        ownerOf(project),
        { target: "token_design", kind: "build_steps", patch: { done: args.done, undone: args.undone, evidence: args.evidence } },
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
        "This project's token design as testable assertions. Supply, allocations, per-cohort cliffs and durations, release type and derived float or FDV, split into enforced-on-chain versus stated-by-team. Reads the published snapshot when there is one, otherwise the current draft." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
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
        ...stateOf(loaded.value),
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
        "Run CanHav's design warning rules and deployability classification against this project's token design draft, including whether the rationale fits this project's product shapes and whether the launch venue runs on this project's chain. To check an edit before saving it pass changes, the same shape update_linked_token_design takes (name, ticker, rationale, supply, vesting, distribution, market, governance, legal, postLaunch, only the fields you are changing), which is laid over the linked draft, or over an empty design when none is linked. A whole TokenDesignDoc can be passed as doc instead (kind token_design, version 1, the shape get_linked_token_design returns under draft). Without either, checks the linked draft.",
      inputSchema: z.object({
        changes: tokenDesignPatchSchema.optional(),
        doc: z.record(z.string(), z.unknown()).optional(),
      }),
    },
    async ({ doc, changes }, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      if (doc && changes) return errorResult("Pass changes or doc, not both.");
      const { project, design } = loaded.value;
      let candidate: TokenDesignDoc;
      let checked: string;
      if (doc) {
        if (doc.kind !== "token_design" || doc.version !== 1)
          return errorResult('Inline doc must have kind "token_design" and version 1.');
        // An inline doc is untrusted. The normaliser and the validator read
        // it defensively; anything they cannot read is the first problem.
        candidate = safeTokenDesignDoc(doc);
        checked = "inline doc";
      } else if (changes) {
        const base = design ? design.draft_doc : emptyTokenDesignDoc(project.draft_doc.name);
        candidate = applyTokenDesignPatch(base, changes);
        checked = design ? "the linked draft with changes applied" : "an empty design with changes applied";
      } else {
        if (!design) return errorResult(NO_DESIGN);
        candidate = design.draft_doc;
        checked = "this project's linked design draft";
      }
      const shapes = kitShapes(project.draft_doc.kit);
      const chain = projectChainOf(project.draft_doc);
      try {
        const firstProblem = validateTokenDesignDoc(candidate);
        return jsonResult({
          checked,
          valid: firstProblem === null,
          firstProblem,
          warnings: designWarnings(candidate, { shapes, chain }),
          deployability: designDeployability(candidate),
        });
      } catch (err) {
        return errorResult(`The design could not be read. ${err instanceof Error ? err.message : String(err)}. Send changes in the update_linked_token_design shape, or a doc in the shape get_linked_token_design returns under draft.`);
      }
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
      description: `Change fields of this project's draft across the editor steps. Basics (name, whatItDoes, audience b2b or b2c, personas for a b2b audience with teamSize, geography, industry, primaryContact and revenueRange, consumerPersonas for a b2c audience with ageRange, geography, cryptoExperience, howTheyFindYou and holdings, payer, whoPays, whyThisChain, stage), architecture (contracts, externalDeps, externalDepsNone, oracleUse, oracles, adminFunctions, upgradeability), security (worstCase and the five status declarations), reality (firstHundredUsers) and the verification fields (githubRepo, website as an https URL, testnetContracts as address and optional label rows or plain lowercase addresses, up to a hundred, the list replaces the stored list, addressBook as an https URL to the file or explorer list that holds every deployed address, verifyWallet, and deployer, the throwaway deployer key's lowercase address, never the key itself, null to clear), logo (a URL on CanHav's image store from set_logo, or null to clear), and summary (built and building lists, see set_summary, null to clear), and canvas, the Business Model Canvas (Studio+), any of customerSegments, valueProposition, channels, customerRelationships, revenueStreams, keyResources, keyActivities, keyPartners and costStructure as one paragraph of up to 600 characters each, merged over the stored blocks, null to clear, and icp (Studio+), one or two ideal customer profiles with name, summary, walletsTheyUse, channels, protocolsTheyUse, buyingTrigger and objection, the list replaces the stored one, null to clear. What the project is classed as (sectors, sectorOther, subsectors, and under kit the product shapes, startingPoint scratch or existing_product, existingProduct, resources with tick and untick lists of resource ids from get_resource_pack, and review, a list of pass and verdict pairs with ids from get_prelaunch_review and verdict pass, fail, na or open to clear). Also references, the team's own files as title, location (a link or a path on the team's machine), note and an optional evidence handle (an REA evidence id, a test name, a commit), which are never published and are read back on get_project under draft.references. Also chain, robinhood_testnet or arbitrum_sepolia, the testnet the project builds on and its token launches on, which is refused once a token has launched from the project. Also mainnet, the deployment beside the testnet launch (M70), with contracts (label and lowercase address, the list replaces the stored list, on the mainnet the project's chain stands in for), companionTemplate (a template accepted on this project with a Pons fit line, see get_templates, null to clear) and pons (the paired Pons launch's tokenAddress and the creator feeRecipient, Robinhood Chain projects only, null to clear), and pair, the external trading pair (venue pons, pools_xyz, uniswap or other, quoteAsset as a symbol or a lowercase address, optional pairAddress and an https url where it trades, pons and pools_xyz on Robinhood Chain projects only, null to clear); send mainnet null to clear the whole record. A sector marked Coming soon is refused, a subsector must belong to a chosen sector, and a shape must be offered under the chosen subsectors, so send sectors, subsectors and kit.shapes together when starting from nothing. Changing sectors or subsectors drops the shapes they no longer offer. Lists replace the stored list. The distribution acknowledgement can only be ticked by a person in the studio. ${WRITE_RULES} Run check_project afterwards to see what is still missing.`,
      inputSchema: z.object({ changes: projectPatchSchema, note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(
        project,
        design,
        ownerOf(project),
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
        "The build steps for this project's product shapes, in order, each with its id, its shape, what done looks like, the editor step it informs, its milestone (design, testnet, review or launch, the group the studio's Build tab shows it under), whether it is ticked, its state (done, open or na with the reason when the team said it does not apply, which leaves the count),  evidence when a line was recorded with the tick, whether the team added it (custom), sharedWith, the ids of the same step under the project's other shapes, templates, the contract template ids that fit the step (decide them with set_template_decisions, read them with get_templates), and feature when a ticked feature gates the step. The features block lists what the product can include with on per feature (change it with set_features); gated lists the steps whose feature is not ticked. Steps shared between shapes count once in progress, so tick every id in sharedWith together. removed lists the catalog steps the team took out, which can be restored. Use the ids with set_build_steps." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const kit = loaded.value.project.draft_doc.kit;
      const items = checklistFor(kitShapes(kit));
      // A shape may hold only steps the team added, so the shapes decide, not the catalog (M52).
      if (!kit || kitShapes(kit).length === 0) return errorResult(NO_SHAPE_HINT);
      const groupOf = new Map<string, readonly string[]>();
      for (const section of sectionsFor(kitShapes(kit), kit))
        for (const g of section.groups) for (const id of g.ids) groupOf.set(id, g.ids);
      const hidden = new Set(kit.hiddenSteps ?? []);
      const gatedOff = (i: { feature?: string }) => Boolean(i.feature) && !hasFeature(kit, i.feature!);
      const features = featuresFor(kitShapes(kit));
      return jsonResult({
        ...stateOf(loaded.value),
        progress: buildProgress(kit),
        features: features.map((f) => ({
          id: f.id,
          shape: f.id.slice(0, f.id.indexOf(".")),
          title: f.title,
          detail: f.detail,
          on: hasFeature(kit, f.id),
          steps: items.filter((i) => i.feature === f.id).map((i) => i.id),
          templates: [...(f.templates ?? [])],
        })),
        steps: [
          ...items
            .filter((i) => !hidden.has(i.id) && !gatedOff(i))
            .map((i) => ({
              id: i.id,
              shape: i.id.slice(0, i.id.indexOf(".")),
              title: i.title,
              detail: i.detail,
              editorStep: i.step as string | null,
              milestone: milestoneOfStep(i.step),
              done: kit.checklist?.[i.id] === true,
              state: kit.notApplicable?.[i.id] ? "na" : kit.checklist?.[i.id] === true ? "done" : "open",
              ...(kit.notApplicable?.[i.id] ? { reason: kit.notApplicable[i.id] } : {}),
              ...(kit.evidence?.[i.id] ? { evidence: kit.evidence[i.id] } : {}),
              custom: false,
              sharedWith: (groupOf.get(i.id) ?? []).filter((id) => id !== i.id),
              templates: [...(i.templates ?? [])],
              ...(i.feature ? { feature: i.feature } : {}),
            })),
          // Steps the team added (M50), at the end of their shape.
          ...(kit.customSteps ?? []).map((c) => ({
            id: c.id,
            shape: c.shape as string,
            title: c.title,
            detail: c.detail,
            editorStep: null,
            milestone: milestoneOf({ key: c.id, step: "review", custom: true }),
            done: kit.checklist?.[c.id] === true,
            state: kit.notApplicable?.[c.id] ? "na" : kit.checklist?.[c.id] === true ? "done" : "open",
            ...(kit.notApplicable?.[c.id] ? { reason: kit.notApplicable[c.id] } : {}),
            ...(kit.evidence?.[c.id] ? { evidence: kit.evidence[c.id] } : {}),
            custom: true,
            sharedWith: [] as string[],
            templates: [] as string[],
          })),
        ],
        removed: items.filter((i) => hidden.has(i.id)).map((i) => ({ id: i.id, title: i.title })),
        // Steps a feature gates that the team has not ticked (M64). Tick the feature with set_features to list them.
        gated: gatedStepsFor(kitShapes(kit)).filter((g) => !hasFeature(kit, g.feature)),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "set_features",
    {
      title: "Tick or untick features",
      description: `Change what this project's product includes (M64). tick and untick take feature ids from get_build_steps (the features block). A ticked feature lists the build steps it gates and ranks the templates it suggests first on get_templates; unticking hides those steps again without losing their ticks. ${WRITE_RULES}`,
      inputSchema: z.object({
        tick: z.array(z.string().max(120).regex(FEATURE_ID)).max(KIT_LIMITS_FEATURES).default([]),
        untick: z.array(z.string().max(120).regex(FEATURE_ID)).max(KIT_LIMITS_FEATURES).default([]),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      if (args.tick.length + args.untick.length === 0) return errorResult("Name at least one feature.");
      const both = args.tick.filter((id) => args.untick.includes(id));
      if (both.length) return errorResult(`${both[0]} is in both tick and untick.`);
      const { project, design } = loaded.value;
      const features = Object.fromEntries([
        ...args.tick.map((id) => [id, true] as const),
        ...args.untick.map((id) => [id, false] as const),
      ]);
      const result = await submitAgentChange(
        project,
        design,
        ownerOf(project),
        { target: "project", kind: "fields", patch: { kit: { features } } },
        args.note,
      );
      if (!result.ok) return errorResult(result.message);
      return jsonResult({ outcome: result.outcome, changeId: result.changeId, message: result.message });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "set_ideas",
    {
      title: "Edit what the team could build",
      description: `Change the "What you could build" lines of this project, one per product shape. Read the ideas block of get_resource_pack first; it lists every catalog example with on (ticked) and the team's own lines with own. To add one line send add (M84), to drop one send remove by its exact text; the rest is untouched. A catalog example is ticked by sending its exact text; a line of your own is any other text; an edited catalog example carries from, the original text, which then steps aside until the line is removed. ideas replaces the whole list instead; send one form per call. Keep every line the team ticked or wrote unless the team asked to drop it. ${WRITE_RULES}`,
      inputSchema: z.object({
        ideas: z
          .array(
            z.object({
              shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]),
              text: z.string().min(KIT_LIMITS.ideas.textMin).max(KIT_LIMITS.ideas.textMax),
              from: z.string().min(1).max(KIT_LIMITS.ideas.textMax).optional(),
            }),
          )
          .max(KIT_LIMITS.ideas.max)
          .optional(),
        add: z
          .array(
            z.object({
              shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]),
              text: z.string().min(KIT_LIMITS.ideas.textMin).max(KIT_LIMITS.ideas.textMax),
              from: z.string().min(1).max(KIT_LIMITS.ideas.textMax).optional(),
            }),
          )
          .max(KIT_LIMITS.ideas.max)
          .optional(),
        remove: z
          .array(
            z.object({
              shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]),
              text: z.string().min(1).max(KIT_LIMITS.ideas.textMax),
            }),
          )
          .max(KIT_LIMITS.ideas.max)
          .optional(),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const incremental = (args.add?.length ?? 0) + (args.remove?.length ?? 0) > 0;
      if (args.ideas && incremental) return errorResult("Send ideas (the whole list) or add and remove, not both.");
      if (!args.ideas && !incremental) return errorResult("Send ideas, add or remove.");
      const kit = args.ideas
        ? { ideas: args.ideas }
        : { ...(args.add?.length ? { addIdeas: args.add } : {}), ...(args.remove?.length ? { removeIdeas: args.remove } : {}) };
      const result = await submitAgentChange(
        project,
        design,
        ownerOf(project),
        { target: "project", kind: "fields", patch: { kit } },
        args.note,
      );
      if (!result.ok) return errorResult(result.message);
      return jsonResult({ outcome: result.outcome, changeId: result.changeId, message: result.message });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "set_build_steps",
    {
      title: "Tick, add, remove or restore build steps",
      description: `Change this project's build steps. done and undone tick or untick steps by id from get_build_steps; tick a step when the work is written down and you can point to it, not when it is started. evidence takes id and text pairs (a file path, a test name, an address, an REA evidence id, up to 200 characters) stored beside the step, shown under it in the studio and in RESOURCES.md, and read back on get_build_steps; send it with the tick instead of listing files in the note, and empty text clears it. notApplicable takes id and reason pairs for catalog steps that do not fit this product (a fixed rate order book has no PT wrapper to prove); the step stays listed struck through with the reason, leaves the progress count and is unticked; applicable takes ids to bring back. Use it instead of remove when the step is honest to show. add puts new steps under one of the project's product shapes (shape, title, optional detail on what done looks like). remove takes steps out of the list by id; a step shared between shapes goes for all of them, and a step the team added is deleted. restore brings removed catalog steps back. ${WRITE_RULES}`,
      inputSchema: z.object({ ...buildStepsPatchSchema.shape, note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(
        project,
        design,
        ownerOf(project),
        {
          target: "project",
          kind: "build_steps",
          patch: {
            done: args.done,
            undone: args.undone,
            add: args.add,
            remove: args.remove,
            restore: args.restore,
            evidence: args.evidence,
            notApplicable: args.notApplicable,
            applicable: args.applicable,
          },
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
    "get_templates",
    {
      title: "This project's contract templates",
      description:
        "The contract templates this project can decide (M63, M80), the catalog placements under its shapes' subsectors plus every template a build step or feature of the shapes cites, each with via (subsector, step or feature). Each template is listed once under templates; steps lists the build steps that cite them with templateIds, and unplaced the ids no step lists. By default each row is a summary (id, name, provider, via, kind, licenseClass, audited, availability, onChain, complexity, decision, ponsFit as a flag, docsUrl, steps, suggestedBy); pass detail full for the whole record with license text, notes, repo, both chains and the Pons fit line. Narrow with step (a step id from get_build_steps), shape, decision (accepted, rejected, open) or ids (up to 20). Inactive protocols are left out. Every id here is accepted by set_template_decisions. Never fork a template whose licenseClass is restricted; integrate it or reject it and name the replacement." + PREVIEW_NOTE,
      inputSchema: z.object({
        step: z.string().max(160).optional(),
        shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]).optional(),
        decision: z.enum(["accepted", "rejected", "open"]).optional(),
        ids: z.array(z.string().max(80).regex(TEMPLATE_ID)).max(20).optional(),
        detail: z.enum(["summary", "full"]).optional(),
        preview: previewField,
      }),
    },
    async ({ preview, ...filter }, ctx) => {
      const loaded = await withProject(projectId, ctx, preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const pack = buildResourcePack(loaded.value.project.draft_doc);
      if (!pack) return errorResult(NO_SHAPE_HINT);
      if (filter.shape && !pack.shapes.includes(filter.shape))
        return errorResult(`${filter.shape} is not one of this project's shapes (${pack.shapes.join(", ")}).`);
      return jsonResult({ ...stateOf(loaded.value), ...templatesRead(pack, filter) });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "set_template_decisions",
    {
      title: "Accept or reject contract templates",
      description: `Record the team's decision on contract templates by id from get_templates (every id it lists, placed or cited, is accepted here; an unknown id answers with the ids this project can decide). decisions maps a template id to accepted, rejected or open (open clears a decision). Decide only after the team has agreed in the conversation and say why in the note. One decision per template per project, shown on every build step that lists it. ${WRITE_RULES}`,
      inputSchema: z.object({
        decisions: z
          .record(z.string().max(80).regex(TEMPLATE_ID), z.enum(["accepted", "rejected", "open"]))
          .refine((o) => Object.keys(o).length > 0, "Send at least one decision"),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(
        project,
        design,
        ownerOf(project),
        { target: "project", kind: "fields", patch: { kit: { templates: args.decisions } } },
        args.note,
      );
      if (!result.ok) return errorResult(result.message);
      return jsonResult({ outcome: result.outcome, changeId: result.changeId, message: result.message });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "create_linked_token_design",
    {
      title: "Start this project's token design",
      description: `Start the token design for this project when none is linked (M82). Creates a blank draft design named after the project (or name) with an optional ticker, links it to the project at once, and sends changes, the same shape update_linked_token_design takes, through the project's write mode. The creation itself is immediate in propose and direct mode alike, since a blank draft is undoable in the studio, and is listed under Agent changes as Started. Refused when a design is already linked (use update_linked_token_design) and when agent writes are off. Answers with the design id, its studio URL and the outcome of the changes. Then run check_design and read get_linked_token_design for the advice per product shape.`,
      inputSchema: z.object({
        name: z.string().min(TOKEN_DESIGN_LIMITS.name.min).max(TOKEN_DESIGN_LIMITS.name.max).optional(),
        ticker: z.string().max(TOKEN_DESIGN_LIMITS.ticker.max).regex(TOKEN_DESIGN_LIMITS.ticker.pattern).optional(),
        changes: tokenDesignPatchSchema.optional(),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      const created = await createLinkedDesign(project, ownerOf(project), {
        name: args.name ?? project.draft_doc.name,
        ticker: args.ticker,
      });
      if (!created.ok) return errorResult(created.message);
      const base = {
        designId: created.design.id,
        studioUrl: `https://www.canhav.com/studio/token/${created.design.id}`,
        created: "A blank draft was created and linked to this project.",
      };
      if (!args.changes || Object.keys(args.changes).length === 0)
        return jsonResult({ ...base, outcome: null, message: "No fields were sent. Fill the design with update_linked_token_design." });
      const result = await submitAgentChange(
        project,
        created.design,
        ownerOf(project),
        { target: "token_design", kind: "fields", patch: args.changes },
        args.note,
      );
      if (!result.ok) return jsonResult({ ...base, outcome: null, message: result.message });
      return jsonResult({
        ...base,
        ...(await afterWrite(projectId, ctx, result)),
        changed: changeLines(created.design.draft_doc, args.changes).map((l) => l.path),
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "update_linked_token_design",
    {
      title: "Change the linked token design's draft",
      description: `Change fields of the token design linked to this project. Name and ticker, logo (a URL on CanHav's image store from set_logo, or null to clear), rationale, supply and allocations, vesting, distribution, market (including launchTarget, the venue the token ideates for, canhav_curve, pons or pools_xyz; Pons and Pools run on Robinhood Chain mainnet only, which check_design reports as a warning on an Arbitrum project), governance, legal and post-launch. The vesting cohort list replaces the stored list. Allocations are whole percentages and must total 100 before the design can publish. Read the advice block on get_linked_token_design before changing the rationale. ${WRITE_RULES} Run check_design afterwards for warnings.`,
      inputSchema: z.object({ changes: tokenDesignPatchSchema, note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(
        project,
        design,
        ownerOf(project),
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
    "report_session",
    {
      title: "Report what you are doing",
      description:
        "Tell the owner where this run stands (M86). state is working, awaiting_input (you need something from the owner, say what in message), done or error. title names the run in a few words, message is one or two sentences for the owner, plan is the whole list of steps you intend with a status each (pending, in_progress, done, canceled), replaced in full on every call, and externalUrl is where the work lives (a branch, a PR, a document). Call it with your plan before you start, after each step with the plan updated, and at the end with done and a short message. Reports update the open session; pass new true to start another run. The owner sees it live at the top of Agent changes, the editor notice fires when you wait on them or finish, and the studio row reads Agent working or Waiting on you. A session that stops reporting reads as stale after thirty minutes. Changes no draft, so it works in propose and direct mode; refused when agent writes are off.",
      inputSchema: reportSessionSchema,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      if (agentStateOf(project).mode === "off")
        return errorResult("Agent writes are off for this project, so there is no session to report. The owner can turn them on in the studio, on the project page under Agent changes.");
      const session = await reportAgentSession(project.id, project.owner_id, args);
      if (!session) return errorResult("Agent sessions are not available for this project yet. The CanHav database has not been updated for them.");
      return jsonResult({
        session: { ...session, view: sessionView(session), progress: planProgress(session.plan) },
        reviewUrl: reviewUrl(project.id),
      });
    },
    scope,
  );

  // Link a launched token to this project, or take the link off (M89). An
  // owner level action, so it happens at once in propose and direct mode
  // (reversible by the other tool) and is listed under Agent changes.
  const TOKEN_REF = z
    .string()
    .min(6)
    .max(300)
    .describe("The token as a full 0x address, the short form the studio shows (0x1234…abcd), or the token page link (canhav.com/launch/t/0x…).");

  async function recordLink(project: ProjectRow, address: string, linked: boolean, note: string | undefined) {
    return recordAgentChange({
      projectId: project.id,
      ownerId: project.owner_id,
      target: "project",
      targetId: project.id,
      kind: "link",
      patch: { tokenAddress: address, linked },
      note: note?.trim() ? note.trim().slice(0, AGENT_CHANGE_LIMITS.note.max) : null,
      status: "applied",
    });
  }

  registerMeteredTool(
    server,
    "set_summary",
    {
      title: "Summarise what is built and what is being built",
      description: `Write the project's summary (M104), the few lines the owner reads on the Overview and sends back to you with the points they disagree with. built lists what works today, one sentence per line with the file, test or contract that proves it; building lists what is in progress or next. At most ${PROJECT_LIMITS.summary.lines} lines each, ${PROJECT_LIMITS.summary.textMax} characters per line, plain words. Both lists replace the stored ones; keep it current as work lands, not only at the end of a run. Read back on get_project under draft.summary and on get_project_status. ${WRITE_RULES}`,
      inputSchema: z.object({
        built: z.array(z.string().min(PROJECT_LIMITS.summary.textMin).max(PROJECT_LIMITS.summary.textMax)).max(PROJECT_LIMITS.summary.lines),
        building: z.array(z.string().min(PROJECT_LIMITS.summary.textMin).max(PROJECT_LIMITS.summary.textMax)).max(PROJECT_LIMITS.summary.lines),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(
        project,
        design,
        ownerOf(project),
        { target: "project", kind: "fields", patch: { summary: { built: args.built, building: args.building } } },
        args.note,
      );
      if (!result.ok) return errorResult(result.message);
      return jsonResult({ outcome: result.outcome, changeId: result.changeId, message: result.message, built: args.built.length, building: args.building.length });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "set_logo",
    {
      title: "Set the logo",
      description:
        "Upload a logo for this project or for its linked token design (M90) and store it on the record. target is project or token_design. Send the image as url (an https image you host or found; it is fetched, checked and copied to CanHav's content addressed image store, up to 4 MB) or as data (base64, a data URL or bare base64 with mediaType, up to 1.5 MB; png, jpeg, webp or gif). The upload itself is immediate; setting the record's logo rides the project's write mode like any field change, and update_project or update_linked_token_design can later send logo null to clear it. A design's logo becomes the token image when the owner launches from the design. Shown in the studio, on the public page and on the Explore board.",
      inputSchema: z.object({
        target: z.enum(["project", "token_design"]),
        url: z.string().regex(/^https:\/\/\S+$/).max(600).optional(),
        data: z.string().max(2_100_000).optional(),
        mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]).optional(),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      if (agentStateOf(project).mode === "off")
        return errorResult("Agent writes are off for this project. The owner can turn them on in the studio, on the project page under Agent changes.");
      if (args.target === "token_design" && !design) return errorResult(NO_DESIGN);
      if (Boolean(args.url) === Boolean(args.data)) return errorResult("Send url or data, not both and not neither.");
      const stored = args.url ? await storeImageFromUrl(args.url) : await storeImageFromBase64(args.data!, args.mediaType);
      if (!stored.ok) return errorResult(stored.message);
      const result = await submitAgentChange(
        project,
        design,
        ownerOf(project),
        args.target === "project"
          ? { target: "project", kind: "fields", patch: { logo: stored.url } }
          : { target: "token_design", kind: "fields", patch: { logo: stored.url } },
        args.note,
      );
      if (!result.ok) return errorResult(result.message);
      return jsonResult({
        ...(await afterWrite(projectId, ctx, result)),
        logo: { url: stored.url, hash: stored.hash, contentType: stored.contentType, bytes: stored.bytes },
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "link_launch",
    {
      title: "Link a launched token to this project",
      description:
        "Link a token launched through CanHav to this project (M89). token is the full 0x address, the short form the studio shows (0x1234…abcd, matched against the account's launches) or the token page link. The launch has to belong to the owner's account (recorded to it, or created by a wallet verified on it) and sit on this project's chain; a launch linked to another project moves here. Immediate in propose and direct mode, since unlink_launch reverses it, and listed under Agent changes as Launch link. Afterwards get_launch, get_curve_status and the other token tools answer for it. Refused when agent writes are off.",
      inputSchema: z.object({ token: TOKEN_REF, note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      if (agentStateOf(project).mode === "off")
        return errorResult("Agent writes are off for this project. The owner can turn them on in the studio, on the project page under Agent changes.");
      const result = await linkLaunch(args.token, mcpOwner(ctx) ?? ownerOf(project), project.id);
      if (!result.ok) return errorResult(result.message);
      const changeId = await recordLink(project, result.address, true, args.note);
      return jsonResult({
        linked: true,
        address: result.address,
        name: result.name,
        launchUrl: launchUrl(result.address),
        movedFromProjectId: result.previousProjectId && result.previousProjectId !== project.id ? result.previousProjectId : null,
        changeId,
        message: "Linked. The project's chain is now fixed to the token's chain, and the token tools on this server answer for it.",
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "unlink_launch",
    {
      title: "Take a launched token off this project",
      description:
        "Remove the link between a launched token and this project (M89). token takes the same forms as link_launch. Only a token linked to this project can be unlinked here. The launch itself is untouched. Refused when agent writes are off.",
      inputSchema: z.object({ token: TOKEN_REF, note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      if (agentStateOf(project).mode === "off")
        return errorResult("Agent writes are off for this project. The owner can turn them on in the studio, on the project page under Agent changes.");
      const result = await linkLaunch(args.token, mcpOwner(ctx) ?? ownerOf(project), null, { onlyFrom: project.id });
      if (!result.ok) return errorResult(result.message);
      const changeId = await recordLink(project, result.address, false, args.note);
      return jsonResult({ linked: false, address: result.address, name: result.name, changeId, message: "Unlinked." });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "withdraw_changes",
    {
      title: "Take back proposals",
      description:
        "Withdraw proposals of yours that the owner has not decided yet (M88). changeIds names them (from the changeId a write answered with, or get_agent_changes); all true withdraws every waiting proposal on this project instead. A withdrawn proposal leaves the projection at once, so a later read no longer applies it, and stays in the history as Withdrawn. Use it when a proposal is superseded (send the replacement first, then withdraw the old one) or was wrong. Proposals the owner already accepted or rejected, and direct writes, cannot be taken back; the owner undoes those in the studio. Refused when agent writes are off.",
      inputSchema: z.object({
        changeIds: z.array(z.string().uuid()).max(AGENT_CHANGE_LIMITS.pending.max).optional(),
        all: z.boolean().optional(),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      if (agentStateOf(project).mode === "off")
        return errorResult("Agent writes are off for this project. The owner can turn them on in the studio, on the project page under Agent changes.");
      if (!args.all && !args.changeIds?.length) return errorResult("Send changeIds, or all true.");
      const pending = await listPendingChanges(project.id, project.owner_id);
      const wanted = args.all ? pending.map((c) => c.id) : args.changeIds!;
      const pendingIds = new Set(pending.map((c) => c.id));
      const notPending = wanted.filter((id) => !pendingIds.has(id));
      if (notPending.length)
        return errorResult(`${notPending.slice(0, 3).join(", ")} ${notPending.length === 1 ? "is" : "are"} not waiting on this project. Only proposals the owner has not decided can be withdrawn; read get_agent_changes for their status.`);
      const withdrawn: string[] = [];
      for (const id of wanted) if (await withdrawAgentChange(id, project.id, project.owner_id)) withdrawn.push(id);
      const after = await withProject(projectId, ctx);
      return jsonResult({
        withdrawn,
        message: withdrawn.length ? "Withdrawn. The owner sees them under Earlier changes as Withdrawn." : "Nothing was withdrawn.",
        ...(after.ok ? { pending: { ...after.value.pending, reviewUrl: reviewUrl(projectId) } } : {}),
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
        "How the owner lets agents write to this project (off, propose or direct), the newest agent session (state, title, message, plan and link, see report_session) and the recent agent changes with their status. Proposed means waiting on the owner, accepted and applied mean the draft has it, rejected means the owner declined, withdrawn means the agent took it back with withdraw_changes. An accepted row carries appliedPatch, the part of the proposal the owner let through, possibly edited line by line, so compare it with patch to see what was dropped or changed." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      const [changes, session] = await Promise.all([
        listAgentChanges(project.id, project.owner_id),
        latestAgentSession(project.id, project.owner_id),
      ]);
      return jsonResult({
        ...stateOf(loaded.value),
        mode: agentStateOf(project).mode,
        session: session ? { ...session, view: sessionView(session), progress: planProgress(session.plan) } : null,
        changes,
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_history",
    {
      title: "Version history of this project",
      description:
        "Studio+. The draft's revisions, newest first, with who saved (owner, agent, member or restore), when, and the top level fields that changed. Send rev to read that revision's full document. Restoring is done by the owner in the studio.",
      inputSchema: z.object({ rev: z.number().int().min(1).optional() }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      if (args.rev) {
        const row = await getRevision("project", project.id, args.rev);
        if (!row) return errorResult(`No revision ${args.rev} on this project.`);
        return jsonResult({ rev: row.rev, author: row.author, createdAt: new Date(row.created_at).toISOString(), doc: row.doc });
      }
      return jsonResult({ revisions: await listRevisions("project", project.id) });
    },
    { ...scope, plus: "version_history" },
  );

  registerMeteredTool(
    server,
    "check_project",
    {
      title: "Check this project record",
      description:
        "Validate this project's draft against CanHav's project rules and report the first problem, or that it is ready to publish." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const draft: ProjectDoc = loaded.value.project.draft_doc;
      const firstProblem = validateProjectDoc(draft);
      return jsonResult({ ...stateOf(loaded.value),
        valid: firstProblem === null, firstProblem });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_resource_pack",
    {
      title: "This project's resource pack",
      description:
        "The curated reading list CanHav recommends for this project's product shape, in read-first order, with fetchable URLs, the family each resource comes from, caveat flags, the chain the project builds on, and where the relevant protocols run on it today. Returns the resources the team ticked in the studio; pass includeUnselected to see everything. The whole pack is large, so start with summary true (counts per section and the identity header), then ask for sections (resources, checklist, review, templates, features, ideas, environment, launchTarget, templateGaps) and narrow with shape, step, priority or family. The templates block carries the contract templates for the shapes with the team's decisions (get_templates reads them by step, shape, decision or ids), and launchTarget the venue the linked design ideates for with the templates that carry a Pons fit." + PREVIEW_NOTE,
      inputSchema: z.object({
        summary: z.boolean().optional(),
        sections: z.array(z.enum(PACK_SECTIONS)).max(PACK_SECTIONS.length).optional(),
        shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]).optional(),
        step: z.enum(KIT_STEPS as [KitStep, ...KitStep[]]).optional(),
        priority: z.enum(KIT_PRIORITY_ORDER as [KitPriority, ...KitPriority[]]).optional(),
        family: z.enum(KIT_FAMILY_ORDER as [KitFamily, ...KitFamily[]]).optional(),
        includeUnselected: z.boolean().optional(),
        preview: previewField,
      }),
    },
    async ({ preview, summary, sections, shape, ...args }, ctx) => {
      const loaded = await withProject(projectId, ctx, preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const pack = buildResourcePack(project.draft_doc, { ...args, shape, launchTarget: design ? launchTargetOf(design.draft_doc) : null });
      if (!pack) return errorResult(NO_SHAPE_HINT);
      if (shape && !pack.shapes.includes(shape))
        return errorResult(`${shape} is not one of this project's shapes (${pack.shapes.join(", ")}).`);
      if (summary) return jsonResult({ ...stateOf(loaded.value), ...packSummary(pack) });
      return jsonResult({ ...stateOf(loaded.value), ...packSections(pack, sections, shape) });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "get_prelaunch_review",
    {
      title: "This project's pre-launch review",
      description:
        "The review passes that apply to this project's product shape, each with what a reviewer checks, the resources that define it, and the team's recorded verdict (pass, fail, not applicable, or open). Run the prelaunch_review prompt to walk them against a repository." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const view = buildReviewView(loaded.value.project.draft_doc);
      if (!view) return errorResult(NO_SHAPE_HINT);
      return jsonResult({ ...stateOf(loaded.value),
        source: "draft", ...view });
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
