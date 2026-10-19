import "server-only";

import { NextResponse } from "next/server";

import { type SessionUser, getSessionUser, isAuthConfigured } from "@/lib/auth";
import { projectChainOf } from "@/lib/chains";
import type { ProjectDoc } from "@/lib/ideation";
import { projectDocFromCreate } from "@/lib/project-create";
import { BUILD_COPY } from "@/content/build";
import { STUDIO_COPY } from "@/content/ideation";
import { PRIVATE_FREE_ALLOWANCE } from "@/lib/plan-shared";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { type PlusFeature, PlusRequired, getPlan, requirePlus } from "@/lib/plan";
import { CHAIN_LOCKED, projectChainLocked } from "@/lib/launch-project";
import {
  emptyProjectDoc,
  emptyTokenDesignDoc,
  type IdeationDoc,
} from "@/lib/ideation";
import {
  createProject,
  createProjectTokenLink,
  createTokenDesign,
  deleteProjectDraft,
  deleteTokenDesignDraft,
  getMyProjects,
  getMyTokenDesigns,
  getProject,
  getTokenDesign,
  publishEntity,
  unpublishEntity,
  updateProjectDraft,
  updateTokenDesignDraft,
} from "@/lib/ideation-db";

/**
 * Shared handler factory for the two symmetric ideation entities. Every
 * handler authenticates first (503 when auth is unconfigured, 401 when not
 * signed in) and scopes every query to the session user.
 */

const MAX_DOC_BYTES = 200_000;
/** A create body is a handful of short fields; anything bigger is not from the studio. */
const MAX_CREATE_BYTES = 20_000;
const STALE_DRAFT = "This draft changed outside this editor. Reload to see the latest.";

/**
 * authGate plus the Studio+ check (M106). Answers 403 with code plus_required
 * and the upgrade path, which the studio turns into the PlusGate card.
 */
export async function plusGate(feature?: PlusFeature): Promise<SessionUser | NextResponse> {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  try {
    await requirePlus(feature);
  } catch (err) {
    if (err instanceof PlusRequired)
      return NextResponse.json(
        { error: STUDIO_PLUS_COPY.gate.api, code: "plus_required", feature: err.feature, upgrade: STUDIO_PLUS_COPY.path },
        { status: 403 },
      );
    throw err;
  }
  return gate;
}

/**
 * The team a new record belongs to (M107): the session's active organization
 * when it is on Studio+, else none. Personal records stay personal.
 */
export async function teamFor(user: SessionUser): Promise<string | null> {
  const orgId = user.owner.orgIds[0];
  if (!orgId) return null;
  return (await getPlan()).plan === "studio_plus" ? orgId : null;
}

