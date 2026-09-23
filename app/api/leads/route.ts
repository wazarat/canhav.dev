import { NextResponse } from "next/server";
import { z } from "zod";

import { createClerkClient } from "@clerk/nextjs/server";

import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Lead capture for the marketing forms (For Teams contact modal, waitlist).
 * Public route — the Clerk middleware matcher does not cover /api/leads.
 *
 * Every accepted lead is written to launchpad.leads (system of record) and
 * emailed to LEADS_NOTIFY_EMAIL via Resend (best-effort). The request only
 * fails when BOTH channels fail, so a lead is never silently dropped while
 * one of them is down. A filled honeypot returns success and does nothing.
 *
 * Waitlist leads are also mirrored into Clerk's waitlist (access mode
 * "Waitlist" in the Clerk dashboard) so the owner can approve with one click;
 * Clerk then emails the invitation. Best effort, never blocks the response.
 */

const LeadSchema = z
  .object({
    kind: z.enum(["contact", "waitlist"]).default("contact"),
    fullName: z.string().trim().min(1).max(120).optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .pipe(z.email({ message: "Please enter a valid email address." })),
    leadType: z.enum(["individual", "team"]).optional(),
    comments: z.string().trim().max(2000).default(""),
    sourcePage: z.string().trim().max(64).default("unknown"),
    website: z.string().max(500).default(""), // honeypot — humans never see it
  })
  .refine((d) => Boolean(d.fullName && d.leadType), {
    message: "Name and lead type are required.",
  });

type Lead = z.infer<typeof LeadSchema>;

const RETRY_MESSAGE = "Could not record your message. Please try again.";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const message = field ? `${String(field)}: ${issue.message}` : (issue?.message ?? "Invalid payload.");
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const lead = parsed.data;

  // Bots fill the hidden field; pretend it worked and drop the payload.
  if (lead.website) return NextResponse.json({ ok: true });

  const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;

  const stored = await storeLead(lead, userAgent);
  const emailed = await sendLeadEmail(lead);

  if (!stored && !emailed) {
    return NextResponse.json({ error: RETRY_MESSAGE }, { status: 503 });
  }
  if (lead.kind === "waitlist") await mirrorToClerkWaitlist(lead.email);
  return NextResponse.json({ ok: true });
}

/**
 * Add the email to Clerk's waitlist so approval is one click in the Clerk
 * dashboard. Clerk returns the existing entry for a repeat email and, with
 * notify, sends the applicant a "you are on the waitlist" confirmation.
 */
async function mirrorToClerkWaitlist(emailAddress: string): Promise<void> {
  if (!isAuthConfigured()) return;
  try {
    // Standalone backend client: this route is outside the Clerk middleware,
    // so it must not depend on request-scoped auth state.
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    await client.waitlistEntries.create({ emailAddress, notify: true });
  } catch (err) {
    console.error("[leads] clerk waitlist failed", err);
  }
}

async function storeLead(lead: Lead, userAgent: string | null): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await db`
      insert into launchpad.leads
        (kind, full_name, email, lead_type, comments, source_page, user_agent)
      values (
        ${lead.kind},
        ${lead.fullName ?? null},
        ${lead.email},
        ${lead.leadType ?? null},
        ${lead.comments || null},
        ${lead.sourcePage},
        ${userAgent}
      )
    `;
    return true;
  } catch (err) {
    console.error("[leads] db insert failed", err);
    return false;
  }
}

/** Plain HTTP call — one POST does not justify the resend SDK dependency. */
async function sendLeadEmail(lead: Lead): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_NOTIFY_EMAIL;
  if (!apiKey || !to) return false;

  const from = process.env.LEADS_FROM_EMAIL || "CanHav Leads <onboarding@resend.dev>";
  const who = lead.fullName ?? lead.email;
  const subject =
    lead.kind === "waitlist"
      ? `New waitlist signup from ${who}`
      : `New ${lead.leadType} lead: ${who}`;

  const lines = [
    `Kind: ${lead.kind}`,
    `Name: ${lead.fullName ?? "—"}`,
    `Email: ${lead.email}`,
    `Individual or team: ${lead.leadType ?? "—"}`,
    `Source page: ${lead.sourcePage}`,
    `Received: ${new Date().toISOString()}`,
    "",
    "Comments:",
    lead.comments || "(none)",
  ];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: lead.email,
        subject,
        text: lines.join("\n"),
      }),
    });
    if (!res.ok) {
      console.error("[leads] resend rejected email", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[leads] resend request failed", err);
    return false;
  }
}
