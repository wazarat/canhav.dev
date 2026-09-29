import { NextResponse } from "next/server";

import { checklistFor } from "@/content/kits/checklists";
import {
  type AgentChange,
  type BuildStepsPatch,
  type ChangeLine,
  buildStepLines,
  changeLines,
  isAgentWriteMode,
} from "@/lib/agent-writes";
import { agentStateOf, listAgentChanges, setAgentWriteMode } from "@/lib/agent-writes-db";
import { authGate } from "@/lib/ideation-api";
import { getLinkedTokenDesign, getProject } from "@/lib/ideation-db";
import { kitShapes } from "@/lib/kits";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The studio's view of agent writes on one project: the owner's mode, the
 * revision the drafts are at, and the changes with display lines worked out
 * against the current drafts.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  const project = await getProject((await params).id, gate.id);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const design = await getLinkedTokenDesign(project.id);
  const { mode, rev } = agentStateOf(project);
  const changes = await listAgentChanges(project.id, gate.id);
  const titles = new Map(
    checklistFor(kitShapes(project.draft_doc.kit)).map((i) => [i.id, i.title] as const),
  );

  const lines = (c: AgentChange): ChangeLine[] => {
    if (c.kind === "build_steps")
      return buildStepLines(c.patch as BuildStepsPatch).map((l) => ({
        ...l,
        path: titles.get(l.path) ?? l.path,
      }));
    const doc = c.target === "project" ? project.draft_doc : design?.draft_doc;
    // A resolved change is already in the draft, so there is no "before" left to show.
    return changeLines(c.status === "proposed" ? doc : undefined, c.patch);
  };

  return NextResponse.json({
    available: rev !== null,
    mode,
    rev,
    changes: changes.map((c) => ({ ...c, lines: lines(c) })),
  });
}

/** Set the owner's mode. */
export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  let mode: unknown;
  try {
    mode = (await req.json()).mode;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!isAgentWriteMode(mode))
    return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  const ok = await setAgentWriteMode((await params).id, gate.id, mode);
  if (!ok) return NextResponse.json({ error: "Could not save the setting." }, { status: 404 });
  return NextResponse.json({ ok: true, mode });
}
