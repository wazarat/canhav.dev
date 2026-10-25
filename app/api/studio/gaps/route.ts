import { NextResponse } from "next/server";

import { DEFAULT_PROJECT_CHAIN, isProjectChain } from "@/lib/chains";
import { gapMap } from "@/lib/gaps";
import { plusGate } from "@/lib/ideation-api";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The gap map for the wizard (M164, M165), a Studio+ session, any chain. */
export async function GET(req: Request) {
  const gate = await plusGate("viability");
  if (gate instanceof NextResponse) return gate;
  const asked = new URL(req.url).searchParams.get("chain");
  const chain = isProjectChain(asked) ? asked : DEFAULT_PROJECT_CHAIN;
  return NextResponse.json({ map: await gapMap(chain) });
}
