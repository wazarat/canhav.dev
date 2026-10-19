import Link from "next/link";

import { DeleteDraftButton } from "@/components/studio/DeleteDraftButton";
import { StatusChip } from "@/components/ui/StatusChip";
import { buildProgress } from "@/content/kits/checklists";
import { CHECKLIST_COPY } from "@/content/kits/copy";
import { BUILD_COPY } from "@/content/build";
import { STUDIO_COPY } from "@/content/ideation";
import { tokenBuildProgressOf } from "@/content/token-steps";
import type { ProjectAgentActivity } from "@/lib/agent-writes-db";
import { type AgentSession, sessionView } from "@/lib/agent-sessions";
import type { IndexedCurve } from "@/lib/indexer";
import type { EntityLinkSummary, ProjectRow, TokenDesignRow } from "@/lib/ideation-db";

/** A direct write older than this no longer earns a line on the row (M79). */
const WROTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * One studio list of projects or token designs (extracted in M75 so the
 * studio home and the launches page share it). A row reads Launched when
 * its token exists (success tone, links to the token page, no Delete),
 * Published, or Draft with the Delete control.
 */

/**
 * The link line under a row. A project shows the token design it is attached
 * to, a design shows its project, and either shows the deployed token once one
 * exists; that is what an agent pointed at the row can read.
 */
function LinkLine({ link, side }: { link: EntityLinkSummary; side: "project" | "design" }) {
  const other = side === "project" ? link.designName : link.projectName;
  const href =
    side === "project" ? `/studio/token/${link.designId}` : `/studio/project/${link.projectId}`;
  return (
    <span>
      {" · "}
      <Link href={href} className="text-electric-300 transition-colors hover:text-electric-200">
        {other}
      </Link>
      {link.deployedTokenAddress && (
        <>
          {" · "}
          <Link
            href={`/launch/t/${link.deployedTokenAddress}`}
            className="text-electric-300 transition-colors hover:text-electric-200"
          >
            Token deployed
          </Link>
        </>
      )}
    </span>
  );
}

/** What the studio knows about every design's launch, for the token build chips (M46). */
export interface TokenChipFacts {
  linkedDesignIds: Set<string>;
  curves: Map<string, IndexedCurve> | null;
  now: number;
}

/**
 * "Build 4 of 12" for a project with a product shape (shared steps count
 * once, M43) or for a token design (computed launch rows read from the
 * row and the curve, M46), nothing otherwise.
 */
function buildChip(row: ProjectRow | TokenDesignRow, token?: TokenChipFacts) {
  const doc = row.draft_doc;
  if (doc.kind === "token_design") {
    if (!token) return null;
    const address = (row as TokenDesignRow).deployed_token_address ?? null;
    const p = tokenBuildProgressOf(doc, {
      published: row.status === "published",
      linked: token.linkedDesignIds.has(row.id),
      deployedAddress: address,
      curve: address ? (token.curves?.get(address.toLowerCase()) ?? null) : null,
      now: token.now,
    });
    return (
      <StatusChip tone="info" className="hidden sm:inline-flex">
        {CHECKLIST_COPY.rowChip(p.done, p.total)}
      </StatusChip>
    );
  }
  if (!doc.kit?.shape) return null;
  const p = buildProgress(doc.kit);
  if (p.total === 0) return null;
  return (
    <StatusChip tone="info" className="hidden sm:inline-flex">
      {CHECKLIST_COPY.rowChip(p.done, p.total)}
    </StatusChip>
  );
}

