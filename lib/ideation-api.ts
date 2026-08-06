import "server-only";

import { NextResponse } from "next/server";

import { type SessionUser, getSessionUser, isAuthConfigured } from "@/lib/auth";
import {
  emptyProjectDoc,
  emptyTokenDesignDoc,
  type IdeationDoc,
} from "@/lib/ideation";
import {
  createProject,
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
    /** POST /api/ideation/<entity> — create a blank draft. */
    async create(req: Request) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      let name = "";
      try {
        const body = await req.json();
        if (typeof body?.name === "string") name = body.name.slice(0, 60);
      } catch {
        // empty body is fine
      }
      const row =
        kind === "project"
          ? await createProject(gate.id, emptyProjectDoc(name))
          : await createTokenDesign(gate.id, emptyTokenDesignDoc(name));
      if (!row) return db503();
      return NextResponse.json({ id: row.id });
    },

    /** GET /api/ideation/<entity> — list the caller's records. */
    async list() {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const rows =
        kind === "project" ? await getMyProjects(gate.id) : await getMyTokenDesigns(gate.id);
      if (rows === null) return db503();
      return NextResponse.json({ rows });
    },

    /** GET /api/ideation/<entity>/[id] */
    async get(id: string) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const row =
        kind === "project" ? await getProject(id, gate.id) : await getTokenDesign(id, gate.id);
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
      try {
        doc = JSON.parse(raw).doc;
      } catch {
        return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
      }
      // Drafts save loosely — full validation runs at publish. Only the
      // envelope is checked so a stray payload can't change the doc type.
      if (!doc || doc.kind !== kind || doc.version !== 1)
        return NextResponse.json({ error: "Wrong document type." }, { status: 400 });
      const ok =
        kind === "project"
          ? await updateProjectDraft(id, gate.id, doc as never)
          : await updateTokenDesignDraft(id, gate.id, doc as never);
      if (!ok) return notFound();
      return NextResponse.json({ ok: true });
    },

    /** DELETE /api/ideation/<entity>/[id] — drafts only. */
    async remove(id: string) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const ok =
        kind === "project"
          ? await deleteProjectDraft(id, gate.id)
          : await deleteTokenDesignDraft(id, gate.id);
      if (!ok)
        return NextResponse.json(
          { error: "Not found, or already published (unpublish first)." },
          { status: 404 },
        );
      return NextResponse.json({ ok: true });
    },

    /** POST /api/ideation/<entity>/[id]/publish */
    async publish(id: string) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const result = await publishEntity(table, id, gate.id);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result);
    },

    /** DELETE /api/ideation/<entity>/[id]/publish — unpublish. */
    async unpublish(id: string) {
      const gate = await authGate();
      if (gate instanceof NextResponse) return gate;
      const ok = await unpublishEntity(table, id, gate.id);
      if (!ok) return notFound();
      return NextResponse.json({ ok: true });
    },
  };
}
