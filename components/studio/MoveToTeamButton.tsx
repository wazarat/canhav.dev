"use client";

import { useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { Users } from "lucide-react";

import { usePlan } from "@/components/studio/PlanContext";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { STUDIO_COPY } from "@/content/ideation";

/**
 * Move a personal project to the active team (M107). Shown only to the
 * account that made the project, on a Studio+ session that has a team
 * active and while the project is still personal. A confirm line sits
 * where the button was; the page reloads once the move lands so the
 * breadcrumb and the record read as the team's.
 */
export function MoveToTeamButton({ projectId, name, orgId, creator }: {
  projectId: string;
  name: string;
  /** The project's team, null while personal. */
  orgId: string | null;
  /** True when the session's account made the project. */
  creator: boolean;
}) {
  const plan = usePlan();
  const { organization } = useOrganization();
  const [state, setState] = useState<"idle" | "confirm" | "busy" | "failed">("idle");
  if (plan.plan !== "studio_plus" || !plan.orgId || orgId || !creator) return null;
  const C = STUDIO_COPY.moveToTeam;
  const team = organization?.name ?? C.action;
  const move = async () => {
    setState("busy");
    const res = await fetch(`/api/ideation/projects/${projectId}/team`, { method: "POST" });
    if (!res.ok) {
      setState("failed");
      return;
    }
    window.location.reload();
  };
  if (state === "failed") return <StatusChip tone="error">{C.failed}</StatusChip>;
  if (state === "confirm" || state === "busy") {
    return (
      <span className="flex flex-wrap items-center gap-2 text-xs text-ink-300">
        <span className="max-w-md">{C.confirm(name || "Untitled", team)}</span>
        <Button size="sm" onClick={() => void move()} disabled={state === "busy"}>
          {state === "busy" ? C.busy : C.yes}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setState("idle")} disabled={state === "busy"}>
          {C.no}
        </Button>
      </span>
    );
  }
  return (
    <Button size="sm" variant="ghost" onClick={() => setState("confirm")}>
      <Users aria-hidden className="h-3.5 w-3.5" /> {C.action}
    </Button>
  );
}
