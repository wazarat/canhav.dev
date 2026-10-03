import { NextResponse } from "next/server";

import { authGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { DEFAULT_PROJECT_CHAIN, type ProjectChain, projectChainOf } from "@/lib/chains";
import { findTokenRead } from "@/lib/indexer";
import { chainMismatch, createProjectForToken } from "@/lib/launch-project";
import { launchFromReceipt } from "@/lib/launch-receipt";
import { getLaunchByToken, recordLaunch } from "@/lib/launches-db";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Link a freshly launched token to the signed-in account. Trust comes from
 * the chain, not the request body: the launch is read from its transaction
 * receipt, or from the indexer when no transaction is named, and the recorded
 * creator is the TokenLaunched creator. A launch older than the freshness
 * window is refused so an account cannot claim someone else's old token by
 * address. Past the window the creator wallet claims it instead (M57).
 */
const FRESH_LAUNCH_WINDOW_S = 900;

export async function POST(req: Request) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;

  let tokenAddress: string;
  let txHash: string | null = null;
  let projectId: string | null = null;
  // "Start a project for this token" on the launch form (M56). Only the
  // description comes from the client, the name and chain come from the indexer.
  let createFor: { description: string } | null = null;
  try {
    const body = await req.json();
    tokenAddress = String(body.tokenAddress ?? "").toLowerCase();
    if (typeof body.txHash === "string" && /^0x[0-9a-fA-F]{64}$/.test(body.txHash))
      txHash = body.txHash.toLowerCase();
    if (typeof body.projectId === "string" && /^[0-9a-f-]{36}$/.test(body.projectId))
      projectId = body.projectId;
    if (!projectId && body.createProject && typeof body.createProject === "object")
      createFor = {
        description:
          typeof body.createProject.description === "string" ? body.createProject.description : "",
      };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!/^0x[0-9a-f]{40}$/.test(tokenAddress))
    return NextResponse.json({ error: "Invalid token address." }, { status: 400 });

  // A launch may only be attached to a project the same account owns.
  const project = projectId ? await getProject(projectId, gate.id) : null;
  if (projectId && !project)
    return NextResponse.json({ error: "That project is not yours." }, { status: 403 });

  // The receipt is enough to prove the launch, so the link does not wait for
  // the indexer. The chain comes from where the launch was found and never
  // from the request (M54).
  const receipt = txHash ? await launchFromReceipt(txHash) : null;
  if (receipt && receipt.address !== tokenAddress)
    return NextResponse.json({ error: "That transaction launched a different token." }, { status: 400 });

  let token: { creator: string; name: string; blockTimestamp: string; chain?: ProjectChain } | null = receipt;
  if (!token) {
    // No usable receipt. The indexer may lag by a block or two, so retry once.
    let read = await findTokenRead(tokenAddress);
    if (read.status !== "ok") {
      await sleep(3000);
      read = await findTokenRead(tokenAddress);
    }
    if (read.status !== "ok")
      return NextResponse.json(
        {
          error:
            read.status === "unavailable"
              ? "The indexer is not answering. Try again shortly."
              : "Token not indexed yet. Try again shortly.",
          code: "not_indexed",
        },
        { status: 409 },
      );
    token = read.value;
  }

  const ageS = Math.floor(Date.now() / 1000) - Number(token.blockTimestamp);
  if (ageS > FRESH_LAUNCH_WINDOW_S)
    return NextResponse.json(
      {
        error:
          "This launch is older than 15 minutes. Open its token page and claim it with the wallet you launched from.",
        code: "stale",
      },
      { status: 403 },
    );

  // A token launches on the chain its project builds on (M54).
  if (project && token.chain && projectChainOf(project.draft_doc) !== token.chain)
    return NextResponse.json(
      { error: chainMismatch(projectChainOf(project.draft_doc), token.chain), code: "chain_mismatch" },
      { status: 409 },
    );

  let linked = project ? { id: project.id, name: project.draft_doc.name } : null;
  if (createFor) {
    // A retry must not start a second project for the same token.
    const existing = await getLaunchByToken(tokenAddress);
    if (existing && existing.owner_id !== gate.id)
      return NextResponse.json({ error: "Already recorded.", code: "exists" }, { status: 409 });
    const row = existing?.project_id
      ? await getProject(existing.project_id, gate.id)
      : await createProjectForToken(gate.id, {
          name: token.name,
          description: createFor.description,
          chain: token.chain ?? DEFAULT_PROJECT_CHAIN,
        });
    if (row) {
      projectId = row.id;
      linked = { id: row.id, name: row.draft_doc.name };
    }
  }

  const result = await recordLaunch({
    tokenAddress,
    ownerId: gate.id,
    creatorAddress: token.creator,
    txHash,
    projectId,
    chain: token.chain,
  });
  if (result === null)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  if (result === "exists")
    return NextResponse.json({ error: "Already recorded.", code: "exists" }, { status: 409 });
  return NextResponse.json({ ok: true, project: linked }, { status: 201 });
}
