import { NextResponse } from "next/server";
import type { Hex } from "viem";

import { type AttachProof, verifyAttachProof } from "@/lib/attach-proof";
import { authGate } from "@/lib/ideation-api";
import { attachDeploy, getSnapshot, getTokenDesign } from "@/lib/ideation-db";
import { getToken } from "@/lib/indexer";
import { publicClient } from "@/lib/publicClient";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Deploys older than this need a wallet signature to attach. A fresh
 *  auto-attach is already backed by the deploy tx signed seconds earlier. */
const FRESH_DEPLOY_WINDOW_S = 900;

/**
 * Attach a deployed contract to its design record. Trust comes from the
 * hash, not the session: the indexed token's journeyHash must be one of this
 * record's published snapshots, and the recorded deployer is the indexed
 * creator — never a client-supplied value. Stale/manual attaches must also
 * prove control of the deployer wallet with a signature (lib/attach-proof).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  let tokenAddress: string;
  let proof: AttachProof | null = null;
  try {
    const body = await req.json();
    tokenAddress = String(body.tokenAddress ?? "").toLowerCase();
    if (body.signature && body.signedAt !== undefined)
      proof = { signature: String(body.signature) as Hex, signedAt: Number(body.signedAt) };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!/^0x[0-9a-f]{40}$/.test(tokenAddress))
    return NextResponse.json({ error: "Invalid token address." }, { status: 400 });

  const row = await getTokenDesign(id, gate.id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (row.deployed_token_address)
    return NextResponse.json({ error: "A deploy is already attached." }, { status: 409 });

  // The indexer may lag the receipt by a block or two — retry once.
  let token = await getToken(tokenAddress);
  if (!token) {
    await sleep(3000);
    token = await getToken(tokenAddress);
  }
  if (!token)
    return NextResponse.json(
      { error: "Token not indexed yet — try again shortly." },
      { status: 409 },
    );

  const snapshot = await getSnapshot(token.journeyHash);
  if (!snapshot || snapshot.entity_type !== "token_design" || snapshot.entity_id !== id)
    return NextResponse.json(
      { error: "The deployed token does not commit to this design." },
      { status: 409 },
    );

  // Freshness rule: within the window, the deploy tx itself is the proof of
  // wallet control. Past it, the deployer wallet must sign the attach.
  const deployAgeS = Math.floor(Date.now() / 1000) - Number(token.blockTimestamp);
  if (deployAgeS > FRESH_DEPLOY_WINDOW_S) {
    if (!proof)
      return NextResponse.json(
        {
          error:
            "This deploy is not fresh — attaching requires a signature from the wallet that deployed it.",
        },
        { status: 403 },
      );
    const problem = await verifyAttachProof(publicClient, {
      tokenAddress,
      designId: id,
      expectedSigner: token.creator,
      proof,
    });
    if (problem) return NextResponse.json({ error: problem }, { status: 403 });
  }

  const ok = await attachDeploy(id, gate.id, tokenAddress, token.creator, token.journeyHash);
  if (!ok) return NextResponse.json({ error: "Attach failed." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
