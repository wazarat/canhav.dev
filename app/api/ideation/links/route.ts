import { NextResponse } from "next/server";

import { authGate } from "@/lib/ideation-api";
import {
  createProjectTokenLink,
  deleteProjectTokenLink,
  getProject,
  getTokenDesign,
} from "@/lib/ideation-db";

export const runtime = "nodejs";

/**
 * Link/unlink a project and a token design. v1 requires the caller to own
 * both records (cross-owner linking would need a consent flow). The 1:1
 * cardinality is enforced by partial unique indexes — a second link attempt
 * fails at the database.
 */

async function parseAndAuthorize(req: Request) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  let projectId: string, tokenDesignId: string;
  try {
    const body = await req.json();
    projectId = String(body.projectId ?? "");
    tokenDesignId = String(body.tokenDesignId ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const [project, design] = await Promise.all([
    getProject(projectId, gate.id),
    getTokenDesign(tokenDesignId, gate.id),
  ]);
  if (!project || !design)
    return NextResponse.json(
      { error: "Both records must exist and belong to you." },
      { status: 404 },
    );
  return { user: gate, projectId, tokenDesignId };
}

export async function POST(req: Request) {
  const parsed = await parseAndAuthorize(req);
  if (parsed instanceof NextResponse) return parsed;
  const result = await createProjectTokenLink(parsed.projectId, parsed.tokenDesignId, parsed.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const parsed = await parseAndAuthorize(req);
  if (parsed instanceof NextResponse) return parsed;
  const ok = await deleteProjectTokenLink(parsed.projectId, parsed.tokenDesignId);
  if (!ok) return NextResponse.json({ error: "Not linked." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
