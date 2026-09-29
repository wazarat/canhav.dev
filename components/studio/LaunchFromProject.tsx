import Link from "next/link";
import { Rocket } from "lucide-react";

import { CurveProgress } from "@/components/launch/CurveProgress";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { STUDIO_COPY } from "@/content/ideation";
import { getCurve } from "@/lib/indexer";
import { getLaunchesByProject } from "@/lib/launches-db";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * The launch card on a project's studio page. A button into /launch with the
 * project (and its published design, when linked) until a token has been
 * launched from it; then the token with its curve progress and a link to
 * launch another.
 */
export async function LaunchFromProject({
  projectId,
  designId,
}: {
  projectId: string;
  designId?: string | null;
}) {
  const launches = (await getLaunchesByProject(projectId)) ?? [];
  const latest = launches[0] ?? null;
  const curve = latest ? await getCurve(latest.token_address) : null;
  const href = `/launch?project=${projectId}${designId ? `&design=${designId}` : ""}`;
  const C = STUDIO_COPY.launch;
  return (
    <section className="glass mt-6 rounded-2xl p-5" aria-label={C.title}>
      <h3 className="font-display text-sm font-semibold text-ink-50">{C.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">{C.body}</p>
      {latest ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone="success">{C.launched}</StatusChip>
            <Link
              href={`/launch/t/${latest.token_address}`}
              className="font-mono text-xs text-electric-300 transition-colors hover:text-electric-200"
            >
              {shortAddress(latest.token_address)}
            </Link>
          </div>
          {curve ? (
            <CurveProgress
              raisedWei={curve.raisedWei}
              thresholdWei={curve.thresholdWei}
              graduated={curve.graduated}
            />
          ) : null}
          <Link
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-electric-300 transition-colors hover:text-electric-200"
          >
            {C.again} →
          </Link>
        </div>
      ) : (
        <div className="mt-3">
          {/* A new tab, so the project editor and its unsaved typing stay open. */}
          <Button asChild size="sm">
            <Link href={href} target="_blank" rel="noreferrer">
              <Rocket aria-hidden className="h-3.5 w-3.5" /> {C.cta}
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
