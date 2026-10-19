import "server-only";

import { auth } from "@clerk/nextjs/server";

import { isAuthConfigured } from "@/lib/auth";
import {
  FREE_PLAN,
  type PlanCheck,
  type PlanInfo,
  type PlusFeature,
  featureFromHas,
  planFromHas,
} from "@/lib/plan-shared";

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
