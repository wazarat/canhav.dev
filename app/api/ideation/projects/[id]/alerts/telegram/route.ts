import { NextResponse } from "next/server";

import { botLink, mintPairCode } from "@/lib/alerts/telegram";
import { plusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";

/** Connect Telegram (M128): a signed pairing code and the bot link that carries it. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await plusGate("monitoring");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const code = mintPairCode(id);
  if (!code) return NextResponse.json({ error: "Telegram is not configured on this deployment yet." }, { status: 503 });
  return NextResponse.json({ code, link: botLink(code) });
}
