import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LinkedEntityCard } from "@/components/ideation/LinkedEntityCard";
import { UnlockCalendarChart } from "@/components/ideation/UnlockCalendarChart";
import { WarningResourceCard } from "@/components/ideation/WarningResourceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  ALLOCATION_FIELDS,
  COUNSEL_OPTIONS,
  DISTRIBUTION_EVENT_OPTIONS,
  FOUNDER_LEAVES_OPTIONS,
  GOVERNANCE_FACTS,
  GOVERNANCE_FIELDS,
  ISSUANCE_PATH_OPTIONS,
  LP_TREATMENT_OPTIONS,
  MARKET_FACTS,
  MARKET_TIMING_OPTIONS,
  RATIONALE_WHY_OPTIONS,
  RELEASE_TYPE_OPTIONS,
  STATUS_DECL_LABELS,
  UNDERSUBSCRIPTION_OPTIONS,
  optionLabel,
} from "@/content/ideation";
import { LAUNCH_CHAIN } from "@/content/launch";
import { explorerAddressUrl } from "@/lib/explorer";
import { isSaleEvent, vestedCohorts } from "@/lib/ideation";
import { getLinkedProject, getSnapshot, getTokenDesignByAddress, getTokenDesignBySlug } from "@/lib/ideation-db";
import { deriveTokenomics } from "@/lib/tokenDesign";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-ink-50">{title}</h2>
      {children}
    </section>
  );
}

function Row({ term, detail }: { term: string; detail: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-ink-500">{term}</span>
      <span className="text-right text-ink-200">{detail}</span>
    </div>
  );
}

const COHORT_LABELS = { team: "Team", investors: "Investors", advisors: "Advisors" } as const;

