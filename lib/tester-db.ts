import "server-only";

import { BUILD_COPY } from "@/content/build";
import { orgPlus } from "@/lib/plan-project";

import { randomBytes } from "node:crypto";

import { getDb } from "@/lib/db";
import type { ProjectDoc } from "@/lib/ideation";
import { TESTER_LIMITS, type TesterFeedback, type TesterInvite, inviteState } from "@/lib/tester";

/** Storage for tester invites and feedback (M125). Owner checks happen in the routes. */

interface InviteRow {
  token: string;
  label: string;
  steps: string[];
  max_uses: number;
  uses: number;
  expires_at: string | Date;
  created_at: string | Date;
  revoked_at: string | Date | null;
  project_id?: string;
  feedback_count?: number | string;
  average_rating?: number | string | null;
}

function mapInvite(r: InviteRow): TesterInvite {
  return {
    token: r.token,
    label: r.label,
    steps: Array.isArray(r.steps) ? r.steps : [],
    maxUses: Number(r.max_uses),
    uses: Number(r.uses),
    expiresAt: new Date(r.expires_at).toISOString(),
    createdAt: new Date(r.created_at).toISOString(),
    revokedAt: r.revoked_at ? new Date(r.revoked_at).toISOString() : null,
    feedbackCount: Number(r.feedback_count ?? 0),
    averageRating: r.average_rating === null || r.average_rating === undefined ? null : Number(r.average_rating),
  };
}

export async function listInvites(projectId: string): Promise<TesterInvite[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = await sql`
      select i.*, count(f.id) as feedback_count, round(avg(f.rating)::numeric, 1) as average_rating
      from launchpad.tester_invites i left join launchpad.tester_feedback f on f.invite_token = i.token
      where i.project_id = ${projectId}
      group by i.token order by i.created_at desc
    `;
    return (rows as InviteRow[]).map(mapInvite);
  } catch (err) {
    console.error("[tester] list failed", err);
    return [];
  }
}

export async function createInvite(input: { projectId: string; label: string; steps: string[]; maxUses?: number; days?: number; createdBy: string }): Promise<{ ok: true; invite: TesterInvite } | { ok: false; message: string }> {
  const sql = getDb();
  if (!sql) return { ok: false, message: "No database." };
  try {
    const count = (await sql`select count(*)::int as n from launchpad.tester_invites where project_id = ${input.projectId} and revoked_at is null`) as Array<{ n: number }>;
    if ((count[0]?.n ?? 0) >= TESTER_LIMITS.invitesPerProject) return { ok: false, message: `Up to ${TESTER_LIMITS.invitesPerProject} open invites per project. Revoke one first.` };
    const token = randomBytes(16).toString("base64url");
    const expires = new Date(Date.now() + (input.days ?? TESTER_LIMITS.days.default) * 86_400_000).toISOString();
    const rows = await sql`
      insert into launchpad.tester_invites (token, project_id, label, steps, max_uses, expires_at, created_by)
      values (${token}, ${input.projectId}, ${input.label}, ${JSON.stringify(input.steps)}, ${input.maxUses ?? TESTER_LIMITS.maxUses.default}, ${expires}, ${input.createdBy})
      returning *
    `;
    return { ok: true, invite: mapInvite(rows[0] as InviteRow) };
  } catch (err) {
    console.error("[tester] create failed", err);
    return { ok: false, message: "Could not create the invite." };
  }
}

export async function revokeInvite(projectId: string, token: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    await sql`update launchpad.tester_invites set revoked_at = now() where token = ${token} and project_id = ${projectId} and revoked_at is null`;
    return true;
  } catch {
    return false;
  }
}

