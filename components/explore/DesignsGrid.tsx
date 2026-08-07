import Link from "next/link";

import { EmptyCard } from "@/components/explore/EmptyCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { getPublishedTokenDesigns } from "@/lib/ideation-db";
import { deriveTokenomics } from "@/lib/tokenDesign";

/** Published token designs — discoverable with or without a deployment. */
export async function DesignsGrid() {
  const designs = await getPublishedTokenDesigns();
  if (designs === null)
    return <EmptyCard>Design data is temporarily unavailable — try again shortly.</EmptyCard>;
  if (designs.length === 0) return <EmptyCard>No published token designs yet.</EmptyCard>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {designs.map((t) => {
        const d = deriveTokenomics(t.draft_doc);
        return (
          <Link
            key={t.id}
            href={`/t/${t.slug}`}
            className="card-surface card-lift block rounded-2xl border border-ink-700/70 p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-display text-base font-semibold text-ink-50">
                {t.draft_doc.name}
              </p>
              <span className="shrink-0 font-mono text-xs text-electric-300">
                ${t.draft_doc.ticker}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-ink-500">Float at launch</span>
              <span className="tabular text-ink-200">
                {d.floatAtLaunchPct % 1 === 0 ? d.floatAtLaunchPct : d.floatAtLaunchPct.toFixed(1)}
                %
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-500">Status</span>
              <span className="text-ink-200">
                {t.deployed_token_address ? "Deployed" : "Design only"}
              </span>
            </div>
            {d.warnings.length > 0 && (
              <div className="mt-3">
                <StatusChip tone="warning" className="px-2 py-0.5 text-[11px]">
                  {d.warnings.length} design warning{d.warnings.length > 1 ? "s" : ""}
                </StatusChip>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
