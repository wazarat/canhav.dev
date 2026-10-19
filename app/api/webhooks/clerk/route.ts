import { type NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { mirrorFromBillingEvent } from "@/lib/subscriptions";
import { upsertSubscription } from "@/lib/subscriptions-db";

export const runtime = "nodejs";

/**
 * Clerk Billing webhooks (M108). Every subscription and subscription item
 * event for an organization payer lands in the mirror; user payers and
 * payment attempts are acknowledged and ignored. The signature is checked
 * with CLERK_WEBHOOK_SIGNING_SECRET; the raw event is kept on the row so a
 * field this handler misread can be reconciled later.
 */
export async function POST(req: NextRequest) {
  let evt: { type: string; data: unknown };
  try {
    evt = (await verifyWebhook(req)) as { type: string; data: unknown };
  } catch (err) {
    console.warn("[webhooks] clerk signature failed", err);
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }
  try {
    const mirror = mirrorFromBillingEvent(evt.type, evt.data);
    if (mirror === "ignored") return NextResponse.json({ ok: true, ignored: evt.type });
    if (mirror === null) return NextResponse.json({ ok: true, ignored: "user payer" });
    const ok = await upsertSubscription({ ...mirror, raw: evt });
    if (!ok) return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhooks] clerk handler failed", err);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}
