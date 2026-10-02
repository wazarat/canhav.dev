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
  projectPatchProblem,
  projectPatchSchema,
  tokenBuildStepsProblem,
  tokenDesignPatchSchema,
} from "@/lib/agent-writes";
import {
  agentStateOf,
  countPendingChanges,
  recordAgentChange,
  writeProjectDraftAsAgent,
  writeTokenDesignDraftAsAgent,
} from "@/lib/agent-writes-db";
import { isProjectChain, projectChainOf } from "@/lib/chains";
import { CHAIN_LOCKED, projectChainLocked } from "@/lib/launch-project";
import {
  type ProjectRow,
  type TokenDesignRow,
  getLinkedTokenDesign,
  getProject,
} from "@/lib/ideation-db";

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
    if (!parsed.success) return { ok: false, message: "The build step change is not valid." };
    const problem = buildStepsProblem(row.draft_doc, parsed.data);
    if (problem) return { ok: false, message: problem };
    return { ok: true, doc: applyBuildSteps(row.draft_doc, parsed.data) };
  }
  const parsed = projectPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, message: "The change is not valid." };
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
    if (!parsed.success) return { ok: false, message: "The build step change is not valid." };
    const problem = tokenBuildStepsProblem(parsed.data);
    if (problem) return { ok: false, message: problem };
    return { ok: true, doc: applyTokenBuildSteps(row.draft_doc, parsed.data) };
  }
  const parsed = tokenDesignPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, message: "The change is not valid." };
  return { ok: true, doc: applyTokenDesignPatch(row.draft_doc, parsed.data) };
}

/**
 * Write one change into its draft, guarded on the revision read. Retries
 * once on a crossed write, from a fresh read.
 */
export async function writeChange(
  projectId: string,
  ownerId: string,
  target: AgentChangeTarget,
  kind: AgentChangeKind,
  patch: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const project = await getProject(projectId, ownerId);
    if (!project) return { ok: false, message: "Project not found." };
    if (target === "project") {
      const rev = agentStateOf(project).rev;
      if (rev === null) return { ok: false, message: NOT_READY };
      const next = nextProjectDoc(project, kind, patch);
      if (!next.ok) return next;
      if (kind === "fields" && (await chainChangeRefused(project, patch))) return { ok: false, message: CHAIN_LOCKED };
      if (await writeProjectDraftAsAgent(project.id, ownerId, next.doc, rev)) return { ok: true };
      continue;
    }
    const design = await getLinkedTokenDesign(project.id);
    if (!design || design.owner_id !== ownerId) return { ok: false, message: NO_DESIGN };
    const rev = typeof design.agent_rev === "number" ? design.agent_rev : null;
    if (rev === null) return { ok: false, message: NOT_READY };
    const next = nextTokenDesignDoc(design, kind, patch);
    if (!next.ok) return next;
    if (await writeTokenDesignDraftAsAgent(design.id, ownerId, next.doc, rev)) return { ok: true };
  }
  return { ok: false, message: BUSY };
}

export async function submitAgentChange(
  project: ProjectRow,
  design: TokenDesignRow | null,
  ownerId: string,
  input: Input,
  note: string | undefined,
): Promise<SubmitResult> {
  const { mode, rev } = agentStateOf(project);
  if (rev === null) return { ok: false, message: NOT_READY };
  if (mode === "off") return { ok: false, message: OFF };

  let targetId = project.id;
  if (input.target === "token_design") {
    if (!design || design.owner_id !== ownerId) return { ok: false, message: NO_DESIGN };
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
    ownerId,
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

  const written = await writeChange(project.id, ownerId, input.target, input.kind, input.patch);
  if (!written.ok) return written;
  const changeId = await recordAgentChange({ ...record, status: "applied" });
  return { ok: true, outcome: "applied", changeId, message: APPLIED };
}
