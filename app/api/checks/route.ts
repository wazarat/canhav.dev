import { NextResponse } from "next/server";

import { recordCheckRun } from "@/lib/checks/db";
import { CHECK_LIMITS, checkRunSchema, parseSummary } from "@/lib/checks/schema";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { getProject } from "@/lib/ideation-db";
import { testnetContractRows } from "@/lib/ideation";
import { planForOrgs } from "@/lib/plan";
import { isProjectKey, verifyKey } from "@/lib/project-keys";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";

export const runtime = "nodejs";

/**
 * Check runs (M121). The checks workflow posts one run per tool with a
 * write project key. Static analysis summaries carry counts and findings;
 * a Sourcify run carries the verification per address and may only name
 * the project's recorded testnet contracts.
 */
export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const [type, token] = header.split(" ");
  if (type?.toLowerCase() !== "bearer" || !isProjectKey(token)) return NextResponse.json({ error: "A project key is required." }, { status: 401 });
  const key = await verifyKey(token);
  if (!key) return NextResponse.json({ error: "Unknown or revoked key." }, { status: 401 });
  if (key.scope !== "write") return NextResponse.json({ error: STUDIO_PLUS_COPY.keys.readOnly }, { status: 403 });
  const plan = await planForOrgs(key.owner.orgIds);
  if (plan.plan !== "studio_plus") return NextResponse.json({ error: STUDIO_PLUS_COPY.gate.api, code: "plus_required" }, { status: 403 });
  const raw = await req.text();
  if (raw.length > CHECK_LIMITS.bytes) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  let parsed;
  try {
    parsed = checkRunSchema.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  const run = parsed.data;
  const summary = parseSummary(run.tool, run.summary);
  if (!summary) return NextResponse.json({ error: `The summary does not fit the ${run.tool} shape.` }, { status: 400 });
  const project = await getProject(key.projectId, key.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (run.tool === "sourcify") {
    const chain = projectChainOf(project.draft_doc);
    if ((summary.chainId as number) !== chainInfo(chain).chainId)
      return NextResponse.json({ error: `This project builds on ${chainInfo(chain).name} (chain ${chainInfo(chain).chainId}).`, code: "chain_mismatch" }, { status: 409 });
    const known = new Set(testnetContractRows(project.draft_doc).map((r) => r.address));
    const unknown = Object.keys(summary.verified as Record<string, string>).filter((a) => !known.has(a));
    if (unknown.length) return NextResponse.json({ error: `Addresses not on this project's Deployments, ${unknown.slice(0, 3).join(", ")}. Record them first (GitHub sync does).` }, { status: 409 });
    if (Object.keys(summary.verified as Record<string, string>).length > CHECK_LIMITS.addresses) return NextResponse.json({ error: "Too many addresses." }, { status: 413 });
  }
  const id = await recordCheckRun({ projectId: project.id, tool: run.tool, commitSha: run.commitSha ?? null, runUrl: run.runUrl ?? null, result: run.result, summary });
  if (!id) return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