export async function listFeedback(projectId: string): Promise<TesterFeedback[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = await sql`
      select f.id, f.invite_token, i.label, f.wallet, f.step_index, f.rating, f.note, f.created_at
      from launchpad.tester_feedback f join launchpad.tester_invites i on i.token = f.invite_token
      where f.project_id = ${projectId} order by f.created_at desc limit ${TESTER_LIMITS.feedbackShown}
    `;
    return (rows as Array<{ id: string; invite_token: string; label: string; wallet: string | null; step_index: number; rating: number; note: string; created_at: string | Date }>).map((r) => ({
      id: r.id, inviteToken: r.invite_token, inviteLabel: r.label, wallet: r.wallet, stepIndex: Number(r.step_index), rating: Number(r.rating), note: r.note, createdAt: new Date(r.created_at).toISOString(),
    }));
  } catch (err) {
    console.error("[tester] feedback list failed", err);
    return [];
  }
}

/** What the public page needs: the invite and the project's name, chain and contracts from the live draft. */
export interface PublicInvite {
  invite: TesterInvite;
  state: ReturnType<typeof inviteState>;
  project: { id: string; name: string; orgId: string | null; doc: Pick<ProjectDoc, "chain" | "testnetContracts" | "website" | "logo" | "whatItDoes"> };
}

export async function getPublicInvite(token: string): Promise<PublicInvite | null> {
  const sql = getDb();
  if (!sql || !/^[\w-]{16,32}$/.test(token)) return null;
  try {
    const rows = await sql`
      select i.*, p.id as project_id, p.org_id as project_org_id, p.draft_doc->>'name' as name, p.draft_doc->'chain' as chain, p.draft_doc->'testnetContracts' as contracts,
             p.draft_doc->>'website' as website, p.draft_doc->>'logo' as logo, p.draft_doc->>'whatItDoes' as what
      from launchpad.tester_invites i join launchpad.projects p on p.id = i.project_id where i.token = ${token}
    `;
    const r = rows[0] as (InviteRow & { project_id: string; project_org_id: string | null; name: string | null; chain: unknown; contracts: unknown; website: string | null; logo: string | null; what: string | null }) | undefined;
    if (!r) return null;
    const invite = mapInvite(r);
    return {
      invite,
      state: inviteState(invite),
      project: {
        id: r.project_id,
        name: r.name ?? "",
        orgId: r.project_org_id ?? null,
        doc: {
          chain: (r.chain as ProjectDoc["chain"]) ?? undefined,
          testnetContracts: (Array.isArray(r.contracts) ? r.contracts : undefined) as ProjectDoc["testnetContracts"],
          website: r.website ?? undefined,
          logo: r.logo ?? undefined,
          whatItDoes: r.what ?? "",
        },
      },
    };
  } catch (err) {
    console.error("[tester] public read failed", err);
    return null;
  }
}

/** One piece of feedback; counts a use. Refused when the invite is not open. */
export async function recordFeedback(token: string, input: { stepIndex: number; rating: number; note: string; wallet: string | null }): Promise<{ ok: true } | { ok: false; message: string }> {
  const sql = getDb();
  if (!sql) return { ok: false, message: "Not available." };
  try {
    const rows = await sql`select * from launchpad.tester_invites where token = ${token}`;
    const r = rows[0] as InviteRow | undefined;
    if (!r) return { ok: false, message: "This invite does not exist." };
    const invite = mapInvite(r);
    const state = inviteState(invite);
    if (state !== "open") return { ok: false, message: state === "full" ? "This invite has reached its limit." : "This invite is closed." };
    // The kit is a Studio+ feature of the project's team (M134); a lapsed team's links pause.
    const org = (await sql`select org_id from launchpad.projects where id = ${r.project_id}`)[0] as { org_id?: string | null } | undefined;
    if (!(await orgPlus(org?.org_id))) return { ok: false, message: BUILD_COPY.tester.page.closed.lapsed };
    if (input.stepIndex >= invite.steps.length) return { ok: false, message: "No such step." };
    await sql`
      insert into launchpad.tester_feedback (invite_token, project_id, wallet, step_index, rating, note)
      values (${token}, ${r.project_id}, ${input.wallet}, ${input.stepIndex}, ${input.rating}, ${input.note})
    `;
    await sql`update launchpad.tester_invites set uses = uses + 1 where token = ${token}`;
    return { ok: true };
  } catch (err) {
    console.error("[tester] feedback failed", err);
    return { ok: false, message: "Could not record the feedback." };
  }
}