export async function authGate(): Promise<SessionUser | NextResponse> {
  if (!isAuthConfigured())
    return NextResponse.json({ error: "Auth not configured." }, { status: 503 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return user;
}

const db503 = () => NextResponse.json({ error: "Storage not configured." }, { status: 503 });
const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

export function makeEntityHandlers(kind: "project" | "token_design") {
  const table = kind === "project" ? ("projects" as const) : ("token_designs" as const);

  return {
    /**
     * POST /api/ideation/<entity> — create a draft. A token design takes a
     * name. A project takes the new project flow's fields (M91) and, with
     * withTokenDesign, also starts a linked token design named after it.
     */
    async create(req: Request) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      let body: unknown = {};
      try {
        const raw = await req.text();
        if (raw.length > MAX_CREATE_BYTES)
          return NextResponse.json({ error: "Request too large." }, { status: 413 });
        if (raw.trim()) body = JSON.parse(raw);
      } catch {
        // empty or invalid body is fine, a blank draft is the answer
      }
      if (kind === "token_design") {
        const name =
          body && typeof body === "object" && typeof (body as { name?: unknown }).name === "string"
            ? (body as { name: string }).name.slice(0, 60)
            : "";
        const row = await createTokenDesign(gate.id, emptyTokenDesignDoc(name), await teamFor(gate));
        if (!row) return db503();
        return NextResponse.json({ id: row.id });
      }
      const { doc, withTokenDesign } = projectDocFromCreate(body);
      const org = await teamFor(gate);
      const row = await createProject(gate.id, doc, org);
      if (!row) return db503();
      if (!withTokenDesign) return NextResponse.json({ id: row.id });
      // The design is optional. If it cannot be made or linked, the project
      // still answers and the wizard says the design was skipped.
      const design = await createTokenDesign(gate.id, emptyTokenDesignDoc(doc.name), org);
      if (!design) return NextResponse.json({ id: row.id, tokenDesignId: null });
      const linked = await createProjectTokenLink(row.id, design.id, gate.id);
      if (!linked.ok) {
        await deleteTokenDesignDraft(design.id, gate.owner);
        return NextResponse.json({ id: row.id, tokenDesignId: null });
      }
      return NextResponse.json({ id: row.id, tokenDesignId: design.id });
    },

    /** GET /api/ideation/<entity> — list the caller's records. */
    async list() {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const rows =
        kind === "project" ? await getMyProjects(gate.owner) : await getMyTokenDesigns(gate.owner);
      if (rows === null) return db503();
      return NextResponse.json({ rows });
    },

    /** GET /api/ideation/<entity>/[id] */
    async get(id: string) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const row =
        kind === "project" ? await getProject(id, gate.owner) : await getTokenDesign(id, gate.owner);
      if (!row) return notFound();
      return NextResponse.json({ row });
    },

    /** PATCH /api/ideation/<entity>/[id] — autosave the draft doc. */
    async patch(req: Request, id: string) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const raw = await req.text();
      if (raw.length > MAX_DOC_BYTES)
        return NextResponse.json({ error: "Document too large." }, { status: 413 });
      let doc: IdeationDoc;
      let rev: number | undefined;
      try {
        const body = JSON.parse(raw);
        doc = body.doc;
        if (Number.isInteger(body.rev) && body.rev >= 0) rev = body.rev;
      } catch {
        return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
      }
      // Drafts save loosely — full validation runs at publish. Only the
      // envelope is checked so a stray payload can't change the doc type.
      if (!doc || doc.kind !== kind || doc.version !== 1)
        return NextResponse.json({ error: "Wrong document type." }, { status: 400 });
      // A project's chain is fixed once a token has launched from it (M52).
      if (kind === "project") {
        const held = await getProject(id, gate.owner);
        if (held && projectChainOf(held.draft_doc) !== projectChainOf(doc as ProjectDoc) && (await projectChainLocked(id)))
          return NextResponse.json({ error: CHAIN_LOCKED }, { status: 409 });
      }
      const result =
        kind === "project"
          ? await updateProjectDraft(id, gate.owner, doc as never, rev)
          : await updateTokenDesignDraft(id, gate.owner, doc as never, rev);
      if (result === "missing") return notFound();
      // An agent write landed after this editor loaded. Refuse, so the
      // editor's older copy does not overwrite it.
      if (result === "stale")
        return NextResponse.json({ error: STALE_DRAFT, stale: true }, { status: 409 });
      return NextResponse.json({ ok: true });
    },

    /** DELETE /api/ideation/<entity>/[id] — drafts only, never a launched record (M75). */
    async remove(id: string) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const launched =
        kind === "project"
          ? await projectChainLocked(id)
          : Boolean((await getTokenDesign(id, gate.owner))?.deployed_token_address);
      if (launched)
        return NextResponse.json({ error: STUDIO_COPY.delete.launched }, { status: 409 });
      const ok =
        kind === "project"
          ? await deleteProjectDraft(id, gate.owner)
          : await deleteTokenDesignDraft(id, gate.owner);
      if (!ok)
        return NextResponse.json(
          { error: "Not found, or already published (unpublish first)." },
          { status: 404 },
        );
      return NextResponse.json({ ok: true });
    },

    /** POST /api/ideation/<entity>/[id]/publish, with `{ visibility }` for a project (M109). */
    async publish(id: string, req?: Request) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      let visibility: "public" | "private" | undefined;
      if (req) {
        try {
          const raw = await req.text();
          const body = raw.trim() ? (JSON.parse(raw) as { visibility?: unknown }) : {};
          if (body.visibility === "public" || body.visibility === "private") visibility = body.visibility;
        } catch {
          // no body is fine, the row's visibility stands
        }
      }
      // Free accounts keep one private project; Studio+ has no cap (M109).
      const plan = await getPlan();
      const result = await publishEntity(table, id, gate.owner, {
        visibility,
        privateCap: plan.plan === "studio_plus" ? null : PRIVATE_FREE_ALLOWANCE,
        privateCapMessage: BUILD_COPY.publish.visibility.capReached,
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    },

    /** DELETE /api/ideation/<entity>/[id]/publish — unpublish. */
    async unpublish(id: string) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const ok = await unpublishEntity(table, id, gate.owner);
      if (!ok) return notFound();
      return NextResponse.json({ ok: true });
    },
  };
}
