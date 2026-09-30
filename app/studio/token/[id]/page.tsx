import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { LinkPanel } from "@/components/ideation/LinkPanel";
import { TokenDesignEditor } from "@/components/ideation/TokenDesignEditor";
import { getSessionUser } from "@/lib/auth";
import { getLinkedProject, getMyProjects, getSnapshot, getTokenDesign } from "@/lib/ideation-db";
import { designMilestones } from "@/lib/launch-commitment";
import { getCurve } from "@/lib/indexer";
import { kitShapes } from "@/lib/kits";

export const metadata: Metadata = {
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

  const [linked, myProjects, curve, snapshot] = await Promise.all([
    getLinkedProject(row.id),
    getMyProjects(user.id),
    // The deployed token's curve feeds the computed build steps (M46).
    row.deployed_token_address ? getCurve(row.deployed_token_address) : null,
    // The published snapshot, for the milestone hint on Review (M48).
    row.published_hash ? getSnapshot(row.published_hash) : null,
  ]);
  const publishedMilestoneCount =
    snapshot && snapshot.doc.kind === "token_design" ? (designMilestones(snapshot.doc)?.length ?? 0) : null;

  return (
    <TokenDesignEditor
      id={row.id}
      initialDoc={row.draft_doc}
      initialStatus={row.status}
      initialSlug={row.slug}
      initialRev={row.agent_rev}
      deployedAddress={row.deployed_token_address}
      linkedProjectId={linked?.id ?? null}
      linkedShapes={linked ? kitShapes(linked.draft_doc.kit) : []}
      publishedMilestoneCount={publishedMilestoneCount}
      curve={curve ? { graduated: curve.graduated, windowEnd: curve.windowEnd } : null}
      linkPanel={
        <LinkPanel
          selfType="token_design"
          selfId={row.id}
          selfName={row.draft_doc.name}
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
