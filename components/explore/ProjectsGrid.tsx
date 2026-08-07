import Link from "next/link";

import { EmptyCard } from "@/components/explore/EmptyCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { SECTOR_OPTIONS, STAGE_OPTIONS, optionLabel } from "@/content/ideation";
import { getPublishedProjects } from "@/lib/ideation-db";

/** Published project records — a product needs no token to be here. */
export async function ProjectsGrid() {
  const projects = await getPublishedProjects();
  if (projects === null)
    return <EmptyCard>Project data is temporarily unavailable — try again shortly.</EmptyCard>;
  if (projects.length === 0)
    return <EmptyCard>No published projects yet. A project needs no token to be here.</EmptyCard>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/p/${p.slug}`}
          className="card-surface card-lift block rounded-2xl border border-ink-700/70 p-5"
        >
          <p className="truncate font-display text-base font-semibold text-ink-50">
            {p.draft_doc.name}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-400">{p.draft_doc.whatItDoes}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <StatusChip tone="neutral" className="px-2 py-0.5 text-[11px]">
              {p.draft_doc.sector === "other" && p.draft_doc.sectorOther
                ? p.draft_doc.sectorOther
                : optionLabel(SECTOR_OPTIONS, p.draft_doc.sector)}
            </StatusChip>
            <StatusChip tone="info" className="px-2 py-0.5 text-[11px]">
              {optionLabel(STAGE_OPTIONS, p.draft_doc.stage)}
            </StatusChip>
          </div>
        </Link>
      ))}
    </div>
  );
}
