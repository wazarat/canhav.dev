import "server-only";

import {
  AGENT_CHANGE_LIMITS,
  type AgentChangeKind,
  type AgentChangeTarget,
  type BuildStepsPatch,
  type ProjectPatch,
  type TokenDesignPatch,
  applyBuildSteps,
  applyProjectPatch,
  applyTokenBuildSteps,
  applyTokenDesignPatch,
  buildStepsPatchSchema,
  buildStepsProblem,
  describeIssues,
  projectPatchProblem,
  projectPatchSchema,
  tokenBuildStepsProblem,
  tokenDesignPatchSchema,
} from "@/lib/agent-writes";
import {
  agentStateOf,
  countPendingChanges,
  listPendingChanges,
  recordAgentChange,
  writeProjectDraftAsAgent,
  writeTokenDesignDraftAsAgent,
} from "@/lib/agent-writes-db";
import { isProjectChain, projectChainOf } from "@/lib/chains";
import { CHAIN_LOCKED, projectChainLocked } from "@/lib/launch-project";
import {
  type ProjectRow,
  type TokenDesignRow,
  createProjectTokenLink,
  createTokenDesign,
  deleteTokenDesignDraft,
  getLinkedTokenDesign,
  getProject,
} from "@/lib/ideation-db";
import { emptyTokenDesignDoc } from "@/lib/ideation";
import { type Owner, ownedBy, ownerOf } from "@/lib/owner";

/**
 * The one path an agent change takes, whatever tool sent it. Reads the
 * owner's mode off the project, then either files a proposal or writes the
 * draft and records what was written.
 */

export type SubmitResult =
  | { ok: true; outcome: "proposed" | "applied"; changeId: string | null; message: string }
  | { ok: false; message: string };

const OFF =
  "Agent writes are off for this project. The owner can turn them on in the studio, on the project page under Agent changes.";
const NOT_READY =
  "Agent writes are not available for this project yet. The CanHav database has not been updated for them.";
const TOO_MANY = `This project already has ${AGENT_CHANGE_LIMITS.pending.max} proposals waiting. The owner has to accept or reject some in the studio first.`;
const BUSY = "The draft changed while this was being written. Read it again and retry.";
const NO_DESIGN = "No token design is linked to this project. The owner links or starts one in the studio.";

const PROPOSED =
  "Proposed. The owner sees this in the studio under Agent changes and decides whether to accept it. The draft is unchanged until then.";
const APPLIED =
  "Written to the draft. The owner sees it listed in the studio under Agent changes. Nothing is published until the owner publishes.";

type Input =
  | { target: "project"; kind: "fields"; patch: ProjectPatch }
  | { target: "project"; kind: "build_steps"; patch: BuildStepsPatch }
  | { target: "token_design"; kind: "fields"; patch: TokenDesignPatch }
  | { target: "token_design"; kind: "build_steps"; patch: BuildStepsPatch };

/** True when a change moves the project to another chain after a token launched from it (M52). */
async function chainChangeRefused(project: ProjectRow, patch: unknown): Promise<boolean> {
  const chain = (patch as { chain?: unknown } | null)?.chain;
  if (!isProjectChain(chain) || chain === projectChainOf(project.draft_doc)) return false;
  return projectChainLocked(project.id);
}

/** The project draft with one change applied. Shared with the studio's accept. */
export function nextProjectDoc(
  row: ProjectRow,
  kind: AgentChangeKind,
  patch: unknown,
): { ok: true; doc: ProjectRow["draft_doc"] } | { ok: false; message: string } {
  if (kind === "build_steps") {
    const parsed = buildStepsPatchSchema.safeParse(patch);
    if (!parsed.success) return { ok: false, message: describeIssues(parsed.error, patch) };
    const problem = buildStepsProblem(row.draft_doc, parsed.data);
    if (problem) return { ok: false, message: problem };
    return { ok: true, doc: applyBuildSteps(row.draft_doc, parsed.data) };
  }
  const parsed = projectPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, message: describeIssues(parsed.error, patch) };
  const problem = projectPatchProblem(row.draft_doc, parsed.data);
  if (problem) return { ok: false, message: problem };
  return { ok: true, doc: applyProjectPatch(row.draft_doc, parsed.data) };
}

