import "server-only";

import { getDb } from "@/lib/db";

/**
 * The subscription mirror (M108): what Clerk Billing last reported for an
 * organization. Written by the webhook route, read by the plan helpers so
 * an MCP call, which has no session token, knows the plan.
 */
export interface SubscriptionRow {
  org_id: string;
  plan: string;
  status: string;
  seats: number | null;
  period_end: string | Date | null;
  raw: unknown;
  updated_at: string | Date;
}

export async function upsertSubscription(input: {
  orgId: string;
  plan: string;
  status: string;
  seats: number | null;
  periodEnd: string | null;
  raw: unknown;
}): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    await sql`
      insert into launchpad.subscriptions (org_id, plan, status, seats, period_end, raw, updated_at)
      values (${input.orgId}, ${input.plan}, ${input.status}, ${input.seats}, ${input.periodEnd}, ${JSON.stringify(input.raw)}, now())
      on conflict (org_id) do update
        set plan = excluded.plan, status = excluded.status, seats = excluded.seats,
            period_end = excluded.period_end, raw = excluded.raw, updated_at = now()
    `;
    return true;
  } catch (err) {
    console.error("[subscriptions] upsert failed", err);
    return false;
  }
}

export async function getSubscription(orgId: string): Promise<SubscriptionRow | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`select * from launchpad.subscriptions where org_id = ${orgId}`;
    return (rows[0] as SubscriptionRow | undefined) ?? null;
  } catch {
    return null;
  }
}

/** The mirror rows for several organizations in one read. */
export async function getSubscriptions(orgIds: string[]): Promise<SubscriptionRow[]> {
  const sql = getDb();
  if (!sql || orgIds.length === 0) return [];
  try {
    const rows = await sql`select * from launchpad.subscriptions where org_id = any(${orgIds})`;
    return rows as SubscriptionRow[];
  } catch {
    return [];
  }
}

/** Whether a mirror row still grants the plan: active, or past due inside its paid period. */
export function subscriptionGrants(row: SubscriptionRow | null | undefined, plan: string): boolean {
  if (!row || row.plan !== plan) return false;
  if (row.status === "active") return true;
  if (row.status === "past_due" && row.period_end) return new Date(row.period_end).getTime() > Date.now();
  return false;
}
