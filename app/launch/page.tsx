import type { Metadata } from "next";
import Link from "next/link";

import {
  type DesignCommitment,
  type LaunchPrefill,
  LaunchForm,
} from "@/components/launch/LaunchForm";
import { LAUNCH_COPY, LAUNCH_FORM, MCP_CONNECT } from "@/content/launch";
import { getPublishedTokenDesignById } from "@/lib/ideation-db";

export const metadata: Metadata = {
  title: "Launch a token",
  description:
    "Launch a token on Robinhood Chain Testnet with an on-chain commitment that any agent can read over MCP.",
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
          </Link>{" "}
          <Link
            href="/launch/explore"
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
        <LaunchForm prefill={prefill} designCommitment={designCommitment} />
      </div>
    </div>
  );
}
