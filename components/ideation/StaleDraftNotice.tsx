"use client";

import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { AGENT_COPY } from "@/content/ideation";

/** Shown in an editor whose save was refused because the draft moved on. */
export function StaleDraftNotice() {
  return (
    <div className="mb-6 flex max-w-2xl flex-wrap items-center gap-3">
      <StatusChip tone="warning" variant="block">
        {AGENT_COPY.stale}
      </StatusChip>
      <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
        {AGENT_COPY.reload}
      </Button>
    </div>
  );
}
