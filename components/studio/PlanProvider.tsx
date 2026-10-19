import { ClerkPlanProvider, StaticPlanProvider } from "@/components/studio/PlanContext";
import { isAuthConfigured } from "@/lib/auth";
import { devForced } from "@/lib/plan";

/**
 * Mounts the plan context site wide (M106), under the Clerk provider so the
 * nav can read the plan word everywhere. Without Clerk keys, or with the
 * dev override on, the plan is fixed for the build.
 */
export function PlanProvider({ children }: { children: React.ReactNode }) {
  if (devForced() || !isAuthConfigured()) return <StaticPlanProvider forced={devForced()}>{children}</StaticPlanProvider>;
  return <ClerkPlanProvider>{children}</ClerkPlanProvider>;
}