export function nextTokenDesignDoc(
  row: TokenDesignRow,
  kind: AgentChangeKind,
  patch: unknown,
): { ok: true; doc: TokenDesignRow["draft_doc"] } | { ok: false; message: string } {
  if (kind === "build_steps") {
    const parsed = buildStepsPatchSchema.safeParse(patch);
    if (!parsed.success) return { ok: false, message: describeIssues(parsed.error, patch) };
    const problem = tokenBuildStepsProblem(parsed.data);
    if (problem) return { ok: false, message: problem };
    return { ok: true, doc: applyTokenBuildSteps(row.draft_doc, parsed.data) };
  }
  const parsed = tokenDesignPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, message: describeIssues(parsed.error, patch) };
  return { ok: true, doc: applyTokenDesignPatch(row.draft_doc, parsed.data) };
}

/**
 * Write one change into its draft, guarded on the revision read. Retries
 * once on a crossed write, from a fresh read.
 */
export async function writeChange(
  projectId: string,
  owner: Owner,
  target: AgentChangeTarget,
  kind: AgentChangeKind,
  patch: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const project = await getProject(projectId, owner);
    if (!project) return { ok: false, message: "Project not found." };
    if (target === "project") {
      const rev = agentStateOf(project).rev;
      if (rev === null) return { ok: false, message: NOT_READY };
      const next = nextProjectDoc(project, kind, patch);
      if (!next.ok) return next;
      if (kind === "fields" && (await chainChangeRefused(project, patch))) return { ok: false, message: CHAIN_LOCKED };
      if (await writeProjectDraftAsAgent(project.id, owner, next.doc, rev)) return { ok: true };
      continue;
    }
    const design = await getLinkedTokenDesign(project.id);
    if (!design || !ownedBy(design, owner)) return { ok: false, message: NO_DESIGN };
    const rev = typeof design.agent_rev === "number" ? design.agent_rev : null;
    if (rev === null) return { ok: false, message: NOT_READY };
    const next = nextTokenDesignDoc(design, kind, patch);
    if (!next.ok) return next;
    if (await writeTokenDesignDraftAsAgent(design.id, owner, next.doc, rev)) return { ok: true };
  }
  return { ok: false, message: BUSY };
}

/** What is waiting on a project, as every read on its server reports it (M81). */
export interface PendingView {
  /** Proposals waiting for the owner. */
  count: number;
  /** The waiting proposals the projection applied, oldest first. */
  changeIds: string[];
  /** Waiting proposals that no longer apply to the draft, with the reason. */
  skipped: Array<{ id: string; reason: string }>;
}

export interface ProjectedContext {
  project: ProjectRow;
  design: TokenDesignRow | null;
  pending: PendingView;
}

/**
 * The drafts with the waiting proposals applied, oldest first (M81). What
 * an agent in propose mode reads by default, so a change it just proposed
 * is visible to its next read and a run can build on its own proposals. A
 * proposal that no longer applies (the draft moved under it, or it depends
 * on one the owner rejected) is skipped and named. Nothing is written.
 */
export async function projectedContext(
  project: ProjectRow,
  design: TokenDesignRow | null,
  ownerId: string,
): Promise<ProjectedContext> {
  const rows = await listPendingChanges(project.id, ownerId);
  let p = project;
  let d = design;
  const changeIds: string[] = [];
  const skipped: PendingView["skipped"] = [];
  for (const c of rows) {
    if (c.target === "project") {
      const next = nextProjectDoc(p, c.kind, c.patch);
      if (next.ok) {
        p = { ...p, draft_doc: next.doc };
        changeIds.push(c.id);
      } else skipped.push({ id: c.id, reason: next.message });
      continue;
    }
    if (!d) {
      skipped.push({ id: c.id, reason: NO_DESIGN });
      continue;
    }
    const next = nextTokenDesignDoc(d, c.kind, c.patch);
    if (next.ok) {
      d = { ...d, draft_doc: next.doc };
      changeIds.push(c.id);
    } else skipped.push({ id: c.id, reason: next.message });
  }
  return { project: p, design: d, pending: { count: rows.length, changeIds, skipped } };
}

