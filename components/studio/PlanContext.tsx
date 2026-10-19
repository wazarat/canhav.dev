"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@clerk/nextjs";

import {
  FREE_PLAN,
  type PlanCheck,
  type PlanInfo,
  type PlusFeature,
  featureFromHas,
  planFromHas,
} from "@/lib/plan-shared";

export interface PlanState extends PlanInfo {
  /** False while Clerk is still loading the session. */
  loaded: boolean;
  hasFeature: (feature: PlusFeature) => boolean;
}

const FREE_STATE: PlanState = { ...FREE_PLAN, loaded: true, hasFeature: () => false };

const PlanContext = createContext<PlanState>(FREE_STATE);

/** The plan of the signed in session, from the context the root layout mounts (M106). */
export function usePlan(): PlanState {
  return useContext(PlanContext);
}

/** When Clerk is unconfigured, or the dev override is on, the plan is fixed for the build. */
export function StaticPlanProvider({ forced, children }: { forced: boolean; children: React.ReactNode }) {
  const value: PlanState = forced
    ? { plan: "studio_plus", orgId: null, forced: true, loaded: true, hasFeature: () => true }
    : FREE_STATE;
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

/** Reads the plan from the session claims; mounts only under a ClerkProvider. */
export function ClerkPlanProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, orgId, has } = useAuth();
  const check = has as unknown as PlanCheck | undefined;
  const info = isLoaded && isSignedIn ? planFromHas(check, orgId) : FREE_PLAN;
  const value: PlanState = {
    ...info,
    loaded: isLoaded,
    hasFeature: (feature) => info.plan === "studio_plus" && featureFromHas(check, feature),
  };
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
