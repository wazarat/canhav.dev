"use client";

import { usePlan } from "@/components/studio/PlanContext";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";

/**
 * The plan word, Studio or Studio+, for a kicker or a title (M106). A
 * client leaf so server rendered studio pages stay as they are and still
 * read Studio+ for an account on the plan.
 */
export function PlanWord() {
  const { plan } = usePlan();
  return <>{STUDIO_PLUS_COPY.planName(plan)}</>;
}
