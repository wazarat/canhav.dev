import { StatusChip } from "@/components/ui/StatusChip";
import { IDEATION_RESOURCES } from "@/content/ideation";
import type { DesignWarning } from "@/lib/tokenDesign";

/**
 * A resource that fires on a warning, not a completion: what looks wrong,
 * why it matters, and a worked example. Server-renderable.
 */
export function WarningResourceCard({ warning }: { warning: DesignWarning }) {
  const r = IDEATION_RESOURCES[warning];
  return (
    <StatusChip tone="warning" variant="block">
      <span className="block font-medium text-ink-100">{r.title}</span>
      <span className="mt-1 block">{r.body}</span>
      <span className="mt-2 block text-ink-400">{r.example}</span>
    </StatusChip>
  );
}
