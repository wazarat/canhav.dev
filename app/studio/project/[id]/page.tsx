import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { LinkPanel } from "@/components/ideation/LinkPanel";
import { ProjectEditor } from "@/components/ideation/ProjectEditor";
import { getSessionUser } from "@/lib/auth";
import { getLinkedTokenDesign, getMyTokenDesigns, getProject } from "@/lib/ideation-db";

export const metadata: Metadata = {
  title: "Project — Studio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/studio");

  const { id } = await params;
  const row = await getProject(id, user.id);
  if (!row) notFound();

  const [linked, myDesigns] = await Promise.all([
    getLinkedTokenDesign(row.id),
    getMyTokenDesigns(user.id),
  ]);

  return (
    <ProjectEditor
      id={row.id}
      initialDoc={row.draft_doc}
      initialStatus={row.status}
      initialSlug={row.slug}
      linkPanel={
        <LinkPanel
          selfType="project"
          selfId={row.id}
          linked={
            linked
              ? { id: linked.id, name: linked.draft_doc.name, status: linked.status, slug: linked.slug }
              : null
          }
          candidates={(myDesigns ?? []).map((d) => ({ id: d.id, name: d.draft_doc.name }))}
        />
      }
    />
  );
}