export default async function TokenDesignPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // /t/<0x…> — a deployed contract address resolves to its design's slug.
  if (/^0x[a-fA-F0-9]{40}$/.test(slug)) {
    const byAddress = await getTokenDesignByAddress(slug);
    if (byAddress?.slug && byAddress.status === "published") redirect(`/t/${byAddress.slug}`);
    notFound();
  }

  const row = await getTokenDesignBySlug(slug);
  if (!row || !row.published_hash) notFound();
  const snapshot = await getSnapshot(row.published_hash);
  if (!snapshot || snapshot.doc.kind !== "token_design") notFound();
  const doc = snapshot.doc;

  const linked = await getLinkedProject(row.id);
  const linkedPublished = linked && linked.status === "published" && linked.slug ? linked : null;

  const d = deriveTokenomics(doc);
  const fmtPct = (n: number) => `${n % 1 === 0 ? n : n.toFixed(1)}%`;
  const deployed = row.deployed_token_address;
  const onChainCommitIsOlder =
    deployed && row.deployed_snapshot_hash && row.deployed_snapshot_hash !== row.published_hash;

  return (
    <div className="container max-w-4xl py-14 md:py-20">
      <div>
        <p className="kicker">Token design</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50">
          {doc.name} <span className="font-mono text-2xl text-electric-300">${doc.ticker}</span>
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusChip tone="neutral">
            v{doc.publishVersion} · {new Date(snapshot.created_at).toLocaleDateString("en-US")}
          </StatusChip>
          {deployed ? (
            <StatusChip tone="success">
              Deployed ·{" "}
              <Link
                href={`/launch/t/${deployed}`}
                className="text-electric-300 transition-colors hover:text-electric-200"
              >
                {deployed.slice(0, 10)}…
              </Link>
            </StatusChip>
          ) : (
            <>
              <StatusChip tone="neutral">Not deployed</StatusChip>
              <Link
                href={`/launch?design=${row.id}`}
                className="inline-flex items-center rounded-full border border-electric-500/50 bg-electric-500/20 px-3 py-1 text-xs font-medium text-electric-200 transition-colors hover:bg-electric-500/30"
              >
                Deploy this design →
              </Link>
            </>
          )}
        </div>
        {onChainCommitIsOlder && (
          <div className="mt-3 max-w-xl">
            <StatusChip tone="info" variant="block">
              The deployed contract committed an earlier version of this design
              (snapshot {row.deployed_snapshot_hash!.slice(0, 14)}…). This page
              shows the latest published version.
            </StatusChip>
          </div>
        )}
      </div>

      <div className="mt-12 space-y-12">
        <Section title="Why a token">
          <div className="glass space-y-2.5 rounded-2xl border border-ink-800/70 p-5">
            <Row term="Why" detail={optionLabel(RATIONALE_WHY_OPTIONS, doc.rationale.why)} />
            <Row term="Path" detail={optionLabel(ISSUANCE_PATH_OPTIONS, doc.rationale.path)} />
            <div className="pt-1">
              <p className="text-[11px] uppercase tracking-wide text-ink-500">
                Beyond a database row
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-200">
                {doc.rationale.beyondDatabaseRow}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Computed from the design">
          <div className="glass rounded-2xl border border-ink-800/70 p-5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-500">Float at launch</p>
                <p className="mt-0.5 font-display text-xl font-semibold text-ink-50">
                  {fmtPct(d.floatAtLaunchPct)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-500">FDV : float</p>
                <p className="mt-0.5 font-display text-xl font-semibold text-ink-50">
                  {d.fdvToFloat ? `${d.fdvToFloat % 1 === 0 ? d.fdvToFloat : d.fdvToFloat.toFixed(1)}×` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-500">Treasury</p>
                <p className="mt-0.5 font-display text-xl font-semibold text-ink-50">
                  {fmtPct(d.treasuryPct)}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-500">
                Unlock calendar
              </p>
              <UnlockCalendarChart calendar={d.unlockCalendar} clusterMonths={d.clusterMonths} />
            </div>
          </div>
          {d.warnings.length > 0 && (
            <div className="space-y-3">
              {d.warnings.map((w) => (
                <WarningResourceCard key={w} warning={w} />
              ))}
            </div>
          )}
        </Section>

        <Section title="Supply and allocation">
          <div className="glass space-y-2.5 rounded-2xl border border-ink-800/70 p-5">
            <Row term="Total supply" detail={doc.supply.total.toLocaleString("en-US")} />
            <Row
              term="Policy"
              detail={doc.supply.policy === "fixed" ? "Fixed" : "Inflationary"}
            />
            {ALLOCATION_FIELDS.map((f) => {
              const v = doc.supply.allocations[f.key];
              if (!v) return null;
              const label =
                f.key === "other" && doc.supply.allocations.otherLabel
                  ? `Other — ${doc.supply.allocations.otherLabel}`
                  : f.label;
              return <Row key={f.key} term={label} detail={`${v}%`} />;
            })}
          </div>
        </Section>

        {vestedCohorts(doc.supply.allocations).length > 0 && (
          <Section title="Vesting">
            <div className="glass space-y-2.5 rounded-2xl border border-ink-800/70 p-5">
              {doc.vesting.cohorts.map((c) => (
                <Row
                  key={c.cohort}
                  term={COHORT_LABELS[c.cohort]}
                  detail={`${c.cliffMonths}mo cliff · ${c.durationMonths}mo total`}
                />
              ))}
              <Row term="Release" detail={optionLabel(RELEASE_TYPE_OPTIONS, doc.vesting.release)} />
              <Row
                term="If a founder leaves"
                detail={optionLabel(FOUNDER_LEAVES_OPTIONS, doc.vesting.founderLeaves)}
              />
              {d.teamVsInvestors.teamCliffShorter && (
                <StatusChip tone="warning">
                  Team cliff is shorter than investors&apos;
                </StatusChip>
              )}
            </div>
          </Section>
        )}

        <Section title="Distribution and market">
          <div className="glass space-y-2.5 rounded-2xl border border-ink-800/70 p-5">
            <Row
              term="Distribution"
              detail={optionLabel(DISTRIBUTION_EVENT_OPTIONS, doc.distribution.event)}
            />
            {isSaleEvent(doc.distribution.event) && doc.distribution.sale && (
              <>
                <Row term="Price" detail={`${doc.distribution.sale.price} ETH`} />
                <Row
                  term="Caps"
                  detail={`${doc.distribution.sale.softCap} soft / ${doc.distribution.sale.hardCap} hard ETH`}
                />
                <Row
                  term="Access"
                  detail={doc.distribution.sale.access === "allowlist" ? "Allowlist" : "Open"}
                />
                <Row
                  term="If undersubscribed"
                  detail={optionLabel(
                    UNDERSUBSCRIPTION_OPTIONS,
                    doc.distribution.sale.undersubscription,
                  )}
                />
              </>
            )}
            <Row term="Market" detail={optionLabel(MARKET_TIMING_OPTIONS, doc.market.when)} />
            {doc.market.when === "at_launch" && doc.market.atLaunch && (
              <>
                <Row
                  term="Launch liquidity"
                  detail={`${doc.market.atLaunch.liquidityEth} ETH — ${doc.market.atLaunch.ethSource}`}
                />
                <Row
                  term="LP treatment"
                  detail={
                    doc.market.atLaunch.lp === "locked" && doc.market.atLaunch.lpLockMonths
                      ? `Locked ${doc.market.atLaunch.lpLockMonths} months`
                      : optionLabel(LP_TREATMENT_OPTIONS, doc.market.atLaunch.lp)
                  }
                />
              </>
            )}
          </div>
        </Section>

        <Section title="What's enforced — and what's stated">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass rounded-2xl border border-ink-800/70 p-5">
              <p className="text-sm font-medium text-ink-100">Enforced on-chain</p>
              <p className="mt-1 text-xs text-ink-500">
                Written into the contract at deployment — nobody can change these.
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <StatusChip tone="success">
                    Fixed supply: {doc.supply.total.toLocaleString("en-US")}
                  </StatusChip>
                </li>
                {GOVERNANCE_FACTS.map((fact) => (
                  <li key={fact}>
                    <StatusChip tone="success">{fact}</StatusChip>
                  </li>
                ))}
                <li>
                  <StatusChip tone="success">{MARKET_FACTS[0]}</StatusChip>
                </li>
              </ul>
              <a
                href={explorerAddressUrl(deployed ?? LAUNCH_CHAIN.factoryAddress)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-xs text-electric-300 transition-colors hover:text-electric-200"
              >
                {deployed ? "Verified token contract" : "Verified factory"} on Blockscout →
              </a>
            </div>
            <div className="glass rounded-2xl border border-ink-800/70 p-5">
              <p className="text-sm font-medium text-ink-100">Stated by the team</p>
              <p className="mt-1 text-xs text-ink-500">
                Published commitments — snapshotted and tamper-evident, but not
                enforced by the contract.
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <StatusChip tone="neutral">Allocation split and non-team vesting</StatusChip>
                </li>
                <li>
                  <StatusChip tone="neutral">Distribution and market plans</StatusChip>
                </li>
                {GOVERNANCE_FIELDS.map(({ key, label }) => (
                  <li key={key}>
                    <StatusChip tone="neutral">
                      {label}: {STATUS_DECL_LABELS[doc.governance[key].status]}
                      {doc.governance[key].note ? ` — ${doc.governance[key].note}` : ""}
                    </StatusChip>
                  </li>
                ))}
                <li>
                  <StatusChip tone="neutral">
                    Legal: {optionLabel(COUNSEL_OPTIONS, doc.legal.counsel)}
                  </StatusChip>
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {(doc.postLaunch.runwayMonths !== undefined ||
          doc.postLaunch.reporting ||
          doc.postLaunch.priceCollapsePlan ||
          doc.postLaunch.failureCriteria) && (
          <Section title="Post-launch">
            <div className="glass space-y-2.5 rounded-2xl border border-ink-800/70 p-5">
              {doc.postLaunch.runwayMonths !== undefined && (
                <Row term="Treasury runway" detail={`${doc.postLaunch.runwayMonths} months`} />
              )}
              {doc.postLaunch.reporting && (
                <Row
                  term="Reporting"
                  detail={
                    { monthly: "Monthly", quarterly: "Quarterly", ad_hoc: "Ad hoc", none_yet: "None yet" }[
                      doc.postLaunch.reporting
                    ]
                  }
                />
              )}
              {doc.postLaunch.priceCollapsePlan && (
                <div className="pt-1">
                  <p className="text-[11px] uppercase tracking-wide text-ink-500">
                    If the price collapses
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-200">
                    {doc.postLaunch.priceCollapsePlan}
                  </p>
                </div>
              )}
              {doc.postLaunch.failureCriteria && (
                <div className="pt-1">
                  <p className="text-[11px] uppercase tracking-wide text-ink-500">
                    Failure criteria
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-200">
                    {doc.postLaunch.failureCriteria}
                  </p>
                </div>
              )}
            </div>
          </Section>
        )}

        {linkedPublished && (
          <Section title="Product">
            <LinkedEntityCard
              type="project"
              name={linkedPublished.draft_doc.name}
              slug={linkedPublished.slug!}
              summary={linkedPublished.draft_doc.whatItDoes}
            />
          </Section>
        )}

        <p className="border-t border-ink-800/70 pt-5 font-mono text-[11px] text-ink-600">
          Snapshot {snapshot.snapshot_hash}
        </p>
      </div>
    </div>
  );
}
