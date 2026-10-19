/**
 * The plan an account is on (M106). Pure, shared by the server helper
 * (lib/plan.ts), the client context (components/studio/PlanContext.tsx)
 * and the copy. The three tiers are the free Studio, Studio+ (a Clerk
 * organization plan with seats) and Studio Pro (the services offer behind
 * a contact form). Only the first two are plans the code reads.
 */

/** The Clerk plan slug, the one the dashboard's organization plan carries. */
export const PLAN_SLUG = "studio_plus";

/**
 * The Studio+ features, each a Clerk feature slug attached to the plan.
 * Detaching one in the dashboard switches that feature off for every
 * account without a deploy.
 */
export const PLUS_FEATURES = [
  "bmc",
  "icp",
  "competitors",
  "brand",
  "private_projects",
  "project_keys",
  "github_sync",
  "checks",
  "monitoring",
  "analytics",
  "investor_pack",
  "weekly_update",
  "tester_kit",
  "custom_domain",
  "version_history",
] as const;

export type PlusFeature = (typeof PLUS_FEATURES)[number];

export function isPlusFeature(value: unknown): value is PlusFeature {
  return typeof value === "string" && (PLUS_FEATURES as readonly string[]).includes(value);
}

export type StudioPlan = "studio" | "studio_plus";

export interface PlanInfo {
  plan: StudioPlan;
  /** The active Clerk organization, the payer of a Studio+ plan. Null on a personal session. */
  orgId: string | null;
  /** True when the dev override made the answer, never on production. */
  forced: boolean;
}

export const FREE_PLAN: PlanInfo = { plan: "studio", orgId: null, forced: false };

/** The `has` shape Clerk gives on the server auth object and the client useAuth hook. */
export type PlanCheck = (params: { plan: string } | { feature: string }) => boolean;

/** A feature's claim as Clerk scopes it, the organization owns Studio+ features. */
export function featureClaim(feature: PlusFeature): `org:${string}` {
  return `org:${feature}`;
}

export const PLAN_CLAIM = `org:${PLAN_SLUG}` as const;

/**
 * Read the plan from a Clerk `has` helper. The session token carries the
 * active organization's plan, so a signed in member of a Studio+ team reads
 * studio_plus while that team is active, and studio on their personal
 * session.
 */
export function planFromHas(has: PlanCheck | null | undefined, orgId: string | null | undefined): PlanInfo {
  const plus = Boolean(orgId) && typeof has === "function" && safeHas(has, { plan: PLAN_CLAIM });
  return { plan: plus ? "studio_plus" : "studio", orgId: orgId ?? null, forced: false };
}

export function featureFromHas(has: PlanCheck | null | undefined, feature: PlusFeature): boolean {
  return typeof has === "function" && safeHas(has, { feature: featureClaim(feature) });
}

function safeHas(has: PlanCheck, params: { plan: string } | { feature: string }): boolean {
  try {
    return has(params) === true;
  } catch {
    return false;
  }
}
