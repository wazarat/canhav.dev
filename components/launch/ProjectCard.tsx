import Link from "next/link";
import { Layers } from "lucide-react";

import { StatusChip } from "@/components/ui/StatusChip";
import type { ProjectContext } from "@/lib/ideation";

/**
 * The studio project a token was launched from. Sectors, subsectors and
 * shapes are always shown; the name and a link only when the project is
 * published (public page) or the viewer owns it (studio page).
 */
export function ProjectCard({ project, isOwner }: { project: ProjectContext; isOwner: boolean }) {
  const published = project.status === "published" && Boolean(project.slug);
  const href = published ? `/p/${project.slug}` : isOwner ? `/studio/project/${project.id}` : null;
  const showName = published || isOwner;
  const labels = [...project.sectorLabels, ...project.subsectorLabels, ...project.shapeLabels];
  return (
    <div className="card-surface mt-8 rounded-2xl border border-ink-700/70 p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink-50">
        <Layers className="h-4 w-4 text-electric-300" /> Project
      </h2>
      {showName ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-100">
          {href ? (
            <Link href={href} className="text-electric-300 transition-colors hover:text-electric-200">
              {project.name}
            </Link>
          ) : (
            project.name
          )}
          {!published ? <StatusChip tone="neutral">Draft</StatusChip> : null}
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-300">Launched from a studio project.</p>
      )}
      {labels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {labels.map((label) => (
            <StatusChip key={label} tone="neutral">
              {label}
            </StatusChip>
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-xs text-ink-500">
        Recorded when the token was launched from the studio. The sectors and shapes come from
        the project record, not from the chain.
      </p>
    </div>
  );
}
