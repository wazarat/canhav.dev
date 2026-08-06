import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { LinkPanel } from "@/components/ideation/LinkPanel";
import { TokenDesignEditor } from "@/components/ideation/TokenDesignEditor";
import { getSessionUser } from "@/lib/auth";
import { getLinkedProject, getMyProjects, getTokenDesign } from "@/lib/ideation-db";

export const metadata: Metadata = {
  title: "Token design — Studio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TokenDesignEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/studio");

  const { id } = await params;
  const row = await getTokenDesign(id, user.id);
  if (!row) notFound();

  const [linked, myProjects] = await Promise.all([
    getLinkedProject(row.id),
    getMyProjects(user.id),
  ]);

  return (
    <TokenDesignEditor
      id={row.id}
      initialDoc={row.draft_doc}
      initialStatus={row.status}
      initialSlug={row.slug}
      deployedAddress={row.deployed_token_address}
      linkPanel={
        <LinkPanel
          selfType="token_design"
          selfId={row.id}
          linked={
            linked
              ? { id: linked.id, name: linked.draft_doc.name, status: linked.status, slug: linked.slug }
              : null
          }
          candidates={(myProjects ?? []).map((p) => ({ id: p.id, name: p.draft_doc.name }))}
        />
      }
    />
  );
}