export function EntityList({
  title,
  rows,
  hrefBase,
  publicBase,
  empty,
  links,
  side,
  launched,
  token,
  agent,
  sessions,
}: {
  title: string;
  rows: Array<ProjectRow | TokenDesignRow>;
  hrefBase: string;
  publicBase: string;
  empty: string;
  links: Map<string, EntityLinkSummary>;
  side: "project" | "design";
  /** Record id to the address of its launched token (lib/launch-status.ts). */
  launched?: Map<string, string>;
  /** Launch facts for token design rows (M46). */
  token?: TokenChipFacts;
  /** Agent proposals waiting and the newest direct write per project (M79). */
  agent?: Map<string, ProjectAgentActivity>;
  /** The newest agent session per project (M86). */
  sessions?: Map<string, AgentSession>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-ink-50">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-400">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const link = links.get(row.id);
            const tokenAddress = launched?.get(row.id) ?? null;
            const activity = agent?.get(row.id) ?? null;
            const session = sessions?.get(row.id) ?? null;
            const view = session ? sessionView(session) : null;
            const sessionChip =
              view === "working"
                ? { tone: "info" as const, text: STUDIO_COPY.agent.working }
                : view === "awaiting_input"
                  ? { tone: "warning" as const, text: STUDIO_COPY.agent.waiting }
                  : view === "error"
                    ? { tone: "error" as const, text: STUDIO_COPY.agent.failed }
                    : null;
            const wrote =
              activity?.lastWritten && Date.now() - new Date(activity.lastWritten).getTime() < WROTE_WINDOW_MS
                ? new Date(activity.lastWritten).toLocaleDateString("en-US")
                : null;
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-700/60 bg-ink-900 px-4 py-3"
              >
                {row.draft_doc.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.draft_doc.logo} alt="" className="h-8 w-8 shrink-0 rounded-md border border-ink-700/60 object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`${hrefBase}/${row.id}`}
                    className="block truncate text-sm font-medium text-ink-50 transition-colors hover:text-electric-300"
                  >
                    {row.draft_doc.name || "Untitled"}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Updated {new Date(row.updated_at).toLocaleDateString("en-US")}
                    {row.slug && row.status === "published" && (
                      <>
                        {" · "}
                        <Link
                          href={`${publicBase}/${row.slug}${"share_token" in row && row.visibility === "private" && row.share_token ? `?s=${row.share_token}` : ""}`}
                          className="text-electric-300 transition-colors hover:text-electric-200"
                        >
                          {publicBase}/{row.slug}
                        </Link>
                        {"visibility" in row && row.visibility === "private" ? <span className="text-ink-500"> · {BUILD_COPY.publish.visibility.private}</span> : null}
                      </>
                    )}
                    {link && <LinkLine link={link} side={side} />}
                    {tokenAddress && !link?.deployedTokenAddress && (
                      <>
                        {" · "}
                        <Link
                          href={`/launch/t/${tokenAddress}`}
                          className="text-electric-300 transition-colors hover:text-electric-200"
                        >
                          {STUDIO_COPY.launch.launched}
                        </Link>
                      </>
                    )}
                    {wrote ? ` · ${STUDIO_COPY.agent.wrote(wrote)}` : null}
                  </p>
                </div>
                <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
                  {sessionChip ? (
                    <Link href={`${hrefBase}/${row.id}#agent-changes`}>
                      <StatusChip tone={sessionChip.tone}>{sessionChip.text}</StatusChip>
                    </Link>
                  ) : null}
                  {activity?.proposed ? (
                    <Link href={`${hrefBase}/${row.id}#agent-changes`}>
                      <StatusChip tone="info">{STUDIO_COPY.agent.proposed(activity.proposed)}</StatusChip>
                    </Link>
                  ) : null}
                  {buildChip(row, token)}
                  {tokenAddress ? (
                    <StatusChip tone="success">{STUDIO_COPY.launches.launchedChip}</StatusChip>
                  ) : (
                    <StatusChip tone={row.status === "published" ? "success" : "neutral"}>
                      {row.status === "published" ? "Published" : "Draft"}
                    </StatusChip>
                  )}
                  {row.status === "draft" && !tokenAddress ? (
                    <DeleteDraftButton
                      entity={side === "project" ? "projects" : "token-designs"}
                      id={row.id}
                      name={row.draft_doc.name}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
