import { NextResponse } from "next/server";

import { agentStateOf, writeProjectDraftAsAgent } from "@/lib/agent-writes-db";
import { submitAgentChange } from "@/lib/agent-writes-server";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { getLinkedTokenDesign, getProject } from "@/lib/ideation-db";
import { planForOrgs } from "@/lib/plan";
import { isProjectKey, verifyKey } from "@/lib/project-keys";
import { SYNC_LIMITS, githubSyncSchema, mergedContracts, stepsPatch, syncNote } from "@/lib/sync/github";
import { ownerOf } from "@/lib/owner";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";

export const runtime = "nodejs";

/**
 * GitHub sync (M120). The Action posts with a write project key. Contracts
 * on the project's chain merge into Deployments and named build steps are
 * ticked with the commit as evidence, both through the agent write path,
 * so propose mode files proposals. The last sync is noted on the draft.
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
  if (raw.length > SYNC_LIMITS.bytes) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  let parsed;
  try {
    parsed = githubSyncSchema.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  const payload = parsed.data;

  const project = await getProject(key.projectId, key.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const chain = projectChainOf(project.draft_doc);
  const wrongChain = payload.broadcasts.filter((b) => b.chainId !== chainInfo(chain).chainId);
  if (wrongChain.length && wrongChain.length === payload.broadcasts.length && payload.steps.length === 0)
    return NextResponse.json({ error: `This project builds on ${chainInfo(chain).name} (chain ${chainInfo(chain).chainId}); the broadcasts are for another chain.`, code: "chain_mismatch" }, { status: 409 });

  const design = await getLinkedTokenDesign(project.id);
  const owner = ownerOf(project);
  const note = syncNote(payload);
  const results: string[] = [];
  let outcome: "applied" | "proposed" | "nothing" = "nothing";
  const contracts = mergedContracts(project.draft_doc, payload, chain);
  if (contracts) {
    const r = await submitAgentChange(project, design, owner, { target: "project", kind: "fields", patch: { testnetContracts: contracts } }, note);
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 409 });
    outcome = r.outcome;
    results.push(`contracts ${r.outcome}`);
  }
  const steps = stepsPatch(payload);
  if (steps) {
    const fresh = (await getProject(key.projectId, key.owner)) ?? project;
    const r = await submitAgentChange(fresh, design, owner, { target: "project", kind: "build_steps", patch: { done: steps.done, undone: [], add: [], remove: [], restore: [], evidence: steps.evidence, notApplicable: [], applicable: [] } }, note);
    if (!r.ok) return NextResponse.json({ error: r.message, partial: results }, { status: 409 });
    outcome = outcome === "proposed" || r.outcome === "proposed" ? "proposed" : r.outcome;
    results.push(`steps ${r.outcome}`);
  }
  // The last sync, noted on the draft for Deployments; a retry on a crossed write.
  const sync = { sha: payload.commit.sha, url: payload.commit.url, at: new Date().toISOString(), contracts: contracts?.length ?? 0, steps: steps?.done.length ?? 0, outcome };
  for (let attempt = 0; attempt < 2; attempt++) {
    const latest = await getProject(key.projectId, key.owner);
    const rev = latest ? agentStateOf(latest).rev : null;
    if (!latest || rev === null) break;
    if (await writeProjectDraftAsAgent(latest.id, owner, { ...latest.draft_doc, githubSync: sync }, rev)) break;
  }
  return NextResponse.json({ ok: true, outcome, results, sync }, { status: 201 });
}