const ALREADY_LINKED = "A token design is already linked to this project. Change it with update_linked_token_design.";

/**
 * Start the linked token design from the agent (M82). A blank draft is
 * created and linked at once in propose and direct mode alike, since a
 * blank draft is undoable in the studio, and the row that records it has
 * kind create so the history reads "Started token design". Fields the
 * agent sends with it ride the project's write mode like any change.
 */
export async function createLinkedDesign(
  project: ProjectRow,
  owner: Owner,
  input: { name: string; ticker?: string },
): Promise<{ ok: true; design: TokenDesignRow; changeId: string | null } | { ok: false; message: string }> {
  const { mode, rev } = agentStateOf(project);
  if (rev === null) return { ok: false, message: NOT_READY };
  if (mode === "off") return { ok: false, message: OFF };
  if (await getLinkedTokenDesign(project.id)) return { ok: false, message: ALREADY_LINKED };
  const doc = emptyTokenDesignDoc(input.name);
  if (input.ticker) doc.ticker = input.ticker;
  // The design is keyed like its project, so the whole team sees it (M107).
  const design = await createTokenDesign(project.owner_id, doc, project.org_id ?? null);
  if (!design) return { ok: false, message: NOT_READY };
  const linked = await createProjectTokenLink(project.id, design.id, owner.userId);
  if (!linked.ok) {
    // Lost a race with the studio. The design just made is an orphan draft; the link that won stands.
    await deleteTokenDesignDraft(design.id, ownerOf(project));
    return { ok: false, message: ALREADY_LINKED };
  }
  const changeId = await recordAgentChange({
    projectId: project.id,
    ownerId: project.owner_id,
    target: "token_design",
    targetId: design.id,
    kind: "create",
    patch: { name: doc.name, ...(doc.ticker ? { ticker: doc.ticker } : {}) },
    note: null,
    status: "applied",
  });
  return { ok: true, design, changeId };
}

export async function submitAgentChange(
  project: ProjectRow,
  design: TokenDesignRow | null,
  owner: Owner,
  input: Input,
  note: string | undefined,
): Promise<SubmitResult> {
  const { mode, rev } = agentStateOf(project);
  if (rev === null) return { ok: false, message: NOT_READY };
  if (mode === "off") return { ok: false, message: OFF };

  let targetId = project.id;
  if (input.target === "token_design") {
    if (!design || !ownedBy(design, owner)) return { ok: false, message: NO_DESIGN };
    targetId = design.id;
    if (input.kind === "build_steps") {
      const problem = tokenBuildStepsProblem(input.patch);
      if (problem) return { ok: false, message: problem };
    }
  } else if (input.kind === "build_steps") {
    const problem = buildStepsProblem(project.draft_doc, input.patch);
    if (problem) return { ok: false, message: problem };
  } else {
    const problem = projectPatchProblem(project.draft_doc, input.patch);
    if (problem) return { ok: false, message: problem };
    if (await chainChangeRefused(project, input.patch)) return { ok: false, message: CHAIN_LOCKED };
  }
  if (Object.keys(input.patch).length === 0)
    return { ok: false, message: "The change is empty. Send at least one field." };

  const record = {
    projectId: project.id,
    ownerId: project.owner_id,
    target: input.target,
    targetId,
    kind: input.kind,
    patch: input.patch,
    note: note?.trim() ? note.trim().slice(0, AGENT_CHANGE_LIMITS.note.max) : null,
  };

  if (mode === "propose") {
    if ((await countPendingChanges(project.id)) >= AGENT_CHANGE_LIMITS.pending.max)
      return { ok: false, message: TOO_MANY };
    const changeId = await recordAgentChange({ ...record, status: "proposed" });
    if (!changeId) return { ok: false, message: NOT_READY };
    return { ok: true, outcome: "proposed", changeId, message: PROPOSED };
  }

  const written = await writeChange(project.id, owner, input.target, input.kind, input.patch);
  if (!written.ok) return written;
  const changeId = await recordAgentChange({ ...record, status: "applied" });
  return { ok: true, outcome: "applied", changeId, message: APPLIED };
}
