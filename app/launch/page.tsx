import type { Metadata } from "next";
import Link from "next/link";

import {
  type DesignCommitment,
  type LaunchPrefill,
  LaunchForm,
} from "@/components/launch/LaunchForm";
import { LAUNCH_COPY, LAUNCH_FORM, MCP_CONNECT } from "@/content/launch";
import { type ProjectChain, projectChainOf } from "@/lib/chains";
import { designMilestones } from "@/lib/launch-commitment";
import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import type { ProjectContext } from "@/lib/ideation";
import {
  getLinkedProject,
  getLinkedTokenDesign,
  getProject,
  getPublishedTokenDesignById,
  getSnapshot,
} from "@/lib/ideation-db";
import { indexedChains } from "@/lib/indexer";
import { projectContext } from "@/lib/launch-project";

export const metadata: Metadata = {
  title: "Launch a token",
  description:
    "Launch a token on Robinhood Chain Testnet or Arbitrum Sepolia with an on-chain commitment that any agent can read over MCP.",
};

export const dynamic = "force-dynamic";

/** ?design=<id>: seed the form from a published design and commit its hash. */
async function loadDesign(designId: string | undefined): Promise<{
  prefill?: LaunchPrefill;
  designCommitment?: DesignCommitment;
  /** The chain of the project the design is linked to, when it is linked (M54). */
  chain?: ProjectChain;
}> {
  if (!designId || !/^[0-9a-f-]{36}$/.test(designId)) return {};
  const row = await getPublishedTokenDesignById(designId);
  if (!row?.published_hash || !row.slug) return {};
  const doc = row.draft_doc;
  // The milestones the launch will commit come from the published snapshot, not the draft (M48).
  const snapshot = await getSnapshot(row.published_hash);
  const milestoneCount =
    snapshot && snapshot.doc.kind === "token_design" ? (designMilestones(snapshot.doc)?.length ?? 0) : 0;
  const team = doc.vesting.cohorts.find((c) => c.cohort === "team");
  const linkedProject = await getLinkedProject(row.id);
  return {
    ...(linkedProject ? { chain: projectChainOf(linkedProject.draft_doc) } : {}),
    prefill: {
      name: doc.name.replace(LAUNCH_FORM.name.strip, "").slice(0, LAUNCH_FORM.name.max),
      ticker: doc.ticker,
      supply: String(Math.floor(doc.supply.total)),
      // The form no longer offers vesting, so the whole supply mints to the
      // creator. A design that declares a team cohort gets a notice on the
      // Launch step rather than a silent on-chain schedule.
      designVesting: Boolean(team && doc.supply.allocations.team > 0),
    },
    designCommitment: {
      id: row.id,
      slug: row.slug,
      snapshotHash: row.published_hash as `0x${string}`,
      name: doc.name,
      milestoneCount,
    },
  };
}

/**
 * ?project=<id>: the studio project the launch is started from. Owner
 * scoped, so anyone else (and a session without Clerk) gets the plain form.
 * When the project has a published linked design and no ?design was given,
 * that design is committed too, so the launch carries both.
 */
async function loadProject(projectId: string | undefined): Promise<{
  project?: ProjectContext;
  designId?: string;
}> {
  if (!projectId || !/^[0-9a-f-]{36}$/.test(projectId) || !isAuthConfigured()) return {};
  const user = await getSessionUser();
  if (!user) return {};
  const row = await getProject(projectId, user.id);
  if (!row) return {};
  const linked = await getLinkedTokenDesign(row.id);
  const designId =
    linked && linked.status === "published" && linked.published_hash && linked.slug
      ? linked.id
      : undefined;
  return { project: projectContext(row), designId };
}

export default async function LaunchPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string; project?: string }>;
}) {
  const params = await searchParams;
  const { project, designId } = await loadProject(params.project);
  const { prefill, designCommitment, chain: designChain } = await loadDesign(params.design ?? designId);
  // A launch from a project, or from a design linked to one, goes on that project's chain (M54).
  const chain = project?.chain ?? designChain;

  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">{LAUNCH_COPY.kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          {LAUNCH_COPY.title}
        </h1>
        <p className="mt-4 text-lg font-medium leading-relaxed text-ink-100">
          {LAUNCH_COPY.subtitleLead}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">
          {LAUNCH_COPY.subtitleDetail}{" "}
          <Link
            href="/launch/governance"
            className="text-electric-300 transition-colors hover:text-electric-200"
          >
            Fees &amp; governance →
          </Link>{" "}
          <Link
            href="/explore"
            className="text-electric-300 transition-colors hover:text-electric-200"
          >
            Recent launches →
          </Link>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">
          {MCP_CONNECT.landingPointer}{" "}
          <a
            href={MCP_CONNECT.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-electric-300 transition-colors hover:text-electric-200"
          >
            How to connect →
          </a>
        </p>
      </div>

      <div className="mt-10 md:mt-12">
        <LaunchForm prefill={prefill} designCommitment={designCommitment} project={project} chain={chain} launchable={indexedChains()} />
      </div>
    </div>
  );
}
