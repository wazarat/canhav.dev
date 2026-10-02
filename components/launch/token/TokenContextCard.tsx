import Link from "next/link";
import { Layers } from "lucide-react";

import { StatusChip } from "@/components/ui/StatusChip";
import { LAUNCH_PARAMS, TOKEN_PAGE_COPY } from "@/content/launch";
import type { ProjectContext } from "@/lib/ideation";

/**
 * What stands behind a token (M58). The project it is linked to, the
 * commitment it made on chain, and the fees its contracts actually charge.
 * There is no creator fee and no holder fee sharing on these contracts, and
 * the card says so rather than leaving the question open.
 */
export function TokenContextCard({
  project,
  commitment,
  curveLaunch,
  poolFeeBps,
}: {
  /** The linked studio project. The name and link show only when it is published. */
  project: ProjectContext | null;
  commitment: { committed: boolean; milestoneCount: number | null };
  curveLaunch: boolean;
  /** The pool's protocol fee, when a pool exists. */
  poolFeeBps: number | null;
}) {
  const C = TOKEN_PAGE_COPY.context;
  const published = project?.status === "published" && Boolean(project.slug);
  const labels = project
    ? [...project.sectorLabels, ...project.subsectorLabels, ...project.shapeLabels]
    : [];
  const fees = curveLaunch
    ? [
        [LAUNCH_PARAMS.labels.tradeFee, LAUNCH_PARAMS.tradeFee],
        [LAUNCH_PARAMS.labels.launchWindow, LAUNCH_PARAMS.launchWindow],
        [LAUNCH_PARAMS.labels.liquidity, LAUNCH_PARAMS.liquidity],
      ]
    : [
        [LAUNCH_PARAMS.labels.tradeFee, C.poolFee],
        ...(poolFeeBps ? [[C.protocolFee, C.protocolFeeValue((poolFeeBps / 100).toFixed(2))]] : []),
      ];

  return (
    <div className="card-surface mt-4 rounded-2xl border border-ink-700/70 p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink-50">
        <Layers className="h-4 w-4 text-electric-300" /> {C.title}
      </h2>
      <div className="mt-4 grid gap-6 md:grid-cols-3">
        <div>
          <p className="text-xs text-ink-500">{C.project}</p>
          {project ? (
            <>
              <p className="mt-1 text-sm text-ink-100">
                {published ? (
                  <Link
                    href={`/p/${project.slug}`}
                    className="text-electric-300 transition-colors hover:text-electric-200"
                  >
                    {project.name}
                  </Link>
                ) : (
                  C.projectDraft
                )}
              </p>
              {labels.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {labels.map((label) => (
                    <StatusChip key={label} tone="neutral" className="px-2 py-0.5 text-[11px]">
                      {label}
                    </StatusChip>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-400">{C.projectNone}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-ink-500">{C.commitment}</p>
          <p className="mt-1 text-sm text-ink-100">
            {!commitment.committed
              ? C.commitmentNone
              : commitment.milestoneCount
                ? C.commitmentMilestones(commitment.milestoneCount)
                : C.commitmentHash}
          </p>
          {commitment.committed ? (
            <a
              href={`#${TOKEN_PAGE_COPY.commitmentAnchor}`}
              className="mt-1 inline-block text-xs text-electric-300 transition-colors hover:text-electric-200"
            >
              {C.commitmentRead} →
            </a>
          ) : null}
        </div>
        <div>
          <p className="text-xs text-ink-500">{C.fees}</p>
          <dl className="mt-1 space-y-1">
            {fees.map(([term, detail]) => (
              <div key={term} className="flex gap-2 text-sm">
                <dt className="w-28 shrink-0 text-ink-500">{term}</dt>
                <dd className="text-ink-100">{detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-ink-500">{C.noFeeSharing}</p>
        </div>
      </div>
    </div>
  );
}
