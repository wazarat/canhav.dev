import type { Metadata } from "next";
import Link from "next/link";

import { NewEntityButtons } from "@/components/studio/NewEntityButtons";
import { SignInCard } from "@/components/studio/SignInCard";
import { SignOutButton } from "@/components/studio/SignOutButton";
import { StatusChip } from "@/components/ui/StatusChip";
import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import {
  type ProjectRow,
  type TokenDesignRow,
  getMyProjects,
  getMyTokenDesigns,
} from "@/lib/ideation-db";
import { STUDIO_COPY } from "@/content/ideation";

// Intentionally unlinked from navigation while the ideation tracks are
// developed incrementally — URL-only, like /launch.
export const metadata: Metadata = {
  title: STUDIO_COPY.title,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function EntityList({
  title,
  rows,
  hrefBase,
  publicBase,
  empty,
}: {
  title: string;
  rows: Array<ProjectRow | TokenDesignRow>;
  hrefBase: string;
  publicBase: string;
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-ink-50">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-400">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
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
                </p>
              </div>
              <StatusChip tone={row.status === "published" ? "success" : "neutral"}>
                {row.status === "published" ? "Published" : "Draft"}
              </StatusChip>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const { auth_error } = await searchParams;

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
            Sign-in is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY, then reload.
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
        <div className="mt-10 space-y-4">
          {auth_error && (
            <div className="max-w-md">
              <StatusChip tone="error" variant="block">
                That sign-in link didn&apos;t work — it may have expired. Request a new one.
              </StatusChip>
            </div>
          )}
          <SignInCard />
        </div>
      </div>
    );
  }

  const [projects, designs] = await Promise.all([
    getMyProjects(user.id),
    getMyTokenDesigns(user.id),
  ]);

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
            Storage is not configured — drafts can&apos;t be loaded right now.
          </StatusChip>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <NewEntityButtons />
          <div className="grid gap-10 md:grid-cols-2">
            <EntityList
              title="Projects"
              rows={projects}
              hrefBase="/studio/project"
              publicBase="/p"
              empty="No projects yet. A project is what you're building — token optional."
            />
            <EntityList
              title="Token designs"
              rows={designs}
              hrefBase="/studio/token"
              publicBase="/t"
              empty="No token designs yet. A design is what you're issuing — product optional."
            />
          </div>
        </div>
      )}
    </div>
  );
}
