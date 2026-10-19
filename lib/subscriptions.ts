import { PLAN_SLUG } from "@/lib/plan-shared";

/**
 * What a Clerk Billing webhook event means for the mirror (M108). Pure, so
 * the mapping can be checked without a signed request. Returns null when
 * the event is not about an organization's subscription.
 */
interface ItemLike {
  status?: string;
  period_end?: number | null;
  plan?: { slug?: string } | null;
  payer?: { organization_id?: string } | null;
  seats?: { total?: number; purchased?: number } | null;
}

interface SubscriptionLike {
  status?: string;
  payer?: { organization_id?: string } | null;
  items?: ItemLike[];
}

export interface MirrorInput {
  orgId: string;
  plan: string;
  status: string;
  seats: number | null;
  periodEnd: string | null;
}


function secondsToIso(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  // Clerk sends seconds for some timestamps and milliseconds for others; anything past 1e12 is milliseconds.
  return new Date(value > 1e12 ? value : value * 1000).toISOString();
}

function seatsOf(item: ItemLike | undefined): number | null {
  const s = item?.seats;
  if (!s) return null;
  return typeof s.total === "number" ? s.total : typeof s.purchased === "number" ? s.purchased : null;
}

export function mirrorFromBillingEvent(type: string, data: unknown): MirrorInput | null | "ignored" {
  if (type.startsWith("subscription.")) {
    const sub = data as SubscriptionLike;
    const orgId = sub.payer?.organization_id;
    if (!orgId) return null;
    // The item on our plan decides what the organization has; the subscription's status says whether it pays.
    const items = sub.items ?? [];
    const ours = items.find((i) => i.plan?.slug === PLAN_SLUG) ?? items.find((i) => i.status === "active") ?? items[0];
    return {
      orgId,
      plan: ours?.plan?.slug ?? "free",
      status: sub.status ?? ours?.status ?? "unknown",
      seats: seatsOf(ours),
      periodEnd: secondsToIso(ours?.period_end),
    };
  }
  if (type.startsWith("subscriptionItem.")) {
    const item = data as ItemLike;
    const orgId = item.payer?.organization_id;
    if (!orgId) return null;
    // Only our plan's items rewrite the row. The free default item ends
    // when a team upgrades, and that ending event used to overwrite the
    // paid row (seen on production 2026-10-19), so other plans are ignored
    // whatever their state; a cancelled paid plan arrives as its own
    // item's ended event and as subscription.updated.
    const slug = item.plan?.slug ?? "free";
    if (slug !== PLAN_SLUG) return "ignored";
    return {
      orgId,
      plan: slug,
      status: item.status ?? "unknown",
      seats: seatsOf(item),
      periodEnd: secondsToIso(item.period_end),
    };
  }
  return "ignored";
}
