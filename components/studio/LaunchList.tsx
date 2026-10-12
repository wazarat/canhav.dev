import Link from "next/link";

import { LaunchRowActions, type LaunchLinkProject } from "@/components/studio/LaunchRowActions";
import { StatusChip } from "@/components/ui/StatusChip";
import { STUDIO_COPY } from "@/content/ideation";
import { hasCommitment } from "@/lib/journey";
import type { ProjectChain } from "@/lib/chains";
import type { MyLaunch } from "@/lib/my-launches";

/**
 * The signed-in account's launches, one row per token, each linking to the
 * token page. Data comes from lib/my-launches.ts, the same set the MCP
 * get_my_launches tool returns. Each row carries the agent prompt popup and
 * the project link controls (M56). Rows only since M75; the studio home
 * wraps the newest few in a summary and /studio/launches lists them all.
 */

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function launchedOn(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const SOURCE_LABEL: Record<MyLaunch["source"], string> = {
  launch: "Launched here",
  design: "From design",
  both: "Launched from design",
};

export function LaunchList({
  launches,
  projects = [],
  limit,
}: {
  launches: MyLaunch[] | null;
  /** The account's projects, to link a launch to one on the same chain. */
  projects?: Array<LaunchLinkProject & { chain: ProjectChain }>;
  /** Newest rows only, when set. */
  limit?: number;
}) {
  if (launches === null) {
    return (
      <div className="max-w-md">
        <StatusChip tone="warning" variant="block">
          Storage is not configured, so launches can&apos;t be loaded right now.
        </StatusChip>
      </div>
    );
  }
  if (launches.length === 0) {
    return <p className="text-sm text-ink-400">{STUDIO_COPY.launches.none}</p>;
  }
  const rows = limit ? launches.slice(0, limit) : launches;
  return (
    <ul className="space-y-2">
      {rows.map((l) => {
        const name = l.launch?.name ?? l.design?.name ?? shortAddress(l.address);
        const symbol = l.launch?.symbol ?? null;
        const when = launchedOn(l.launchedAt);
        const committed = l.launch ? hasCommitment(l.launch.journeyHash) : true;
        return (
          <li
            key={l.address}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-700/60 bg-ink-900 px-4 py-3"
          >
            <Link href={`/launch/t/${l.address}`} className="group min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-50 transition-colors group-hover:text-electric-300">
                {name}
                {symbol ? (
                  <span className="ml-2 font-mono text-xs text-electric-300">${symbol}</span>
                ) : null}
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-ink-500">
                {when ? `Launched ${when} · ` : ""}
                {shortAddress(l.address)}
              </p>
              {l.project ? (
                <p className="mt-0.5 truncate text-[11px] text-ink-500">
                  {STUDIO_COPY.launch.fromProject}{" "}
                  <span className="text-ink-300">{l.project.name}</span>
                  {l.project.shapeLabels.length
                    ? ` · ${l.project.shapeLabels.join(" · ")}`
                    : l.project.sectorLabels.length
                      ? ` · ${l.project.sectorLabels.join(" · ")}`
                      : ""}
                </p>
              ) : null}
            </Link>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {!committed ? (
                <StatusChip tone="neutral" className="px-2 py-0.5 text-[11px]">
                  No commitment
                </StatusChip>
              ) : null}
              <StatusChip
                tone={l.source === "launch" ? "success" : "info"}
                className="px-2 py-0.5 text-[11px]"
              >
                {SOURCE_LABEL[l.source]}
              </StatusChip>
            </div>
            <LaunchRowActions
              address={l.address}
              name={l.launch?.name ?? l.design?.name}
              committed={committed}
              linkable={l.source !== "design"}
              // The row from the studio list, so the server alias matches the project page.
              project={projects.find((p) => p.id === l.project?.id) ?? null}
              candidates={projects.filter((p) => p.chain === l.chain)}
            />
          </li>
        );
      })}
    </ul>
  );
}
