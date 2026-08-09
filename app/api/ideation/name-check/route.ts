import { NextResponse } from "next/server";

import { authGate } from "@/lib/ideation-api";
import { findPublishedDesignsByNameOrTicker } from "@/lib/ideation-db";
import { findTokensByNameOrSymbol } from "@/lib/indexer";

export const runtime = "nodejs";

/**
 * GET /api/ideation/name-check?name=…&ticker=…&exclude=<designId>
 *
 * Identity check for the token design form: exact matches against deployed
 * factory tokens (Robinhood Chain, via the indexer) and published CanHav
 * designs. Informational only; duplicates are legal and nothing here gates
 * publish. Results are worded "not found", never "available".
 */
export async function GET(req: Request) {
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "").slice(0, 60);
  const ticker = (url.searchParams.get("ticker") ?? "").slice(0, 10).toUpperCase();
  const exclude = url.searchParams.get("exclude") ?? undefined;

  const [chain, canhav] = await Promise.all([
    findTokensByNameOrSymbol(name, ticker),
    findPublishedDesignsByNameOrTicker(name, ticker, exclude),
  ]);

  const seen = new Set<string>();
  const chainMatches = (chain ? [...chain.bySymbol, ...chain.byName] : []).filter((t) => {
    if (seen.has(t.address)) return false;
    seen.add(t.address);
    return true;
  });

  return NextResponse.json({
    indexerOk: chain !== null,
    chainMatches,
    canhavMatches: canhav ?? [],
  });
}
