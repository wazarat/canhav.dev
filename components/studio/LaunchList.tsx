import Link from "next/link";

import { StatusChip } from "@/components/ui/StatusChip";
import { hasCommitment } from "@/lib/journey";
import type { MyLaunch } from "@/lib/my-launches";

/**
 * The signed-in account's launches, one row per token, each linking to the
 * token page. Data comes from lib/my-launches.ts, the same set the MCP
 * get_my_launches tool returns.
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

export function LaunchList({ launches }: { launches: MyLaunch[] | null }) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink-50">Launches</h2>
        <Link
          href="/launch"
          className="text-xs text-electric-300 transition-colors hover:text-electric-200"
        >
          Launch a token →
        </Link>
      </div>

      {launches === null ? (
        <div className="mt-3 max-w-md">
          <StatusChip tone="warning" variant="block">
            Storage is not configured, so launches can&apos;t be loaded right now.
          </StatusChip>
        </div>
      ) : launches.length === 0 ? (
        <p className="mt-3 text-sm text-ink-400">
          No launches yet. Launch a token while signed in and it appears here and in
          get_my_launches.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {launches.map((l) => {
            const name = l.launch?.name ?? l.design?.name ?? shortAddress(l.address);
            const symbol = l.launch?.symbol ?? null;
            const when = launchedOn(l.launchedAt);
            const committed = l.launch ? hasCommitment(l.launch.journeyHash) : true;
            return (
              <li key={l.address}>
                <Link
                  href={`/launch/t/${l.address}`}
                  className="glass flex items-center justify-between gap-3 rounded-xl border border-ink-800/70 px-4 py-3 transition-colors hover:border-electric-500/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-50">
                      {name}
                      {symbol ? (
                        <span className="ml-2 font-mono text-xs text-electric-300">${symbol}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-ink-500">
                      {when ? `Launched ${when} · ` : ""}
                      {shortAddress(l.address)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
