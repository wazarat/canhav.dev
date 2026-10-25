import { NextResponse } from "next/server";

import { checklistFor } from "@/content/kits/checklists";
import { shapeLabel, shapeName } from "@/content/kits/copy";
import {
  type AgentChange,
  type BuildStepsPatch,
  type ChangeLine,
  buildStepDecisionLines,
  buildStepLines,
  buildStepsPatchSchema,
  changeLines,
  decisionLines,
  isAgentWriteMode,
  tokenStepTitles,
} from "@/lib/agent-writes";
import { agentStateOf, listAgentChanges, setAgentWriteMode } from "@/lib/agent-writes-db";
import { nextProjectDoc, nextTokenDesignDoc } from "@/lib/agent-writes-server";
import { latestAgentSession } from "@/lib/agent-sessions-db";
import { prospectsSummary } from "@/lib/prospects";
import { authGate } from "@/lib/ideation-api";
import { getLinkedTokenDesign, getProject } from "@/lib/ideation-db";
import { type ProductShape, type ShapeId, kitShapes } from "@/lib/kits";

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
  const project = await getProject((await params).id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const design = await getLinkedTokenDesign(project.id);
  const { mode, rev } = agentStateOf(project);
  const [changes, session] = await Promise.all([
    listAgentChanges(project.id, project.owner_id),
    latestAgentSession(project.id, project.owner_id),
  ]);
  // One title can sit under several shapes since M43, so the shape label follows it.
  const titles = new Map([
    ...checklistFor(kitShapes(project.draft_doc.kit)).map(
      (i) => [i.id, `${i.title} (${shapeLabel(i.id.slice(0, i.id.indexOf(".")) as ProductShape) ?? ""})`] as const,
    ),
    // Token build steps (M46) share the kind; their ids are disjoint by prefix.
    ...tokenStepTitles(),
    // Steps the team added (M50).
    ...(project.draft_doc.kit?.customSteps ?? []).map(
      (c) => [c.id, `${c.title} (${shapeName(project.draft_doc.kit, c.shape)})`] as const,
    ),
  ]);
  /** A readable label for one build step line. Ticks keep the title; adds, removals and restores say so (M50). */
  const stepLabel = (key: string, patch: BuildStepsPatch): string => {
    // Entry keys from buildStepKeys, code not copy.
    if (key.startsWith("add:")) { // copy-ok
      const a = patch.add?.[Number(key.slice(4))];
      return `New step (${[a?.shape, ...(a?.shapes ?? [])].filter((x): x is string => Boolean(x)).map((x) => shapeName(project.draft_doc.kit, x as ShapeId)).join(", ")})`;
    }
    if (key.startsWith("shapes:")) return `Shapes. ${titles.get(key.slice(7)) ?? key.slice(7)}`; // copy-ok
    if (key.startsWith("remove:")) return `Remove. ${titles.get(key.slice(7)) ?? key.slice(7)}`; // copy-ok
    if (key.startsWith("restore:")) return `Restore. ${titles.get(key.slice(8)) ?? key.slice(8)}`; // copy-ok
    if (key.startsWith("evidence:")) return `Evidence. ${titles.get(key.slice(9)) ?? key.slice(9)}`; // copy-ok
    if (key.startsWith("na:")) return `Not applicable. ${titles.get(key.slice(3)) ?? key.slice(3)}`; // copy-ok
    if (key.startsWith("applicable:")) return `Applies again. ${titles.get(key.slice(11)) ?? key.slice(11)}`; // copy-ok
    return titles.get(key) ?? key;
  };

  const lines = (c: AgentChange): ChangeLine[] => {
    const decided = c.status === "accepted" && c.appliedPatch !== null;
    if (c.kind === "build_steps") {
      const applied = decided ? buildStepsPatchSchema.safeParse(c.appliedPatch) : null;
      const raw = decided
        ? buildStepDecisionLines(c.patch as BuildStepsPatch, applied?.success ? (applied.data as BuildStepsPatch) : null)
        : buildStepLines(c.patch as BuildStepsPatch);
      return raw.map((l) => ({ ...l, path: stepLabel(l.path, c.patch as BuildStepsPatch) }));
    }
    // Prospects (M158) are rows in their own table, read as one block of people; accepted or rejected as a whole.
    if (c.kind === "prospects") return [{ path: "prospects", before: undefined as unknown as string, after: prospectsSummary(c.patch) }];
    // A decided change shows what the owner let through (M44).
    if (decided) return decisionLines(c.patch, c.appliedPatch);
    const doc = c.target === "project" ? project.draft_doc : design?.draft_doc;
    // A resolved change is already in the draft, so there is no "before" left to show.
    return changeLines(c.status === "proposed" ? doc : undefined, c.patch);
  };

  // A waiting proposal that fails on the stored draft but applies once the
  // ones before it are accepted depends on them (M81). The card says so.
  const dependsOnEarlier = new Set<string>();
  let p = project;
  let d = design;
  for (const c of changes.filter((x) => x.status === "proposed").reverse()) {
    if (c.target === "project") {
      const stored = nextProjectDoc(project, c.kind, c.patch);
      const projected = nextProjectDoc(p, c.kind, c.patch);
      if (!stored.ok && projected.ok) dependsOnEarlier.add(c.id);
      if (projected.ok) p = { ...p, draft_doc: projected.doc };
    } else if (d) {
      const stored = nextTokenDesignDoc(design!, c.kind, c.patch);
      const projected = nextTokenDesignDoc(d, c.kind, c.patch);
      if (!stored.ok && projected.ok) dependsOnEarlier.add(c.id);
      if (projected.ok) d = { ...d, draft_doc: projected.doc };
    }
  }

  return NextResponse.json({
    available: rev !== null,
    mode,
    rev,
    session,
    changes: changes.map((c) => ({
      ...c,
      lines: lines(c),
      ...(dependsOnEarlier.has(c.id) ? { dependsOnEarlier: true } : {}),
    })),
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
  const ok = await setAgentWriteMode((await params).id, gate.owner, mode);
  if (!ok) return NextResponse.json({ error: "Could not save the setting." }, { status: 404 });
  return NextResponse.json({ ok: true, mode });
}
