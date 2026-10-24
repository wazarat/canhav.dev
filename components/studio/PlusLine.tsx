"use client";

import Link from "next/link";

import { usePlan } from "@/components/studio/PlanContext";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";

/** One sentence for a free account on the Overview (M136), the only mention of Studio+ in the editor. */
export function PlusLine() {
  const plan = usePlan();
  if (plan.plan === "studio_plus") return null;
  return (
    <p className="text-xs text-ink-500">
      {STUDIO_PLUS_COPY.oneLine}{" "}
      <Link href={STUDIO_PLUS_COPY.path} className="text-ink-300 underline-offset-2 hover:text-ink-100 hover:underline">
        {STUDIO_PLUS_COPY.oneLineLink}
      </Link>
    </p>
  );
}
