import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ExportButtons } from "@/components/ideation/ExportButtons";
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
import {
  DEPLOYABILITY_COPY,
  DEPLOYABILITY_TIER_LABELS,
} from "@/content/ideation-resources";
import { LAUNCH_CHAIN } from "@/content/launch";
import { explorerAddressUrl } from "@/lib/explorer";
import { isSaleEvent, vestedCohorts } from "@/lib/ideation";
import { getLinkedProject, getSnapshot, getTokenDesignByAddress, getTokenDesignBySlug } from "@/lib/ideation-db";
import { deployabilityFindings, deriveTokenomics } from "@/lib/tokenDesign";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (/^0x[a-fA-F0-9]{40}$/.test(slug)) return { title: "Token design" };
  const row = await getTokenDesignBySlug(slug);
  if (!row) return { title: "Token design" };
  return {
    title: `${row.draft_doc.name} ($${row.draft_doc.ticker}) · Token design`,
    description: row.draft_doc.rationale.beyondDatabaseRow.slice(0, 160),
  };
}

export const dynamic = "force-dynamic";

/** Dashboard panel: title lives inside the card. */
function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass rounded-2xl border border-ink-800/70 p-5", className)}>
      <h2 className="text-sm font-medium text-ink-100">{title}</h2>
      <div className="mt-3">{children}</div>
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

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl border border-ink-800/70 p-5">
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink-50">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

/**
 * A wrapping fact row: StatusChip anatomy (tone dot, neutral text) without
 * the pill's nowrap, so long notes wrap instead of overflowing.
 */
