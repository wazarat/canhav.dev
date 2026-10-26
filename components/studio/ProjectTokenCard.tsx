import { InfoTip } from "@/components/ui/InfoTip";
import { LAUNCH_PROJECT_COPY } from "@/content/launch";
import { cn } from "@/lib/utils";

/**
 * The project page's one Token card (M189): the linked token design and
 * the launched token as two rows, in place of the separate Linked token
 * design and Token launch cards. The explainer sits behind the info icon.
 * Carries the anchor the header's Link a token button scrolls to.
 */
export function ProjectTokenCard({ design, launch, className }: { design: React.ReactNode; launch: React.ReactNode; className?: string }) {
  const C = LAUNCH_PROJECT_COPY.token;
  return (
    <div id={LAUNCH_PROJECT_COPY.panelAnchor} className={cn("scroll-mt-28 space-y-4", className)}>
      <h3 className="inline-flex items-center gap-1 text-sm font-medium text-ink-100">
        {C.title}
        <InfoTip title={C.title}>{C.info}</InfoTip>
      </h3>
      <Row label={C.design}>{design}</Row>
      <Row label={C.launch}>{launch}</Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start">
      <span className="pt-1.5 text-xs font-medium text-ink-300">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
