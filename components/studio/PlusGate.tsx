"use client";

import Link from "next/link";

import { usePlan } from "@/components/studio/PlanContext";
import { useProjectPlan } from "@/components/studio/ProjectPlanContext";
import { MoveToTeamButton } from "@/components/studio/MoveToTeamButton";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { PlusFeature } from "@/lib/plan-shared";
import { cn } from "@/lib/utils";

/**
 * Whether a Studio+ surface opens here (M134): the session has the feature
 * and the project on the page belongs to a team on the plan. Off a project
 * page only the session counts. The reason says which card to show instead.
 */
export function usePlusHere(feature: PlusFeature): { ok: boolean; reason: "free" | "personal" | "lapsed" | null } {
  const plan = usePlan();
  const project = useProjectPlan();
  const session = plan.plan === "studio_plus" && plan.hasFeature(feature);
  if (!session) return { ok: false, reason: "free" };
  if (project.plus) return { ok: true, reason: null };
  return { ok: false, reason: project.orgId ? "lapsed" : "personal" };
}

/**
 * The teaser a free account sees in place of a Studio+ surface (M106): a
 * flat card with the Studio+ pill, the feature's title and teaser, and the
 * upgrade link. Renders its children instead when the session has the
 * feature and the project's team is on the plan (M134); a Studio+ account on
 * a personal project gets the move to team card, on a lapsed team the plan
 * sentence.
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
  const project = useProjectPlan();
  const here = usePlusHere(feature);
  if (here.ok) return <>{children}</>;
  const F = STUDIO_PLUS_COPY.features[feature];
  if (here.reason === "personal" || here.reason === "lapsed") {
    return (
      <Card className={cn("max-w-2xl", className)}>
        <CardSection className="space-y-3">
          <h3 className="font-display text-base font-semibold text-ink-50">{F.title}</h3>
          <p className="text-sm leading-relaxed text-ink-300">{here.reason === "personal" ? STUDIO_PLUS_COPY.gate.personal : STUDIO_PLUS_COPY.gate.lapsed}</p>
          <div className="flex flex-wrap items-center gap-3">
            {here.reason === "personal" ? (
              // The move button reads the Clerk organization, so it needs a real session, never the dev override.
              project.projectId && !plan.forced ? (
                <MoveToTeamButton projectId={project.projectId} name={project.name} orgId={project.orgId} creator={project.creator} />
              ) : null
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href={STUDIO_PLUS_COPY.path}>{STUDIO_PLUS_COPY.planName("studio_plus")}</Link>
              </Button>
            )}
          </div>
        </CardSection>
      </Card>
    );
  }
  return (
    <Card className={cn("max-w-2xl", className)}>
      <CardSection className="space-y-3">
        <p className="text-xs text-ink-400">
          <span className="font-medium text-ink-200">{STUDIO_PLUS_COPY.pill}</span> · {STUDIO_PLUS_COPY.gate.title}
        </p>
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
