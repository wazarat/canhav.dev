import { NextResponse } from "next/server";

import { feedbackInputSchema } from "@/lib/tester";
import { recordFeedback } from "@/lib/tester-db";

export const runtime = "nodejs";

/**
 * Feedback from a tester (M125). Public, outside the Clerk matcher; the
 * invite token is the only credential, and the invite's cap and expiry
 * bound what one link can record. A filled honeypot answers ok and
 * records nothing.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = feedbackInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the form." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true });
  const result = await recordFeedback(token, { stepIndex: parsed.data.stepIndex, rating: parsed.data.rating, note: parsed.data.note, wallet: parsed.data.wallet ? parsed.data.wallet.toLowerCase() : null });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