function FactRow({
  tone,
  children,
}: {
  tone: "success" | "warning" | "neutral";
  children: React.ReactNode;
}) {
  const dot = {
    success: "bg-signal-400",
    warning: "bg-amber-400/80",
    neutral: "bg-ink-500",
  }[tone];
  return (
    <li className="flex items-start gap-2 text-xs leading-relaxed text-ink-200">
      <span aria-hidden className={cn("mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

const COHORT_LABELS = { team: "Team", investors: "Investors", advisors: "Advisors" } as const;

/** Cohort colors shared with UnlockCalendarChart, extended for held cohorts. */
const ALLOC_COLORS: Record<(typeof ALLOCATION_FIELDS)[number]["key"], string> = {
  public: "#3D7BFF",
  liquidity: "#A78BFA",
  team: "#5C92FF",
  investors: "#8B5CF6",
  advisors: "#22D3EE",
  treasuryEcosystem: "#06B6D4",
  other: "#5B6377",
};

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

  const allocations = ALLOCATION_FIELDS.map((f) => ({
    key: f.key,
    label:
      f.key === "other" && doc.supply.allocations.otherLabel
        ? `Other: ${doc.supply.allocations.otherLabel}`
        : f.label,
    pct: doc.supply.allocations[f.key] || 0,
  })).filter((a) => a.pct > 0);

  const findings = deployabilityFindings(doc);

  return (
    <div className="container max-w-6xl py-12 md:py-16">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kicker">Token design</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50">
            {doc.name} <span className="font-mono text-2xl text-electric-400">${doc.ticker}</span>
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
                  className="text-electric-400 transition-colors hover:text-ink-50"
                >
                  {deployed.slice(0, 10)}…
                </Link>
              </StatusChip>
            ) : (
              <StatusChip tone="neutral">Not deployed</StatusChip>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          {!deployed && (
            <Link
              href={`/launch?design=${row.id}`}
              className="inline-flex items-center rounded-full border border-electric-500/50 bg-electric-500/20 px-4 py-1.5 text-xs font-medium text-electric-200 transition-colors hover:bg-electric-500/30"
            >
              Deploy this design →
            </Link>
          )}
          <ExportButtons kind="t" slug={slug} />
        </div>
      </header>

      {onChainCommitIsOlder && (
        <div className="mt-4">
          <StatusChip tone="info" variant="block">
            The deployed contract committed an earlier version of this design
            (snapshot {row.deployed_snapshot_hash!.slice(0, 14)}…). This page
            shows the latest published version.
          </StatusChip>
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total supply"
          value={doc.supply.total.toLocaleString("en-US")}
          hint={doc.supply.policy === "fixed" ? "Fixed" : "Inflationary (stated)"}
        />
        <StatTile label="Float at launch" value={fmtPct(d.floatAtLaunchPct)} />
        <StatTile
          label="FDV : float"
          value={
            d.fdvToFloat
              ? `${d.fdvToFloat % 1 === 0 ? d.fdvToFloat : d.fdvToFloat.toFixed(1)}×`
              : "n/a"
          }
        />
        <StatTile label="Treasury" value={fmtPct(d.treasuryPct)} />
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Allocation">
            <div className="space-y-3">
              <Row
                term="Policy"
                detail={doc.supply.policy === "fixed" ? "Fixed supply" : "Inflationary (stated)"}
              />
              {allocations.length > 0 && (
                <>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink-800/60">
                    {allocations.map((a) => (
                      <div
                        key={a.key}
                        title={`${a.label} · ${a.pct}%`}
                        style={{ width: `${a.pct}%`, backgroundColor: ALLOC_COLORS[a.key] }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {allocations.map((a) => (
                      <div key={a.key} className="flex items-center gap-2 text-xs">
                        <span
                          aria-hidden
                          className="h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: ALLOC_COLORS[a.key] }}
                        />
                        <span className="min-w-0 truncate text-ink-300">{a.label}</span>
                        <span className="ml-auto font-mono text-ink-200">{a.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Panel>

          <Panel title="Unlock calendar">
            <UnlockCalendarChart calendar={d.unlockCalendar} clusterMonths={d.clusterMonths} />
          </Panel>

          {d.warnings.length > 0 && (
            <div className="space-y-3">
              {d.warnings.map((w) => (
                <WarningResourceCard key={w} warning={w} />
              ))}
            </div>
          )}

          <Panel title="What's enforced, and what's stated">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-ink-100">Enforced on-chain</p>
                <p className="mt-1 text-xs text-ink-500">
                  Written into the contract at deployment. Nobody can change these.
                </p>
                <ul className="mt-3 space-y-2">
                  {doc.supply.policy === "fixed" ? (
                    <FactRow tone="success">
                      Fixed supply: {doc.supply.total.toLocaleString("en-US")}
                    </FactRow>
                  ) : (
                    <FactRow tone="warning">
                      Stated policy is inflationary; a factory deploy would still
                      enforce a fixed supply of {doc.supply.total.toLocaleString("en-US")}
                    </FactRow>
                  )}
                  {GOVERNANCE_FACTS.map((fact) => (
                    <FactRow key={fact} tone="success">
                      {fact}
                    </FactRow>
                  ))}
                  <FactRow tone="success">{MARKET_FACTS[0]}</FactRow>
                </ul>
                <a
                  href={explorerAddressUrl(deployed ?? LAUNCH_CHAIN.factoryAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-xs text-electric-400 transition-colors hover:text-ink-50"
                >
                  {deployed ? "Verified token contract" : "Verified factory"} on Blockscout →
                </a>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-100">Stated by the team</p>
                <p className="mt-1 text-xs text-ink-500">
                  Published commitments: snapshotted and tamper-evident, but not
                  enforced by the contract.
                </p>
                <ul className="mt-3 space-y-2">
                  <FactRow tone="neutral">Allocation split and non-team vesting</FactRow>
                  <FactRow tone="neutral">Distribution and market plans</FactRow>
                  {GOVERNANCE_FIELDS.map(({ key, label }) => (
                    <FactRow key={key} tone="neutral">
                      {label}: {STATUS_DECL_LABELS[doc.governance[key].status]}
                      {doc.governance[key].note ? (
                        <span className="text-ink-400"> ({doc.governance[key].note})</span>
                      ) : null}
                    </FactRow>
                  ))}
                  <FactRow tone="neutral">
                    Legal: {optionLabel(COUNSEL_OPTIONS, doc.legal.counsel)}
                  </FactRow>
                </ul>
              </div>
            </div>
          </Panel>

          {(["custom", "stated", "canhav"] as const).map((tier) => {
            const inTier = findings.filter((code) => DEPLOYABILITY_COPY[code].tier === tier);
            if (inTier.length === 0) return null;
            return (
              <StatusChip
                key={tier}
                tone={tier === "custom" ? "warning" : tier === "stated" ? "neutral" : "info"}
                variant="block"
              >
                <span className="block font-medium text-ink-100">
                  {DEPLOYABILITY_TIER_LABELS[tier]}
                </span>
                {inTier.map((code) => (
                  <span key={code} className="mt-1 block">
                    {DEPLOYABILITY_COPY[code].text}
                  </span>
                ))}
              </StatusChip>
            );
          })}
        </div>

        <aside className="space-y-4">
          <Panel title="Why a token">
            <div className="space-y-2.5">
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
          </Panel>

          {vestedCohorts(doc.supply.allocations).length > 0 && (
            <Panel title="Vesting">
              <div className="space-y-2.5">
                {doc.vesting.cohorts.map((c) => (
                  <Row
                    key={c.cohort}
                    term={COHORT_LABELS[c.cohort]}
                    detail={`${c.cliffMonths}mo cliff · ${c.durationMonths}mo total`}
                  />
                ))}
                <Row
                  term="Release"
                  detail={optionLabel(RELEASE_TYPE_OPTIONS, doc.vesting.release)}
                />
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
            </Panel>
          )}

          <Panel title="Distribution and market">
            <div className="space-y-2.5">
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
                    detail={`${doc.market.atLaunch.liquidityEth} ETH (${doc.market.atLaunch.ethSource})`}
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
          </Panel>

          {(doc.postLaunch.runwayMonths !== undefined ||
            doc.postLaunch.reporting ||
            doc.postLaunch.priceCollapsePlan ||
            doc.postLaunch.failureCriteria) && (
            <Panel title="Post-launch">
              <div className="space-y-2.5">
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
            </Panel>
          )}

          {linkedPublished && (
            <LinkedEntityCard
              type="project"
              name={linkedPublished.draft_doc.name}
              slug={linkedPublished.slug!}
              summary={linkedPublished.draft_doc.whatItDoes}
            />
          )}
        </aside>
      </div>

      <p className="mt-10 border-t border-ink-800/70 pt-5 font-mono text-[11px] text-ink-600">
        Snapshot {snapshot.snapshot_hash}
      </p>
    </div>
  );
}
