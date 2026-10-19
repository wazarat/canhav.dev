import { NextResponse } from "next/server";

import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { KEY_LIMITS, countActiveKeys, createKey, listKeys } from "@/lib/project-keys";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** The project's keys, fingerprints only (M111). */
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await plusGate("project_keys");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ keys: await listKeys(id) });
}

/** Make a key. The body carries { name, scope }; the answer carries the key once. */
export async function POST(req: Request, { params }: Ctx) {
  const gate = await plusGate("project_keys");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: { name?: unknown; scope?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < KEY_LIMITS.name.min || name.length > KEY_LIMITS.name.max)
    return NextResponse.json({ error: `A key name is ${KEY_LIMITS.name.min} to ${KEY_LIMITS.name.max} characters.` }, { status: 400 });
  if (body.scope !== "read" && body.scope !== "write")
    return NextResponse.json({ error: "Scope is read or write." }, { status: 400 });
  if ((await countActiveKeys(id)) >= KEY_LIMITS.perProject)
    return NextResponse.json({ error: `Up to ${KEY_LIMITS.perProject} active keys per project. Revoke one first.` }, { status: 409 });
  const made = await createKey(id, gate.id, name, body.scope);
  if (!made) return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  return NextResponse.json({ key: made.key, row: made.row }, { status: 201 });
}
