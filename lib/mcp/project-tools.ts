import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { type Owner, ownerOf } from "@/lib/owner";
import { getRevision, listRevisions } from "@/lib/revisions-db";
import { landscapeFor } from "@/lib/competitors/landscape";
import { latestCheckRuns } from "@/lib/checks/db";
import { DRAFT_KIND_FIELDS, draftPromptName, draftWriteHint, openRequests, withDrafted, withoutRequest } from "@/lib/draft/requests";
import { DRAFT_AGENT_PROMPTS } from "@/lib/agent-prompts-draft";
import { briefLines } from "@/lib/draft/briefs";
import { DRAFT_KIND_FEATURES, type DraftKind } from "@/lib/draft/limits";
import { stripPlusFields } from "@/lib/plan-fields";
import { projectPlus } from "@/lib/plan-project";
import { ageMonths } from "@/lib/competitors/record";

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
import { FIELD_PATCH_PATH, FIELD_TAB, openFields } from "@/lib/project-fields";
import { tokenDesignOpenSections } from "@/lib/token-design-steps";
import { COMPARABLES_NOTE, COMPARABLES_SOURCE, COMPARABLE_SECTIONS, type ComparableSection, comparablesForSubsectors, pickSections } from "@/lib/comparables";
import { effectiveSubsectors } from "@/lib/kits";
import { dependencyCheck } from "@/lib/viability/check";
import { gapMap } from "@/lib/gaps";
import { reachFor } from "@/lib/reach-server";
import { dueLine, isOverdue, orderExperiments } from "@/lib/experiments";
import { PROFILE_KEYS as REACH_PROFILE_KEYS } from "@/lib/value-canvas";
import { ECONOMICS_FORMULAS, SHAPE_ECONOMICS_FAMILY, breakEvenSentence, computeEconomics, defaultEconomics, economicsLines, familyOf, inputsFor } from "@/lib/economics";
import { ECONOMICS_COPY } from "@/content/economics";
import { dependencyCheckStatic } from "@/lib/viability/static";
import {
  type ProjectRow,
  type TokenDesignRow,
  getLinkedTokenDesign,
  getProject,
  getSnapshot,
  designDeployChain,
  getProjectOrgId,
} from "@/lib/ideation-db";
import {
  designConstraints,
  designDeployability,
  designWarnings,
} from "@/lib/mcp/design-views";
import { type IndexedCurve, getCurve, getTokenAnalytics } from "@/lib/indexer";
import { lastTestAt, listAlerts, recordTestEvent } from "@/lib/alerts/db";
import { ALERT_LIMITS, testMessage } from "@/lib/alerts/kinds";
import { deliverToChannels } from "@/lib/alerts/send";
import { setWatch, syncWatch } from "@/lib/alerts/watch";
import { DEFAULT_CADENCE, UPDATE_LIMITS, periodOf, toHighlight, updateDue, updateInputSchema } from "@/lib/updates";
import { inviteState } from "@/lib/tester";
import { listUpdates, publishUpdate, upsertUpdate } from "@/lib/updates-db";
import { listFeedback, listInvites } from "@/lib/tester-db";
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
import { agentStateOf, listAgentChanges, listPendingChanges, recordAgentChange, withdrawAgentChange, writeProjectDraftAsAgent } from "@/lib/agent-writes-db";
import { linkLaunch } from "@/lib/launch-project";
import { storeImageFromBase64, storeImageFromUrl } from "@/lib/images";
import { milestoneOf, milestoneOfStep } from "@/lib/build-milestones";
import { type PendingView, createLinkedDesign, projectedContext, submitAgentChange } from "@/lib/agent-writes-server";
import { AGENT_COPY, CHAIN_COPY } from "@/content/ideation";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { agentRequestHowTo, openAgentRequests } from "@/lib/agent-requests";
import { planProgress, reportSessionSchema, sessionView } from "@/lib/agent-sessions";
import { PROSPECT_LIMITS, prospectInputSchema } from "@/lib/prospects";
import { listProspects } from "@/lib/prospects-db";
import { groupsFor } from "@/content/kits/checklists";
import { latestAgentSession, reportAgentSession } from "@/lib/agent-sessions-db";
import { buildProgress, checklistFor, checklistItemById, gatedStepsFor, sectionsFor } from "@/content/kits/checklists";
import { featuresFor } from "@/content/kits/features";
import { tokenBuildProgressOf, tokenBuildRowsOf } from "@/content/token-steps";
import type { TokenLaunchFacts } from "@/lib/token-steps";
import { REVIEW_VERDICT_LABELS, shapeBlurb, shapeLabel, shapeLabels, shapeName } from "@/content/kits/copy";
import { NO_SHAPE_HINT, PACK_SECTIONS, buildResourcePack, buildReviewView, packSections, packSummary, templatesRead } from "@/lib/kit-pack";
import { PROJECT_CHAINS, type ProjectChain, chainInfo, chainIsBeta, projectChainOf } from "@/lib/chains";
import { SECTOR_VALUES, type Sector } from "@/lib/sectors";
import { deployerEnvFile, deployerHint, deployerView } from "@/lib/deployer";
import { getDeployerBalances } from "@/lib/deployer-server";
import { launchTargetLabel } from "@/content/launch-targets";
import { launchTargetFit, launchTargetOf } from "@/lib/launch-targets";
import { mainnetView } from "@/lib/mainnet-view";
import { TEMPLATE_ID } from "@/lib/templates";
import { FEATURE_ID, KIT_LIMITS, SHAPE_COLORS, SHAPE_LANES, allShapes, customStepShapes, hasFeature, isOwnShapeId, isProductShape, laneOf } from "@/lib/kits";
import { SHAPE_ICON_NAMES } from "@/content/kits/shape-icons";

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
  // The project's team answers the Studio+ gates (M134), read per request, never at registration.
  const scope = { scope: `project:${projectId}`, orgOf: () => getProjectOrgId(projectId) };
  const registeredPrompts = new Set<string>();

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
      // The Studio+ blocks read back only while the project's team is on the plan (M134).
      const plus = await projectPlus(project);
      const shown = <T extends Partial<ProjectDoc>>(d: T): T => (plus ? d : stripPlusFields(d));
      return jsonResult({
        ...stateOf(loaded.value),
        id: project.id,
        slug: project.slug,
        status: project.status,
        name: project.draft_doc.name,
        updatedAt: project.updated_at,
        publicUrl: publicUrl("p", project),
        plus,
        draft: shown(project.draft_doc),
        published: snapshot
          ? {
              version: snapshot.version,
              publishedAt: snapshot.created_at,
              snapshotHash: snapshot.snapshot_hash,
              doc: snapshot.doc.kind === "project" ? shown(snapshot.doc) : snapshot.doc,
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
      // The draft requests and the update cadence are Studio+ work, shown while the team is on the plan (M134).
      const plus = await projectPlus(project);
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
      // Recommended fields the team has not stated (M130); the agent states each or waives it.
      const open = openFields(project.draft_doc);
      // The owner's requests for the agent (M151) come before everything else.
      const stepGroups = project.draft_doc.kit ? groupsFor(kitShapes(project.draft_doc.kit), project.draft_doc.kit) : [];
      const agentRequests = openAgentRequests(project.draft_doc).map((r) => {
        const g = r.kind === "step" ? stepGroups.find((x) => x.key === r.target) : undefined;
        return {
          kind: r.kind,
          target: r.target ?? null,
          requestedAt: r.requestedAt,
          howTo: agentRequestHowTo(r.kind, deployerEnvFile(project.draft_doc)),
          // The step itself (M152): id, title, what done means, what to read, which templates to decide.
          ...(g ? { step: { id: g.key, ids: g.ids, title: g.title, detail: g.detail, milestone: milestoneOf(g), resources: g.resources, templates: g.templates, shapes: g.shapes } } : {}),
        };
      });
      const nextAction = agentRequests.length
        ? `The owner asked for ${agentRequests.length === 1 ? "one thing" : `${agentRequests.length} things`} first, listed under agentRequests. ${agentRequests[0].howTo}`
        : projectProblem
        ? "Fix the project draft in the studio."
        : project.status !== "published"
          ? open.length
            ? `Publish the project. ${open.length} recommended ${open.length === 1 ? "field is" : "fields are"} not stated and would publish as Not stated; fill ${open.length === 1 ? "it" : "them"} with update_project or send waived with a short reason where ${open.length === 1 ? "it does" : "they do"} not apply.`
            : "Publish the project."
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
            const chains = deployerAddress.chains.map((c) => {
              const b = balances.find((x) => x.chain === c.chain);
              return { ...c, explorerUrl: `${c.explorerUrl}${deployerAddress.address}`, balanceEth: b?.eth ?? null, funded: b?.funded ?? false };
            });
            return {
              ...deployerAddress,
              // Only the project's chain counts (M148); the other testnet is listed for completeness.
              fundedOnProjectChain: chains.find((c) => c.chain === deployerAddress.projectChain)?.funded ?? false,
              chains,
            };
          })()
        : { address: null, projectChain: projectChainOf(project.draft_doc), hint: deployerHint(project.draft_doc), envFile: deployerEnvFile(project.draft_doc) };
      const chainKey = projectChainOf(project.draft_doc);
      // The dependency check without the pools read (M163): what is missing or needs a workaround on the chain, for a Studio+ team.
      const deps = plus ? dependencyCheckStatic(project.draft_doc).summary : null;
      // The unit economics (M166): the chosen case's break even, for a Studio+ team with a record.
      const economics = plus && project.draft_doc.economics ? { family: project.draft_doc.economics.family, chosen: project.draft_doc.economics.chosen, breakEven: breakEvenSentence(project.draft_doc.economics), by: project.draft_doc.economics.by, updatedAt: project.draft_doc.economics.updatedAt } : null;
      // Experiments (M170): the running ones and the overdue ones, for a Studio+ team.
      const experimentsOpen = plus ? (project.draft_doc.experiments ?? []).filter((e) => e.status === "running") : [];
      const experiments = plus ? { running: experimentsOpen.map((e) => ({ id: e.id, hypothesis: e.hypothesis, due: dueLine(e.deadline) })), overdue: experimentsOpen.filter((e) => isOverdue(e)).map((e) => e.id), planned: (project.draft_doc.experiments ?? []).filter((e) => e.status === "planned").length, howTo: "Read get_experiments for every experiment with its evidence; add evidence or propose a verdict in result with update_project experiments; only a person sets passed or failed." } : null;
      const dependencies = deps ? { summary: deps.sentence, missing: deps.missing, workaround: deps.workaround, mainnetOnly: deps.mainnetOnly, howTo: "Read check_dependencies for every row with its source; a missing or workaround row can become a build step with set_build_steps add (milestone testnet or design)." } : null;
      return jsonResult({
        plus,
        // The owner's requests for the agent (M151): make the deployer key, work a step. Each says how; answering it clears it.
        agentRequests,
        // The chain the project builds on, with the beta note when it applies (M148), so the agent promises no path that does not exist there.
        chain: {
          key: chainKey,
          name: chainInfo(chainKey).name,
          chainId: chainInfo(chainKey).chainId,
          beta: chainIsBeta(chainKey),
          note: chainIsBeta(chainKey) ? CHAIN_COPY.betaNote(chainInfo(chainKey).name) : null,
        },
        // Open draft requests come first (M117): the owner clicked Draft and waits on the agent.
        draftRequests: (plus ? openRequests(project.draft_doc) : []).map((r) => ({
          kind: r.kind,
          field: DRAFT_KIND_FIELDS[r.kind],
          target: r.target ?? null,
          body: r.body ?? null,
          // The team's brief for the kind (M142), as the lines to build on, null when none was written.
          brief: briefLines(r.kind, project.draft_doc.briefs?.[r.kind]) || null,
          requestedAt: r.requestedAt,
          prompt: draftPromptName(r.kind),
          howTo: draftWriteHint(r.kind, r.target),
        })),
        ...stateOf(loaded.value),
        deployer,
        // The team Safe (M160), owners and threshold as read onchain, null until the team records one.
        teamSafe: project.draft_doc.teamSafe ?? null,
        // The agent's own summary (M104), null until set_summary has run.
        summary: project.draft_doc.summary ?? null,
        // The team's update cadence and whether one is due now (Studio+); write it with set_weekly_update.
        updates: await (async () => {
          if (!plus) return null;
          const cadence = project.draft_doc.updateCadence ?? DEFAULT_CADENCE;
          const rows = await listUpdates(project.id);
          return { cadence, periodOf: periodOf(cadence), due: updateDue(cadence, rows), howTo: "When due is true, write the period's update with set_weekly_update; manual means only when the owner asks." };
        })(),
        project: {
          id: project.id,
          name: project.draft_doc.name,
          status: project.status,
          slug: project.slug,
          firstProblem: projectProblem,
          // Recommended fields still open (M130), with the update_project field that states each.
          openFields: open.map((f) => ({ field: f.key, label: f.label, stateWith: FIELD_PATCH_PATH[f.key], tab: FIELD_TAB[f.key] })),
          waived: project.draft_doc.waived ?? {},
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
              // The editor sections still open (M131); update_linked_token_design fills any field.
              openSections: tokenDesignOpenSections(design.draft_doc),
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
        dependencies,
        economics,
        experiments,
        // A missing dependency rides on the next action (M163) so the agent plans the workaround with the rest.
        nextAction: [
          nextAction,
          dependencies?.missing.length ? `The dependency check finds ${dependencies.missing.join(", ")} missing on ${chainInfo(chainKey).short}; read check_dependencies and plan the workaround.` : "",
          experiments?.overdue.length ? `${experiments.overdue.length === 1 ? "An experiment is" : `${experiments.overdue.length} experiments are`} running past the deadline (${experiments.overdue.join(", ")}); read get_experiments, add the evidence you have and propose a verdict in result.` : "",
        ]
          .filter(Boolean)
          .join(" "),
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
      description: `Change fields of this project's draft across the editor steps. Basics (name, whatItDoes, audience b2b or b2c, personas for a b2b audience with teamSize, geography, industry, primaryContact and revenueRange, consumerPersonas for a b2c audience with ageRange, geography, cryptoExperience, howTheyFindYou and holdings, payer, whoPays, whyThisChain, stage), architecture (contracts as rows of name, 2 to 80 characters, and why it exists, 10 to 300, up to thirty, the list replaces the stored list, contractsNone true for the honest None yet, and contractsLegacy, the free text answer from before rows existed, which get_project returns when the team has one, split it into rows and send contractsLegacy null to drop it; externalDeps, externalDepsNone, oracleUse, oracles, adminFunctions as rows of name and why with an optional contract, the name of a contracts row it lives on, and holder, who can call it such as "Team Safe 2 of 3" or "Timelock, 1 day", up to thirty, the list replaces the stored list, adminFunctionsNone true when the contracts are immutable and have no admin functions, which publishes as a strength, and adminFunctionsLegacy, the free text answer from before rows existed, split it into rows and send adminFunctionsLegacy null to drop it; upgradeability), security (worstCase and the five status declarations), reality (firstHundredUsers) and the verification fields (githubRepo, website as an https URL, testnetContracts as address and optional label rows or plain lowercase addresses, up to a hundred, the list replaces the stored list, addressBook as an https URL to the file or explorer list that holds every deployed address, verifyWallet, and deployer, the throwaway deployer key's lowercase address, never the key itself, null to clear, recorded as made by the agent and answering the owner's open key request on get_project_status, and deployerEnvFile, where that key lives in the repository as a path relative to its root, for example packages/contracts/.env, null for the default .env of the contracts package; read the repository layout and record the real path), logo (a URL on CanHav's image store from set_logo, or null to clear), and summary (built and building lists, see set_summary, null to clear), and canvas, the Business Model Canvas (Studio+), any of customerSegments, valueProposition, channels, customerRelationships, revenueStreams, keyResources, keyActivities, keyPartners and costStructure as a list of up to eight short items of 2 to 140 characters, one idea each (a paragraph or plain lines are split into items), each block sent replaces the stored block and the rest stay, items carry an id that get_project returns and an item sent with its id keeps that id so later links to it hold, null to clear the canvas, competitors (Studio+) with differentiator, one line of up to 300 characters on how the project differs, read the landscape with get_competitors first, brand (Studio+) with palette (primary, secondary, accent, surface as lowercase hex), fonts (display and body from the Google Fonts list the studio offers), tone (two to five words) and tagline, merged over the stored kit, null to clear, and icp (Studio+), one or two ideal customer profiles with name, summary, walletsTheyUse, channels, protocolsTheyUse, buyingTrigger and objection, the list replaces the stored one, null to clear, and valueCanvas (Studio+), the Value Proposition Canvas per profile keyed "0" and "1", each with products, painRelievers, gainCreators, jobs, pains and gains as lists of up to eight short items of 2 to 140 characters (a paragraph or plain lines are split, items carry ids that get_project returns, keep an id to edit in place, and a reliever or creator may carry answers, the ids of the pains or gains it addresses), each area sent replaces the stored area, a profile key sent as null drops its canvas, and assets (Studio+ under viability), the tokens the idea depends on as rows of symbol (an upper case ticker of at most 12 characters), role (collateral, borrow, quote, underlying or reward) and an optional address (the token on the project's chain or its mainnet), up to twenty, the list replaces the stored list, a row sent with the id get_project returns keeps that row's provenance, null to clear; read the contracts in the repository and record every token they touch, since the dependency check on the Viability tab reads a price feed and onchain liquidity for each, and writing assets clears the owner's open request for them, and experiments (Studio+ under viability), a list of experiments where a row without an id is appended and a row with an id from get_experiments is updated in place (fields left out keep their values), each with assumption (kind canvas, value or text, ref the item id for canvas or value, text), hypothesis, test, metric, passBar, killCriterion, deadline as YYYY-MM-DD, status among planned, running and stopped (passed and failed are a person's call from the project page), evidence rows (text and an optional https url, appended with you as the author) and result, the paragraph that proposes or records the outcome, null to clear them all, and reachProtocols (Studio+ under icp), protocol contracts on the mainnet to count in the reachable wallets queries as rows of name and lowercase address, up to twenty, the list replaces the stored list, null to clear, and economics (Studio+ under viability), the unit economics with family (read get_unit_economics for the project's family and inputs), scenarios.low, .base and .high as full or partial input sets of the family's keys (rates as percentages, money in dollars, a missing key keeps the stored or default value) and chosen, merged over the stored record and stamped as filled by the agent, null to clear, and investorPack (Studio+) with files, where the one pager and the deck you built live, files.onepager and files.deck each a path in the repository or an https URL of at most 300 characters, null to drop one, merged over the stored pack, null to clear it all, never published; the one pager and the deck themselves are built outside CanHav from the draft_pack prompt and are no longer written here, a write of onepager, deck or grants is refused. Writing canvas, icp, valueCanvas, competitors, brand or investorPack.files clears the owner's open draft request for it (get_project_status lists them first) and marks the field as drafted by the agent. What the project is classed as (sectors, sectorOther, subsectors, and under kit the product shapes, startingPoint scratch or existing_product, existingProduct, resources with tick and untick lists of resource ids from get_resource_pack, and review, a list of pass and verdict pairs with ids from get_prelaunch_review and verdict pass, fail, na or open to clear). Also references, the team's own files as title, location (a link or a path on the team's machine), note and an optional evidence handle (an REA evidence id, a test name, a commit), which are never published and are read back on get_project under draft.references. Also updateCadence (Studio+), how often the team posts an update, daily, every_other_day, weekly or manual, null for the default weekly. Also chain, robinhood_testnet or arbitrum_sepolia, the testnet the project builds on and its token launches on, which is refused once a token has launched from the project. Also mainnet, the deployment beside the testnet launch (M70), with contracts (label and lowercase address, the list replaces the stored list, on the mainnet the project's chain stands in for), companionTemplate (a template accepted on this project with a Pons fit line, see get_templates, null to clear) and pons (the paired Pons launch's tokenAddress and the creator feeRecipient, Robinhood Chain projects only, null to clear), and pair, the external trading pair (venue pons, pools_xyz, uniswap or other, quoteAsset as a symbol or a lowercase address, optional pairAddress and an https url where it trades, pons and pools_xyz on Robinhood Chain projects only, null to clear); send mainnet null to clear the whole record. A sector marked Coming soon is refused, a subsector must belong to a chosen sector, and a shape must be offered under the chosen subsectors, so send sectors, subsectors and kit.shapes together when starting from nothing. Changing sectors or subsectors drops the shapes they no longer offer. Lists replace the stored list. The distribution acknowledgement can only be ticked by a person in the studio. The Studio+ fields (canvas, icp, valueCanvas, competitors, brand, investorPack, updateCadence, assets, economics, experiments, reachProtocols) are refused when the project's team is not on Studio+. Also waived, a map of recommended field to a reason of 3 to 200 characters saying why it does not apply (subsectors, sectorOther, contracts, externalDeps, oracles, adminFunctions, upgradeability, worstCase, audit, bugBounty, monitoring, incidentResponse, keyCustody, firstHundredUsers), merged over the stored map, a key sent as null clears that waiver; the reason publishes as plain text and a stated value always wins over it. check_project lists the recommended fields still open under recommendedOpen. ${WRITE_RULES} Run check_project afterwards to see what is still missing.`,
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
      // Ours, then the catalog steps the team's own shapes picked (M176), each once.
      const ours = checklistFor(kitShapes(kit));
      const picked = [...new Set((kit?.ownShapes ?? []).flatMap((o) => o.steps))]
        .filter((id) => !ours.some((i) => i.id === id))
        .map((id) => checklistItemById(id))
        .filter((i): i is NonNullable<typeof i> => Boolean(i));
      const items = [...ours, ...picked];
      // A shape may hold only steps the team added, so the shapes decide, not the catalog (M52).
      if (!kit || allShapes(kit).length === 0) return errorResult(NO_SHAPE_HINT);
      const groupOf = new Map<string, readonly string[]>();
      const shapesOf = new Map<string, readonly string[]>();
      for (const section of sectionsFor(kitShapes(kit), kit))
        for (const g of [...section.groups, ...section.sharedAbove])
          for (const id of g.ids) {
            groupOf.set(id, g.ids);
            shapesOf.set(id, g.shapes);
          }
      const hidden = new Set(kit.hiddenSteps ?? []);
      const gatedOff = (i: { feature?: string }) => Boolean(i.feature) && !hasFeature(kit, i.feature!);
      const features = featuresFor(kitShapes(kit));
      return jsonResult({
        ...stateOf(loaded.value),
        progress: buildProgress(kit),
        // Every shape, ours then own (M176), with its lane, icon and colour (M177); the cap is 3 on Studio and 10 on Studio+, ours and own together.
        shapes: allShapes(kit).map((id) => ({
          id,
          name: shapeName(kit, id),
          own: isOwnShapeId(id),
          lane: laneOf(kit, id),
          // The definition (M178): the team's words, an own shape's detail, else our blurb.
          definition: kit.ownShapes?.find((o) => o.id === id)?.detail ?? kit.shapeParagraphs?.[id] ?? (isProductShape(id) ? (shapeBlurb(id) ?? "") : ""),
          ...(kit.shapeStyles?.[id] ?? {}),
        })),
        // Lines the team added to what a shape includes (M179), each with the added steps linked to it.
        ownFeatures: (kit.ownFeatures ?? []).map((f) => ({ ...f, steps: (kit.customSteps ?? []).filter((c) => c.feature === f.id).map((c) => c.id) })),
        ownShapes: (kit.ownShapes ?? []).map((o) => ({ id: o.id, title: o.title, detail: o.detail, ...(o.basedOn ? { copiedFrom: o.basedOn } : {}), steps: o.steps })),
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
              shape: shapesOf.get(i.id)?.[0] ?? i.id.slice(0, i.id.indexOf(".")),
              shapes: [...(shapesOf.get(i.id) ?? [i.id.slice(0, i.id.indexOf("."))])],
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
            shapes: customStepShapes(c) as string[],
            title: c.title,
            detail: c.detail,
            editorStep: null,
            milestone: milestoneOf({ key: c.id, step: "review", custom: true, ...(c.milestone ? { milestone: c.milestone } : {}) }),
            done: kit.checklist?.[c.id] === true,
            state: kit.notApplicable?.[c.id] ? "na" : kit.checklist?.[c.id] === true ? "done" : "open",
            ...(kit.notApplicable?.[c.id] ? { reason: kit.notApplicable[c.id] } : {}),
            ...(kit.evidence?.[c.id] ? { evidence: kit.evidence[c.id] } : {}),
            custom: true,
            sharedWith: [] as string[],
            templates: [] as string[],
            ...(c.feature ? { feature: c.feature } : {}),
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
      description: `Change what this project's product includes (M64). addOwn adds lines of the team's own under a shape (shape, title, optional detail) and removeOwn removes them by id (M179); link a step to a line with set_build_steps. tick and untick take feature ids from get_build_steps (the features block). A ticked feature lists the build steps it gates and ranks the templates it suggests first on get_templates; unticking hides those steps again without losing their ticks. ${WRITE_RULES}`,
      inputSchema: z.object({
        tick: z.array(z.string().max(120).regex(FEATURE_ID)).max(KIT_LIMITS_FEATURES).default([]),
        untick: z.array(z.string().max(120).regex(FEATURE_ID)).max(KIT_LIMITS_FEATURES).default([]),
        // Lines of the team's own under a shape's What this product includes (M179).
        addOwn: z
          .array(z.object({ shape: z.string().max(60), title: z.string().min(KIT_LIMITS.ownFeatures.titleMin).max(KIT_LIMITS.ownFeatures.titleMax), detail: z.string().max(KIT_LIMITS.ownFeatures.detailMax).default("") }))
          .max(20)
          .default([]),
        removeOwn: z.array(z.string().max(20)).max(KIT_LIMITS.ownFeatures.max).default([]),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      if (args.tick.length + args.untick.length + args.addOwn.length + args.removeOwn.length === 0) return errorResult("Name at least one feature, or a line to add or remove.");
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
        {
          target: "project",
          kind: "fields",
          patch: {
            kit: {
              ...(Object.keys(features).length ? { features } : {}),
              ...(args.addOwn.length || args.removeOwn.length ? { ownFeatures: { ...(args.addOwn.length ? { add: args.addOwn } : {}), ...(args.removeOwn.length ? { remove: args.removeOwn } : {}) } } : {}),
            },
          },
        },
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
      description: `Change the "What you could build" lines of this project, one per product shape. shape may be an own shape id (own.<slug>) since M176. Read the ideas block of get_resource_pack first; it lists every catalog example with on (ticked) and the team's own lines with own. To add one line send add (M84), to drop one send remove by its exact text; the rest is untouched. A catalog example is ticked by sending its exact text; a line of your own is any other text; an edited catalog example carries from, the original text, which then steps aside until the line is removed. ideas replaces the whole list instead; send one form per call. Keep every line the team ticked or wrote unless the team asked to drop it. ${WRITE_RULES}`,
      inputSchema: z.object({
        ideas: z
          .array(
            z.object({
              shape: z.string().max(60),
              text: z.string().min(KIT_LIMITS.ideas.textMin).max(KIT_LIMITS.ideas.textMax),
              from: z.string().min(1).max(KIT_LIMITS.ideas.textMax).optional(),
            }),
          )
          .max(KIT_LIMITS.ideas.max)
          .optional(),
        add: z
          .array(
            z.object({
              shape: z.string().max(60),
              text: z.string().min(KIT_LIMITS.ideas.textMin).max(KIT_LIMITS.ideas.textMax),
              from: z.string().min(1).max(KIT_LIMITS.ideas.textMax).optional(),
            }),
          )
          .max(KIT_LIMITS.ideas.max)
          .optional(),
        remove: z
          .array(
            z.object({
              shape: z.string().max(60),
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
      description: `Change this project's build steps. done and undone tick or untick steps by id from get_build_steps; tick a step when the work is written down and you can point to it, not when it is started. evidence takes id and text pairs (a file path, a test name, an address, an REA evidence id, up to 200 characters) stored beside the step, shown under it in the studio and in RESOURCES.md, and read back on get_build_steps; send it with the tick instead of listing files in the note, and empty text clears it. notApplicable takes id and reason pairs for catalog steps that do not fit this product (a fixed rate order book has no PT wrapper to prove); the step stays listed struck through with the reason, leaves the progress count and is unticked; applicable takes ids to bring back. Use it instead of remove when the step is honest to show. add puts new steps under one of the project's shapes (shape, title, optional detail on what done looks like, optional shapes for further shapes it serves, ours or own ids from get_build_steps, and an optional milestone, design, testnet or review, design when left out; the dependency check's suggested steps carry theirs). shapes takes id and shapes pairs to put a step the team added on other shapes, each list replacing the old one, at least one (M176). An added step may name the feature it delivers with feature (a catalog feature id or an own line id from get_build_steps), and featureLinks takes id and feature pairs to link or, with null, unlink a step the team added, so the feature lists its steps (M179). remove takes steps out of the list by id; a step shared between shapes goes for all of them, and a step the team added is deleted. restore brings removed catalog steps back. ${WRITE_RULES} Ticking, marking not applicable or removing a step the owner queued for you clears that request; get_project_status lists them first under agentRequests with the step's title, detail, resources and templates (M152).`,
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
            shapes: args.shapes,
            featureLinks: args.featureLinks,
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

  // Shapes and boards (M176): add one of ours or one the team makes, remove one, and sort its board.
  registerMeteredTool(
    server,
    "add_shape",
    {
      title: "Add a product shape",
      description:
        "Add a shape to this project (M176). Send shape for one of ours (an id from get_project's offered shapes, under the project's sectors), or name (and detail, and copyFrom, one of our shape ids whose catalog steps it starts with) for a shape the team makes, which gets an id own.<slug>. Ours and own count together against the cap, 3 on Studio and 10 on Studio+. A new shape sits in core; move it with set_shape. " +
        WRITE_RULES,
      inputSchema: z.object({
        shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]).optional(),
        name: z.string().trim().min(KIT_LIMITS.ownShapes.titleMin).max(KIT_LIMITS.ownShapes.titleMax).optional(),
        detail: z.string().max(KIT_LIMITS.ownShapes.detailMax).optional(),
        copyFrom: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]).optional(),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      if (Boolean(args.shape) === Boolean(args.name)) return errorResult("Send shape for one of ours, or name for a shape of your own, not both.");
      const { project, design } = loaded.value;
      const patch = args.shape
        ? { kit: { shapes: [...kitShapes(project.draft_doc.kit), args.shape] } }
        : { kit: { ownShapes: { add: [{ title: args.name!, detail: args.detail ?? "", ...(args.copyFrom ? { copyFrom: args.copyFrom } : {}) }] } } };
      const result = await submitAgentChange(project, design, ownerOf(project), { target: "project", kind: "fields", patch }, args.note);
      if (!result.ok) return errorResult(result.message);
      return jsonResult({ outcome: result.outcome, changeId: result.changeId, message: result.message });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "remove_shape",
    {
      title: "Remove a product shape",
      description:
        "Take a shape off this project (M176). An own shape id (own.<slug>) goes with its lane, its lines and the steps only it has; a step it shares stays on its other shapes. One of ours is taken off the kit; its ticks stay stored and come back with it. " +
        WRITE_RULES,
      inputSchema: z.object({ shape: z.string().max(60), note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project, design } = loaded.value;
      const kit = project.draft_doc.kit;
      const patch = isOwnShapeId(args.shape)
        ? { kit: { ownShapes: { remove: [args.shape] } } }
        : isProductShape(args.shape) && kitShapes(kit).includes(args.shape)
          ? { kit: { shapes: kitShapes(kit).filter((s) => s !== args.shape) } }
          : null;
      if (!patch) return errorResult(`${args.shape} is not one of this project's shapes (${allShapes(kit).join(", ") || "none"}).`);
      const result = await submitAgentChange(project, design, ownerOf(project), { target: "project", kind: "fields", patch }, args.note);
      if (!result.ok) return errorResult(result.message);
      return jsonResult({ outcome: result.outcome, changeId: result.changeId, message: result.message });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "set_shape",
    {
      title: "Place a shape and style it",
      description:
        `Sort a shape into a lane, give it an icon and colour (M177) and write its definition (M178). definition is the team's paragraph on what the shape is in this product, up to 400 characters, empty restoring ours. lane is core (part of the product), exploring (being ideated) or later (to add and test later); a shape with no lane reads as core. icon is one of ${SHAPE_ICON_NAMES.join(", ")}; color is one of ${SHAPE_COLORS.join(", ")}; null clears either. shape is one of ours or an own id from get_build_steps. ` +
        WRITE_RULES,
      inputSchema: z.object({
        shape: z.string().max(60),
        lane: z.enum(SHAPE_LANES).optional(),
        icon: z.enum(SHAPE_ICON_NAMES).nullable().optional(),
        color: z.enum(SHAPE_COLORS).nullable().optional(),
        definition: z.string().max(400).optional(),
        note: noteField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      if (!args.lane && args.icon === undefined && args.color === undefined && args.definition === undefined) return errorResult("Send a lane, an icon, a colour or a definition.");
      const { project, design } = loaded.value;
      const kit = {
        ...(args.lane ? { shapeLanes: { [args.shape]: args.lane } } : {}),
        ...(args.definition !== undefined
          ? isOwnShapeId(args.shape)
            ? { ownShapes: { edit: [{ id: args.shape, detail: args.definition }] } }
            : { shapeParagraphs: { [args.shape]: args.definition } }
          : {}),
        ...(args.icon !== undefined || args.color !== undefined ? { shapeStyles: { [args.shape]: { ...(args.icon !== undefined ? { icon: args.icon } : {}), ...(args.color !== undefined ? { color: args.color } : {}) } } } : {}),
      };
      const result = await submitAgentChange(project, design, ownerOf(project), { target: "project", kind: "fields", patch: { kit } }, args.note);
      if (!result.ok) return errorResult(result.message);
      return jsonResult({ outcome: result.outcome, changeId: result.changeId, message: result.message });
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
        "Tell the owner where this run stands (M86). state is working, awaiting_input (you need something from the owner, say what in message), done or error. title names the run in a few words, message is one or two sentences for the owner, plan is the whole list of steps you intend with a status each (pending, in_progress, done, canceled) and the build milestone each advances (design, testnet, review or launch, as get_build_steps groups the steps; leave it out for a step outside the build), replaced in full on every call, and externalUrl is where the work lives (a branch, a PR, a document). Call it with your plan before you start, after each step with the plan updated, and at the end with done and a short message. Reports update the open session; pass new true to start another run. The owner sees it live at the top of Agent changes, the editor notice fires when you wait on them or finish, and the studio row reads Agent working or Waiting on you. A session that stops reporting reads as stale after thirty minutes. Changes no draft, so it works in propose and direct mode; refused when agent writes are off.",
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
    "get_comparables",
    {
      title: "Comparables for this project's subsectors",
      description:
        "How existing protocols in this project's subsectors are built, how they differ from each other and what goes wrong with each design, from the canhav.co research store. Bound to the project's subsectors, the declared ones plus the ones its product shapes imply. Each entity carries components, contrasts, risks by category, dependencies with severity, links and templateIds into get_templates. Call it before you propose architecture, and read the risks before the security review passes. It carries no metrics, no dates and no rankings on purpose; read the linked docs for anything current. The studio shows the same entities under Competitors on the Business model tab (Studio+), where the team pins one on the map or attaches a component or risk line to a value canvas item as its source (valueCanvas items carry refs, which update_project accepts as comparable, section and name). A protocol appearing here says nothing about whether it is deployed on this project's testnet; get_templates and the resource pack's environment block answer that. Narrow with include." + PREVIEW_NOTE,
      inputSchema: z.object({
        include: z.array(z.enum(COMPARABLE_SECTIONS as unknown as [ComparableSection, ...ComparableSection[]])).optional().describe("Sections to return; every section when left out."),
        preview: previewField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const doc = loaded.value.project.draft_doc;
      const subs = effectiveSubsectors(doc.kit, doc);
      if (subs.length === 0)
        return jsonResult({ ...stateOf(loaded.value), note: COMPARABLES_NOTE, subsectors: [], total: 0, entities: [], hint: "This project has no subsector yet. Send sectors and subsectors with update_project, or ask the owner to pick them under Decisions, then read again." });
      const list = comparablesForSubsectors(subs);
      return jsonResult({
        ...stateOf(loaded.value),
        note: COMPARABLES_NOTE,
        source: COMPARABLES_SOURCE,
        subsectors: subs,
        total: list.length,
        entities: list.map((e) => pickSections(e, args.include)),
        templatesHint: "templateIds name contract templates in CanHav's catalog that belong to the protocol; read them with get_templates ids for repo, license and deployment status on this chain.",
      });
    },
    scope,
  );

  registerMeteredTool(
    server,
    "check_dependencies",
    {
      title: "Can this be built on the project's chain today",
      description:
        "The dependency check of the Viability tab (Studio+). One row per protocol the product shapes rely on (from the kit environment), per accepted contract template, per external dependency declared on Decisions, per asset the idea depends on (a Chainlink price feed on the testnet or the mainnet from the committed feed list, and pool liquidity on the mainnet from DefiLlama's daily pools snapshot) and per chain fact (the network, the faucet, the tokenized equity feeds). Each row carries a state, available, mainnet_only, workaround (a community deployment, a fork you deploy, your own recorded mock), missing or unknown, one or two sentences of reason, the source with its read date, and for a missing or workaround row a suggested build step (title, detail, milestone) you can add with set_build_steps add. Fill the assets with update_project assets first; a project without them gets protocol and chain rows only. refresh true takes a new pools snapshot." + PREVIEW_NOTE,
      inputSchema: z.object({ refresh: z.boolean().optional().describe("Take a new pools snapshot instead of today's."), preview: previewField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const check = await dependencyCheck(loaded.value.project.draft_doc, { refresh: args.refresh });
      return jsonResult({
        ...stateOf(loaded.value),
        chain: projectChainOf(loaded.value.project.draft_doc),
        summary: check.summary,
        rows: check.rows,
        readAt: check.readAt,
        poolsReadAt: check.poolsReadAt,
        oraclesCheckedOn: check.oraclesCheckedOn,
        stepsHint: "A row's step goes on the project with set_build_steps add (shape, title, detail, milestone). The studio marks such steps as coming from the dependency check.",
      });
    },
    { ...scope, plus: "viability" },
  );

  registerMeteredTool(
    server,
    "get_experiments",
    {
      title: "This project's experiments",
      description:
        "The experiments of the Viability tab (Studio+), running first, then planned, then finished, each with its id, the assumption it tests (a Business Model Canvas or value canvas item by id, or text), the hypothesis, the test, the metric, the pass bar, the kill criterion, the deadline with how far away it is, the status, the evidence timeline (text, link, time, who added it), the tester invite when one is attached and the result. Propose a new experiment, add evidence or propose a verdict (in result) with update_project experiments; only a person sets passed or failed, from the project page, which turns the linked item validated or invalidated on the public page." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const doc = loaded.value.project.draft_doc;
      const list = orderExperiments(doc.experiments ?? []);
      return jsonResult({
        ...stateOf(loaded.value),
        total: list.length,
        running: list.filter((e) => e.status === "running").length,
        overdue: list.filter((e) => isOverdue(e)).map((e) => e.id),
        experiments: list.map((e) => ({ ...e, due: dueLine(e.deadline), overdue: isOverdue(e) })),
        howTo: "A new experiment is a row without an id; a row with an id updates that experiment (fields left out keep their values, evidence sent is appended). Statuses you may set are planned, running and stopped.",
      });
    },
    { ...scope, plus: "viability" },
  );

  registerMeteredTool(
    server,
    "get_unit_economics",
    {
      title: "Do the numbers work",
      description:
        "The unit economics model of the Viability tab (Studio+). The project's family (every product shape maps to one, lending and fixed income, vaults and leveraged yield, pools, perps and options, staking and restaking, RWA and underwriting, or governance which has no revenue model), the inputs with their labels, units and bounds, the three scenarios the team stored (low, base, high) or the defaults when nothing is stored yet, the outputs per scenario (monthly revenue, monthly cost, break even scale, months to break even at the growth rate, the liquidity providers' impermanent loss for pools) and the formulas in words so you can explain them. Write a scenario with update_project economics (family, scenarios.low, .base or .high as full or partial input sets, chosen); rates are percentages as typed. Every number is a model at the entered inputs, never a forecast." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const doc = loaded.value.project.draft_doc;
      const family = doc.economics?.family ?? familyOf(kitShapes(doc.kit));
      if (!family) return jsonResult({ ...stateOf(loaded.value), family: null, hint: "This project has no product shape yet, so it has no economics family. Set kit.shapes with update_project first." });
      const record = doc.economics ?? defaultEconomics(family);
      const stored = Boolean(doc.economics);
      return jsonResult({
        ...stateOf(loaded.value),
        family,
        familyLabel: ECONOMICS_COPY.families[family],
        shapeFamilies: Object.fromEntries(kitShapes(doc.kit).map((s) => [s, SHAPE_ECONOMICS_FAMILY[s]])),
        stored,
        by: stored ? record.by : null,
        updatedAt: stored ? record.updatedAt : null,
        chosen: record.chosen,
        inputs: inputsFor(family).map((i) => ({ key: i.key, label: i.label, explain: i.explain, unit: i.unit, min: i.min, max: i.max, default: i.default })),
        scenarios: Object.fromEntries((["low", "base", "high"] as const).map((s) => [s, { values: record.scenarios[s], outputs: computeEconomics(family, record.scenarios[s]), sentence: breakEvenSentence(record, s) }])),
        sources: record.sources ?? {},
        formulas: ECONOMICS_FORMULAS[family],
        lines: economicsLines(record),
      });
    },
    { ...scope, plus: "viability" },
  );

  registerMeteredTool(
    server,
    "get_chain_gaps",
    {
      title: "What is live on the chain, by subsector",
      description:
        "The gap map of the Viability tab (Studio+), for each of the six sectors and their subsectors, how many protocols are live on the mainnet the project's chain stands in for and up to twelve names with links, from DefiLlama's monthly snapshot (every category of CanHav's subsector mapping), CanHav's own published projects on the chain and the contract templates deployed on its mainnet. A subsector with count 0 is open, nobody is there yet. Pass chain to read the other chain and sector to narrow to one sector. Counts carry the snapshot month and the date it was read; nothing here is a forecast." + PREVIEW_NOTE,
      inputSchema: z.object({
        chain: z.enum(PROJECT_CHAINS).optional().describe("robinhood_testnet reads Robinhood Chain mainnet, arbitrum_sepolia reads Arbitrum One; the project's chain when left out."),
        sector: z.enum(SECTOR_VALUES as unknown as [Sector, ...Sector[]]).optional(),
        preview: previewField,
      }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const doc = loaded.value.project.draft_doc;
      const map = await gapMap(args.chain ?? projectChainOf(doc));
      const sectors = args.sector ? map.sectors.filter((s) => s.sector === args.sector) : map.sectors;
      return jsonResult({
        ...stateOf(loaded.value),
        chain: map.chain,
        chainName: map.chainName,
        month: map.month,
        readAt: map.readAt,
        yourSubsectors: effectiveSubsectors(doc.kit, doc),
        open: map.open,
        sectors,
      });
    },
    { ...scope, plus: "viability" },
  );

  registerMeteredTool(
    server,
    "get_competitors",
    {
      title: "Competitor landscape",
      description:
        "Studio+. The protocols in this project's subsectors on its chain from DefiLlama (this month's snapshot, or any chain when the chain has too few), each with category, TVL, chains and months since listing, the families the resource pack already names, and the project's differentiator line. Write the line with update_project competitors.differentiator.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      const l = await landscapeFor(project.draft_doc);
      return jsonResult({
        categories: l.categories,
        chain: l.chain,
        onChain: l.onChain,
        month: l.month,
        kitFamilies: l.kitFamilies,
        rows: l.rows.map((r) => ({ name: r.name, slug: r.slug, category: r.category, tvl: Math.round(r.tvl), chains: r.chains, url: r.url, ageMonths: ageMonths(r.listedAt) })),
        differentiator: project.draft_doc.competitors?.differentiator ?? null,
      });
    },
    { ...scope, plus: "competitors" },
  );

  // Prospects (M158): the real people the team means to contact. Private to the team, so a
  // project key (a CI or cloud agent) is refused and only a signed in session reads or writes them.
  registerMeteredTool(
    server,
    "get_prospects",
    {
      title: "This project's prospects",
      description:
        "Studio+. The real people the team means to contact for this project, with name, contact (email, LinkedIn, X), whether they were contacted and when, and the ideal customer profile they fit. Private to the team, never published, exported or sent to a drafting model, and answered only on a signed in session, never on a project key." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      if (mcpKey(ctx)) return errorResult(STUDIO_PLUS_COPY.prospects.sessionOnly);
      const prospects = await listProspects(loaded.value.project.id);
      return jsonResult({ ...stateOf(loaded.value), total: prospects.length, contacted: prospects.filter((p) => p.contacted).length, prospects });
    },
    { ...scope, plus: "icp" },
  );

  registerMeteredTool(
    server,
    "get_reachable_users",
    {
      title: "Reachable wallets per ideal customer profile",
      description:
        "Studio+. How many real wallets on the chain's mainnet already do what this idea depends on, per ideal customer profile, from Dune, the overlap (wallets that used the subsector's contracts in the last 90 days and hold one of the project's assets), the subsector users and the asset holders, each with the exact definition and the read date, plus the 90 day daily series of subsector users. Reads this month's cached numbers and never runs Dune itself; the team refreshes from the studio (ten times a month). A project without assets answers needs_assets, fill them with update_project assets first; a deployment without the Dune queries answers not_configured. Protocol contracts the queries count come from DefiLlama's pools of the subsector; add more with update_project reachProtocols (name and address rows)." + PREVIEW_NOTE,
      inputSchema: z.object({ profile: z.enum(REACH_PROFILE_KEYS).optional().describe("0 or 1; every profile when left out."), preview: previewField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      const keys = args.profile ? [args.profile] : [...REACH_PROFILE_KEYS].filter((k) => project.draft_doc.icp?.[Number(k)]);
      const profiles = await Promise.all(
        keys.map(async (k) => {
          const result = await reachFor(project.id, project.org_id ?? null, project.draft_doc, k, projectChainOf(project.draft_doc), {});
          return { profile: k, name: project.draft_doc.icp?.[Number(k)]?.name ?? null, ...(result.kind === "ok" ? { kind: "ok", ...result.read } : result) };
        }),
      );
      return jsonResult({ ...stateOf(loaded.value), chain: projectChainOf(project.draft_doc), profiles, lastRead: project.draft_doc.reach ?? null });
    },
    { ...scope, plus: "icp" },
  );

  registerMeteredTool(
    server,
    "set_prospects",
    {
      title: "Add or update this project's prospects",
      description: `Studio+. Add or update prospects, up to ${PROSPECT_LIMITS.upsert.max} rows per call, each with name (1 to 80 characters), optional email, linkedin (a linkedin.com URL or a handle) and x (an x.com URL or a handle), contacted (default false), contactedOn (YYYY-MM-DD, only when contacted) and profile (0 or 1, the ideal customer profile the person fits). A row with an id from get_prospects updates that row; a row whose email or handle matches a stored row updates it too; the rest are added, at most ${PROSPECT_LIMITS.rows} per project. Nothing is deleted through this tool. Rides the project's write mode like any change, so in propose mode the owner accepts the rows on the project page. Answered only on a signed in session, never on a project key. ${WRITE_RULES}`,
      inputSchema: z.object({ upsert: z.array(prospectInputSchema).min(1).max(PROSPECT_LIMITS.upsert.max), note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx);
      if (!loaded.ok) return errorResult(loaded.message);
      if (mcpKey(ctx)) return errorResult(STUDIO_PLUS_COPY.prospects.sessionOnly);
      const { project, design } = loaded.value;
      const result = await submitAgentChange(project, design, ownerOf(project), { target: "project", kind: "prospects", patch: { upsert: args.upsert } }, args.note);
      if (!result.ok) return errorResult(result.message);
      return jsonResult(await afterWrite(project.id, ctx, result));
    },
    { ...scope, plus: "icp" },
  );

  registerMeteredTool(
    server,
    "get_analytics",
    {
      title: "This project's token analytics",
      description:
        "Studio+. Holders, wallets that have traded, and one row per UTC day over the last 90 days with volume in wei (the ETH side of curve trades and pool swaps), trades, new wallets trading and the holder count, for the token launched from or linked to this project. Null analytics while the indexer has not filled the tables for this token.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { address } = await projectTokenAddress(loaded.value);
      if (!address) return errorResult(noTokenMessage(loaded.value));
      const analytics = await getTokenAnalytics(address, projectChainOf(loaded.value.project.draft_doc));
      return jsonResult({ address, analytics });
    },
    { ...scope, plus: "analytics" },
  );

  registerMeteredTool(
    server,
    "set_weekly_update",
    {
      title: "Write the team update",
      description: `Studio+. Write the team update for the public page (M124). The body is two or three short paragraphs in the first person plural, at most ${UPDATE_LIMITS.body.max} characters, and up to ${UPDATE_LIMITS.highlights.max} highlights of at most ${UPDATE_LIMITS.highlights.each} characters. Give each highlight as { text, milestone, step } where milestone is the build milestone it moved (design, testnet, review or launch) and step is the id of the build step from get_build_steps when one fits; a plain string still works. One row per period of the team's cadence (daily, every other day, weekly or manual, read it and whether one is due on get_project_status under updates); weekOf is the period start as YYYY-MM-DD and defaults to the current period; writing again replaces it. It lands as a draft the owner publishes from the Overview; publish true publishes at once and is only honoured when agents write directly. This is the team's own post, not the wallet signed milestone update anchored on chain. Refused when agent writes are off. Clears the owner's open team update draft request.`,
      inputSchema: updateInputSchema.extend({ publish: z.boolean().optional(), note: noteField }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      const mode = agentStateOf(project).mode;
      if (mode === "off") return errorResult("Agent writes are off for this project. The owner can turn them on in the studio, on the project page under Agent changes.");
      const row = await upsertUpdate({ projectId: project.id, weekOf: args.weekOf, cadence: project.draft_doc.updateCadence ?? DEFAULT_CADENCE, body: args.body, highlights: args.highlights?.map(toHighlight), author: "agent", source: args.note ? { note: args.note } : null });
      if (!row) return errorResult("Could not save the update.");
      const published = args.publish && mode === "direct" ? await publishUpdate(project.id, row.id) : null;
      // The owner's open request for it, if any, is answered (M117).
      if (project.draft_doc.draftRequests?.some((r) => r.kind === "weekly")) {
        const requests = withoutRequest(project.draft_doc, "weekly");
        const { draftRequests: _old, ...rest } = project.draft_doc;
        await writeProjectDraftAsAgent(project.id, ownerOf(project), { ...rest, ...(requests ? { draftRequests: requests } : {}), drafted: withDrafted(project.draft_doc, "weekly", "agent") }, project.agent_rev ?? 0);
      }
      return jsonResult({
        id: row.id,
        weekOf: row.weekOf,
        status: published?.status ?? row.status,
        message: published ? "Published to the public page." : args.publish ? "Saved as a draft; publishing needs direct mode, so the owner publishes it from the Overview." : "Saved as a draft. The owner publishes it from the Overview.",
      });
    },
    { ...scope, plus: "weekly_update" },
  );

  registerMeteredTool(
    server,
    "get_weekly_updates",
    {
      title: "This project's team updates",
      description: "Studio+. The team updates, newest first, each with the period, the body, the highlights (highlightItems carries the milestone and step of each), who wrote it and whether it is published. Write the current one with set_weekly_update.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      return jsonResult({ updates: await listUpdates(loaded.value.project.id) });
    },
    { ...scope, plus: "weekly_update" },
  );

  registerMeteredTool(
    server,
    "get_tester_feedback",
    {
      title: "This project's tester invites and feedback",
      description:
        "Studio+. The tester invite links the owner made under Build, Testnet (label, steps, uses against the cap, expiry, state) and the feedback testers left on the public invite page, newest first, each with the step, the rating out of 5, the note and the wallet when given. Read it before deciding what to fix next.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const [invites, feedback] = await Promise.all([listInvites(loaded.value.project.id), listFeedback(loaded.value.project.id)]);
      return jsonResult({ invites: invites.map((i) => ({ ...i, state: inviteState(i) })), feedback });
    },
    { ...scope, plus: "tester_kit" },
  );

  registerMeteredTool(
    server,
    "get_alerts",
    {
      title: "This project's alert rules, channels, events and status",
      description:
        "Studio+. Whether the project is watched (the Watch switch creates a rule per recorded testnet contract and per launched or linked token), the rules with their kinds (ownership, pause, large_transfer with a threshold in the token's base units and its decimals, graduation) and source (watch or manual), the channels with their masked targets, the last ten events (kind test is a test alert sent from the studio, with no transaction) each with the line sent and what was delivered, and status, the worker's last check per chain. Turn watching on with set_alert_watch; channels (email, Telegram, Discord) are connected by the owner in the studio under Deployments. The project must belong to a team on Studio+; the worker only watches those projects' contracts and keeps a lapsed team's rules for when the plan is active again.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      await syncWatch(loaded.value.project, mcpOwner(ctx)?.userId ?? ownerOf(loaded.value.project).userId);
      return jsonResult(await listAlerts(loaded.value.project.id));
    },
    { ...scope, plus: "monitoring" },
  );

  registerMeteredTool(
    server,
    "set_alert_watch",
    {
      title: "Watch this project's contracts",
      description:
        "Studio+. Turn the Watch switch on or off (M128). On creates an alert rule for every recorded testnet contract (ownership changes, pauses) and every launched or linked token (those plus large transfers at one percent of the supply and curve graduation), kept in line with the record on every read; off removes those rules and leaves any the owner added by address. The worker picks the change up within a minute. Where alerts go is the owner's choice in the studio; when the project has no channel yet, say so and point them to Deployments, Alerts. Immediate in propose and direct mode, since it reverses. Refused when agent writes are off, and when the project's team is not on Studio+.",
      inputSchema: z.object({ enabled: z.boolean() }),
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      if (agentStateOf(project).mode === "off")
        return errorResult("Agent writes are off for this project. The owner can turn them on in the studio, on the project page under Agent changes.");
      const result = await setWatch(project, args.enabled, mcpOwner(ctx)?.userId ?? ownerOf(project).userId);
      if (!result.ok) return errorResult(result.message);
      const { channels } = await listAlerts(project.id);
      return jsonResult({
        enabled: args.enabled,
        rules: result.rules,
        channels: channels.length,
        message: args.enabled
          ? channels.length
            ? `Watching ${result.rules} addresses. The worker picks them up within a minute.`
            : `Watching ${result.rules} addresses, but nothing is connected yet. The owner adds an email, Telegram or Discord under Deployments, Alerts.`
          : "Not watching. Rules added by address stay.",
      });
    },
    { ...scope, plus: "monitoring" },
  );

  registerMeteredTool(
    server,
    "send_test_alert",
    {
      title: "Send a test alert",
      description:
        "Studio+. Send one synthetic alert through every channel the project has, right now, and record it under the last events as kind test (M128). Proves delivery without a transaction. One a minute per project. The project must belong to a team on Studio+.",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const loaded = await withProject(projectId, ctx, false);
      if (!loaded.ok) return errorResult(loaded.message);
      const { project } = loaded.value;
      if (Date.now() - (await lastTestAt(project.id)) < ALERT_LIMITS.testEveryMs) return errorResult("One test alert a minute. Try again shortly.");
      const message = testMessage(project.draft_doc.name);
      const delivered = await deliverToChannels(project.id, message.subject, message.text);
      const ids = Object.keys(delivered);
      if (ids.length === 0) return errorResult("No channel to send to. The owner connects one under Deployments, Alerts.");
      await recordTestEvent(project.id, chainInfo(projectChainOf(project.draft_doc)).chainId, message.text, delivered);
      const ok = ids.filter((id) => delivered[id].ok).length;
      return jsonResult({ delivered, message: ok === ids.length ? `Sent to ${ids.length}.` : `Sent to ${ok} of ${ids.length}. The failures carry the channel's answer.` });
    },
    { ...scope, plus: "monitoring" },
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
        "Validate this project's draft against CanHav's project rules and report the first problem, or that it is ready to publish. Publishing needs the name, a sector, what it does, the stage and, on Robinhood testnet, the distribution acknowledgement. The contract, security and reality fields are recommended, listed under recommendedOpen while they are empty; each publishes as Not stated until it is filled or marked not applicable with waived on update_project." + PREVIEW_NOTE,
      inputSchema: PREVIEW,
    },
    async (args, ctx) => {
      const loaded = await withProject(projectId, ctx, args.preview);
      if (!loaded.ok) return errorResult(loaded.message);
      const draft: ProjectDoc = loaded.value.project.draft_doc;
      const firstProblem = validateProjectDoc(draft);
      return jsonResult({
        ...stateOf(loaded.value),
        valid: firstProblem === null,
        firstProblem,
        // Recommended fields still open (M130). They never block; each publishes as Not stated.
        recommendedOpen: openFields(draft).map((f) => ({ field: f.key, label: f.label, stateWith: FIELD_PATCH_PATH[f.key], tab: FIELD_TAB[f.key] })),
        waived: draft.waived ?? {},
      });
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
      // The newest automated run per tool (M121), proof beside the team's verdicts.
      const checks = await latestCheckRuns(loaded.value.project.id);
      // The admin functions list (M154) beside the passes that ask about privileged roles, so the reviewer reads what the team stated.
      const arch = loaded.value.project.draft_doc.architecture;
      const adminFunctions = arch.adminFunctionsNone ? "none" : arch.adminFunctions.length ? arch.adminFunctions : arch.adminFunctionsLegacy ?? null;
      return jsonResult({ ...stateOf(loaded.value), source: "draft", ...view, checks, adminFunctions });
    },
    scope,
  );

  // One prompt per draft kind (M117), listed by Claude Code as slash commands.
  for (const [kind, build] of Object.entries(DRAFT_AGENT_PROMPTS) as Array<[DraftKind, (name: string, id: string, brief?: string) => string]>) {
    const name = draftPromptName(kind);
    if (registeredPrompts.has(name)) continue;
    registeredPrompts.add(name);
    registerMeteredPrompt(
      server,
      name,
      {
        title: `Draft the ${DRAFT_KIND_FIELDS[kind] ?? kind} field`,
        description: `Studio+. Reads the project and writes its ${DRAFT_KIND_FIELDS[kind] ?? kind} through update_project, the way the owner's Draft button asks for, building on the team's brief when one was written. Clears the open draft request of that kind.`,
        argsSchema: z.object({}),
      },
      async (_args, ctx) => {
        const loaded = await withProject(projectId, ctx);
        if (!loaded.ok) return promptResult(loaded.message);
        return promptResult(build(loaded.value.project.draft_doc.name, projectId, briefLines(kind, loaded.value.project.draft_doc.briefs?.[kind])));
      },
      { ...scope, plus: DRAFT_KIND_FEATURES[kind] },
    );
  }

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
