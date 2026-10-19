import { NextResponse } from "next/server";

import { refreshAllCategories } from "@/lib/competitors/landscape";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * The monthly competitor snapshot (M115), fired by Vercel cron on the
 * first of the month (vercel.json) with the CRON_SECRET bearer Vercel
 * sends. Every category of the mapping on both chains.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const result = await refreshAllCategories();
  if (result.unknown.length) console.warn("[competitors] categories DefiLlama no longer lists", result.unknown);
  return NextResponse.json({ ok: true, ...result });
}
