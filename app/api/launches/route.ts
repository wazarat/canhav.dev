import { NextResponse } from "next/server";

import { authGate } from "@/lib/ideation-api";
import { getToken } from "@/lib/indexer";
import { recordLaunch } from "@/lib/launches-db";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Link a freshly launched token to the signed-in account. Trust comes from
 * the chain, not the request body: the token must already be indexed, and
 * the recorded creator is the indexed TokenLaunched creator. The client only
 * names the address. A launch older than the freshness window is refused so
 * an account cannot claim someone else's old token by address.
 */
const FRESH_LAUNCH_WINDOW_S = 900;

export async function POST(req: Request) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;

  let tokenAddress: string;
  let txHash: string | null = null;
  try {
    const body = await req.json();
    tokenAddress = String(body.tokenAddress ?? "").toLowerCase();
    if (typeof body.txHash === "string" && /^0x[0-9a-fA-F]{64}$/.test(body.txHash))
      txHash = body.txHash.toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!/^0x[0-9a-f]{40}$/.test(tokenAddress))
    return NextResponse.json({ error: "Invalid token address." }, { status: 400 });

  // The indexer may lag the receipt by a block or two. Retry once.
  let token = await getToken(tokenAddress);
  if (!token) {
    await sleep(3000);
    token = await getToken(tokenAddress);
  }
  if (!token)
    return NextResponse.json({ error: "Token not indexed yet. Try again shortly." }, { status: 409 });

  const ageS = Math.floor(Date.now() / 1000) - Number(token.blockTimestamp);
  if (ageS > FRESH_LAUNCH_WINDOW_S)
    return NextResponse.json(
      { error: "This launch is not fresh. Only a launch made moments ago can be linked." },
      { status: 403 },
    );

  const result = await recordLaunch({
    tokenAddress,
    ownerId: gate.id,
    creatorAddress: token.creator,
    txHash,
  });
  if (result === null)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  if (result === "exists")
    return NextResponse.json({ error: "Already recorded." }, { status: 409 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
