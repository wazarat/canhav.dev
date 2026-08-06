import type { Metadata } from "next";
import Link from "next/link";

import {
  type DesignCommitment,
  type LaunchPrefill,
  LaunchForm,
} from "@/components/launch/LaunchForm";
import { LAUNCH_COPY, LAUNCH_FORM } from "@/content/launch";
import { getPublishedTokenDesignById } from "@/lib/ideation-db";

// Intentionally unlinked from navigation: URL-only access while the
// launchpad is developed incrementally.
export const metadata: Metadata = {
  title: LAUNCH_COPY.title,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** ?design=<id>: seed the form from a published design and commit its hash. */
async function loadDesign(designId: string | undefined): Promise<{
  prefill?: LaunchPrefill;
  designCommitment?: DesignCommitment;
}> {
  if (!designId || !/^[0-9a-f-]{36}$/.test(designId)) return {};
  const row = await getPublishedTokenDesignById(designId);
  if (!row?.published_hash || !row.slug) return {};
  const doc = row.draft_doc;
  const team = doc.vesting.cohorts.find((c) => c.cohort === "team");
  return {
    prefill: {
      name: doc.name.replace(LAUNCH_FORM.name.strip, "").slice(0, LAUNCH_FORM.name.max),
      ticker: doc.ticker,
      supply: String(Math.floor(doc.supply.total)),
      // The factory vests one share to the creator — the design's team cohort
      // maps onto it (months → days); other cohorts stay off-chain commitments.
      vesting:
        team && doc.supply.allocations.team > 0
          ? {
              percent: String(doc.supply.allocations.team),
              days: String(Math.max(team.durationMonths * 30, 1)),
              cliffDays: String(team.cliffMonths * 30),
            }
          : undefined,
    },
    designCommitment: {
      id: row.id,
      slug: row.slug,
      snapshotHash: row.published_hash as `0x${string}`,
      name: doc.name,
    },
  };
}

export default async function LaunchPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string }>;
}) {
  const { design } = await searchParams;
  const { prefill, designCommitment } = await loadDesign(design);

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
          </Link>
        </p>
      </div>

      <div className="mt-10 md:mt-12">
        <LaunchForm prefill={prefill} designCommitment={designCommitment} />
      </div>
    </div>
  );
}
