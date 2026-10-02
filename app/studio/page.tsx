import type { Metadata } from "next";
import Link from "next/link";

import { DeleteDraftButton } from "@/components/studio/DeleteDraftButton";
import { LaunchList } from "@/components/studio/LaunchList";
import { StudioTrackCards } from "@/components/studio/StudioTrackCards";
import { SignInCard } from "@/components/studio/SignInCard";
import { SignOutButton } from "@/components/studio/SignOutButton";
import { StatusChip } from "@/components/ui/StatusChip";
import { buildProgress } from "@/content/kits/checklists";
import { CHECKLIST_COPY } from "@/content/kits/copy";
import { tokenBuildProgressOf } from "@/content/token-steps";
import { type IndexedCurve, getCurvesAllChains } from "@/lib/indexer";
import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import {
  type EntityLinkSummary,
  type ProjectRow,
  type TokenDesignRow,
  getEntityLinks,
  getMyProjects,
  getMyTokenDesigns,
} from "@/lib/ideation-db";
import { getMyLaunches } from "@/lib/my-launches";
import { STUDIO_COPY } from "@/content/ideation";

// Intentionally unlinked from navigation while the ideation tracks are
// developed incrementally — URL-only, like /launch.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The link line under a row. A project shows the token design it is attached
 * to, a design shows its project, and either shows the deployed token once one
 * exists — that is what an agent pointed at the row can read.
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
interface TokenChipFacts {
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

function EntityList({
  title,
  rows,
  hrefBase,
  publicBase,
  empty,
  links,
  side,
  launched,
  token,
}: {
  title: string;
  rows: Array<ProjectRow | TokenDesignRow>;
  hrefBase: string;
  publicBase: string;
  empty: string;
  links: Map<string, EntityLinkSummary>;
  side: "project" | "design";
  /** Project id to the address of the newest token launched from it. */
  launched?: Map<string, string>;
  /** Launch facts for token design rows (M46). */
  token?: TokenChipFacts;
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
            return (
              <li
                key={row.id}
                className="glass flex items-center justify-between gap-3 rounded-xl border border-ink-800/70 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`${hrefBase}/${row.id}`}
                    className="block truncate text-sm font-medium text-ink-50 transition-colors hover:text-electric-200"
                  >
                    {row.draft_doc.name || "Untitled"}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Updated {new Date(row.updated_at).toLocaleDateString("en-US")}
                    {row.slug && row.status === "published" && (
                      <>
                        {" · "}
                        <Link
                          href={`${publicBase}/${row.slug}`}
                          className="text-electric-300 transition-colors hover:text-electric-200"
                        >
                          {publicBase}/{row.slug}
                        </Link>
                      </>
                    )}
                    {link && <LinkLine link={link} side={side} />}
                    {launched?.get(row.id) && (
                      <>
                        {" · "}
                        <Link
                          href={`/launch/t/${launched.get(row.id)}`}
                          className="text-electric-300 transition-colors hover:text-electric-200"
                        >
                          {STUDIO_COPY.launch.launched}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  {buildChip(row, token)}
                  <StatusChip tone={row.status === "published" ? "success" : "neutral"}>
                    {row.status === "published" ? "Published" : "Draft"}
                  </StatusChip>
                  {row.status === "draft" ? (
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

export default async function StudioPage() {
  const header = (
    <div className="max-w-2xl">
      <p className="kicker">{STUDIO_COPY.kicker}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
        {STUDIO_COPY.title}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-400">{STUDIO_COPY.subtitle}</p>
    </div>
  );

  if (!isAuthConfigured()) {
    return (
      <div className="container py-14 md:py-20">
        {header}
        <div className="mt-10 max-w-md">
          <StatusChip tone="warning" variant="block">
            Sign-in is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            and CLERK_SECRET_KEY, then reload.
          </StatusChip>
        </div>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="container py-14 md:py-20">
        {header}
        <div className="mt-10">
          <SignInCard />
        </div>
      </div>
    );
  }

  const [projects, designs, launches, links] = await Promise.all([
    getMyProjects(user.id),
    getMyTokenDesigns(user.id),
    getMyLaunches(user.id),
    getEntityLinks(user.id),
  ]);
  // Token build chips (M46). One curve read for every deployed design.
  const deployedAny = (designs ?? []).some((d) => d.deployed_token_address);
  const token: TokenChipFacts = {
    linkedDesignIds: new Set(links.byDesign.keys()),
    curves: deployedAny ? await getCurvesAllChains() : null,
    now: Math.floor(Date.now() / 1000),
  };
  // Newest first already, so the first hit per project wins.
  const launchedByProject = new Map<string, string>();
  for (const l of launches ?? []) {
    if (l.project && !launchedByProject.has(l.project.id)) launchedByProject.set(l.project.id, l.address);
  }

  return (
    <div className="container py-14 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {header}
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-500">{user.email}</span>
          <SignOutButton />
        </div>
      </div>

      {projects === null || designs === null ? (
        <div className="mt-10 max-w-md">
          <StatusChip tone="warning" variant="block">
            Storage is not configured, so drafts can&apos;t be loaded right now.
          </StatusChip>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <LaunchList launches={launches} />
          <StudioTrackCards />
          <div className="grid gap-10 md:grid-cols-2">
            <EntityList
              title="Token designs"
              rows={designs}
              hrefBase="/studio/token"
              publicBase="/t"
              token={token}
              empty="No token designs yet. A design is what you're issuing; product optional."
              links={links.byDesign}
              side="design"
            />
            <EntityList
              title="Projects"
              rows={projects}
              hrefBase="/studio/project"
              publicBase="/p"
              empty="No projects yet. A project is what you're building; token optional."
              links={links.byProject}
              side="project"
              launched={launchedByProject}
            />
          </div>
        </div>
      )}
    </div>
  );
}
