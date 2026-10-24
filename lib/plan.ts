import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

import { isAuthConfigured } from "@/lib/auth";
import {
  FREE_PLAN,
  PLAN_SLUG,
  type PlanCheck,
  type PlanInfo,
  type PlusFeature,
  featureFromHas,
  planFromHas,
} from "@/lib/plan-shared";
import { getSubscriptions, subscriptionGrants, upsertSubscription } from "@/lib/subscriptions-db";

export type { PlanInfo, PlusFeature, StudioPlan } from "@/lib/plan-shared";
export { PLAN_SLUG, PLUS_FEATURES } from "@/lib/plan-shared";

/**
 * The server side plan check (M106). `auth().has({ plan })` reads the
 * session token, so a subscription change shows after the token refreshes,
 * within a minute. Outside production, STUDIO_PLUS_DEV_FORCE=1 answers
 * studio_plus for every session so the paid surfaces can be built and
 * smoke tested without Clerk keys or a Stripe checkout.
 */
export function devForced(): boolean {
  return process.env.STUDIO_PLUS_DEV_FORCE === "1" && process.env.VERCEL_ENV !== "production";
}

const FORCED: PlanInfo = { plan: "studio_plus", orgId: null, forced: true };

/** The plan of the current session. Free when signed out or when Clerk is unconfigured. */
export async function getPlan(): Promise<PlanInfo> {
  if (devForced()) return FORCED;
  if (!isAuthConfigured()) return FREE_PLAN;
  try {
    const a = await auth();
    if (!a.userId) return FREE_PLAN;
    return planFromHas(a.has as unknown as PlanCheck, a.orgId);
  } catch {
    return FREE_PLAN;
  }
}

/** Whether the current session's team has one Studio+ feature. The dev override grants all. */
export async function hasPlusFeature(feature: PlusFeature): Promise<boolean> {
  if (devForced()) return true;
  if (!isAuthConfigured()) return false;
  try {
    const a = await auth();
    if (!a.userId || !a.orgId) return false;
    return featureFromHas(a.has as unknown as PlanCheck, feature);
  } catch {
    return false;
  }
}

/** Thrown by requirePlus; API routes turn it into the 403 the studio understands. */
export class PlusRequired extends Error {
  readonly feature: PlusFeature | null;
  constructor(feature?: PlusFeature) {
    super(feature ? `Studio+ feature ${feature} required.` : "Studio+ required.");
    this.name = "PlusRequired";
    this.feature = feature ?? null;
  }
}

/** The plan, or a PlusRequired error when the session is not on Studio+ (with the feature, when one is named). */
export async function requirePlus(feature?: PlusFeature): Promise<PlanInfo> {
  const info = await getPlan();
  if (info.plan !== "studio_plus") throw new PlusRequired(feature);
  if (feature && !(await hasPlusFeature(feature))) throw new PlusRequired(feature);
  return info;
}

/**
 * The plan behind a set of organizations without a session token (M108):
 * what an MCP call or a project key has. The subscription mirror answers
 * first; an organization with no row yet (a checkout the webhook has not
 * reported, or a webhook not configured) is asked of the Backend API once a
 * minute. Returns the first organization that grants the plan.
 */
const orgPlanCache = new Map<string, { at: number; plus: boolean }>();
const ORG_PLAN_TTL_MS = 60_000;

export async function planForOrgs(orgIds: string[]): Promise<PlanInfo> {
  if (devForced()) return FORCED;
  if (orgIds.length === 0) return FREE_PLAN;
  const rows = await getSubscriptions(orgIds);
  for (const orgId of orgIds) {
    const row = rows.find((r) => r.org_id === orgId);
    if (row && subscriptionGrants(row, PLAN_SLUG)) return { plan: "studio_plus", orgId, forced: false };
    // No row, or a row that does not grant: ask Clerk, cached a minute, so a
    // stale mirror never locks a paying team out of MCP and the API.
    if (await orgHasPlanFromClerk(orgId)) return { plan: "studio_plus", orgId, forced: false };
  }
  return FREE_PLAN;
}

async function orgHasPlanFromClerk(orgId: string): Promise<boolean> {
  if (!isAuthConfigured()) return false;
  const hit = orgPlanCache.get(orgId);
  if (hit && Date.now() - hit.at < ORG_PLAN_TTL_MS) return hit.plus;
  let plus = false;
  try {
    const client = await clerkClient();
    const sub = await client.billing.getOrganizationBillingSubscription(orgId);
    const item = sub.subscriptionItems.find(
      (i) => i.plan?.slug === PLAN_SLUG && (i.status === "active" || i.status === "past_due"),
    );
    plus = Boolean(item);
    // Write the answer through to the mirror (M134), so readers that cannot
    // ask Clerk (the alerts worker, the edge domain lookup) see the same plan.
    if (item) void upsertSubscription({ orgId, plan: PLAN_SLUG, status: item.status, seats: null, periodEnd: null, raw: { source: "clerk-fallback", at: new Date().toISOString() } });
  } catch (err) {
    console.warn("[plan] subscription lookup failed", err);
    plus = hit?.plus ?? false;
  }
  orgPlanCache.set(orgId, { at: Date.now(), plus });
  return plus;
}
