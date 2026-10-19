"use client";

import Link from "next/link";

import { usePlan } from "@/components/studio/PlanContext";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { PlusFeature } from "@/lib/plan-shared";
import { cn } from "@/lib/utils";

/**
 * The teaser a free account sees in place of a Studio+ surface (M106): a
 * flat card with the Studio+ pill, the feature's title and teaser, and the
 * upgrade link. Renders its children instead when the session has the
 * feature, so a tab can wrap a section in one line.
 */
export function PlusGate({
  feature,
  className,
  children,
}: {
  feature: PlusFeature;
  className?: string;
  /** The real surface, shown when the plan allows it. */
  children?: React.ReactNode;
}) {
  const plan = usePlan();
  if (plan.plan === "studio_plus" && plan.hasFeature(feature)) return <>{children}</>;
  const F = STUDIO_PLUS_COPY.features[feature];
  return (
    <Card className={cn("max-w-2xl", className)}>
      <CardSection className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone="info">{STUDIO_PLUS_COPY.pill}</StatusChip>
          <span className="text-xs text-ink-500">{STUDIO_PLUS_COPY.gate.title}</span>
        </div>
        <h3 className="font-display text-base font-semibold text-ink-50">{F.title}</h3>
        <p className="text-sm leading-relaxed text-ink-300">{F.teaser}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm">
            <Link href={STUDIO_PLUS_COPY.path}>{STUDIO_PLUS_COPY.upgrade}</Link>
          </Button>
          {plan.loaded ? <span className="text-xs text-ink-500">{STUDIO_PLUS_COPY.gate.refresh}</span> : null}
        </div>
      </CardSection>
    </Card>
  );
}
