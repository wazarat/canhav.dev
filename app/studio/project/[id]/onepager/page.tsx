import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SimpleMarkdown } from "@/components/build/SimpleMarkdown";
import { PlusGate } from "@/components/studio/PlusGate";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { getSessionUser } from "@/lib/auth";
import { getProject } from "@/lib/ideation-db";
import { projectPlus } from "@/lib/plan-project";

export const dynamic = "force-dynamic";

// Print stylesheet, not UI copy. copy-ok
const PRINT_CSS = "@media print { header, footer, nav, .no-print { display: none !important; } body { background: white !important; color: black !important; } .print-page * { color: black !important; } }"; // copy-ok

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await getSessionUser();
  const row = user ? await getProject(id, user.owner) : null;
  return { title: row ? `${row.draft_doc.name} one pager` : "One pager", robots: { index: false, follow: false } };
}

/**
 * The one pager as a page to print to PDF (M126): the drafted markdown,
 * the name and the links, in the site's type, with a print stylesheet
 * that drops the chrome. Studio+, the project's team only.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/studio");
  const row = await getProject(id, user.owner);
  if (!row) notFound();
  // The pack is a Studio+ block of the project's team (M134).
  if (!(await projectPlus(row))) notFound();
  const C = STUDIO_PLUS_COPY.pack;
  const doc = row.draft_doc;
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 print:max-w-none print:px-0 print:py-0">
      <style>{PRINT_CSS}</style>
      <div className="no-print mb-6 flex flex-wrap items-center gap-3 text-xs text-ink-400">
        <Link href={`/studio/project/${id}?tab=publish`} className="text-ink-200 hover:underline">
          {C.backToPublish}
        </Link>
        <span>·</span>
        <span>{C.printHint}</span>
      </div>
      <PlusGate feature="investor_pack">
        <article className="print-page space-y-4">
          <h1 className="font-display text-2xl font-semibold text-ink-50">{doc.name}</h1>
          {doc.investorPack?.onepager ? <SimpleMarkdown text={doc.investorPack.onepager} /> : <p className="text-sm text-ink-400">{C.noOnepager}</p>}
          <p className="text-xs text-ink-500">
            {doc.website ? `${doc.website} · ` : ""}
            {doc.githubRepo ? `github.com/${doc.githubRepo} · ` : ""}
            {C.printFooter}
          </p>
        </article>
      </PlusGate>
    </main>
  );
}
