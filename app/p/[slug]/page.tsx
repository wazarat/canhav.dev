import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExportButtons } from "@/components/ideation/ExportButtons";
import { LinkedEntityCard } from "@/components/ideation/LinkedEntityCard";
import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import {
  PROJECT_SECURITY_FIELDS,
  ROBINHOOD_MYTH,
  SECTOR_OPTIONS,
  STAGE_OPTIONS,
  STATUS_DECL_LABELS,
  UPGRADEABILITY_OPTIONS,
  WORST_CASE_OPTIONS,
  optionLabel,
} from "@/content/ideation";
import { explorerAddressUrl } from "@/lib/explorer";
import type { ProjectDoc, StatusDecl } from "@/lib/ideation";
import { getLinkedTokenDesign, getProjectBySlug, getSnapshot } from "@/lib/ideation-db";
import { getTokensByCreator } from "@/lib/indexer";
import {
  getBlockscoutVerification,
  getGithubActivity,
  getWalletTxCount,
} from "@/lib/verifySignals";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** A "not yet" is a warning only when the declared blast radius earns it. */
function declTone(decl: StatusDecl, worstCase: ProjectDoc["worstCase"]): StatusTone {
  if (decl.status === "in_place") return "success";
  if (decl.status === "not_yet")
    return worstCase === "lose_funds" || worstCase === "lock_funds" ? "warning" : "neutral";
  return "info";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-ink-50">{title}</h2>
      {children}
    </section>
  );
}

function Prose({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-200">{text}</p>
    </div>
  );
}

export default async function ProjectPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getProjectBySlug(slug);
  if (!row || !row.published_hash) notFound();

  const snapshot = await getSnapshot(row.published_hash);
  if (!snapshot || snapshot.doc.kind !== "project") notFound();
  const doc = snapshot.doc;

  const [linked, deploys, txCount, github, contractChecks] = await Promise.all([
    getLinkedTokenDesign(row.id),
    doc.verifyWallet ? getTokensByCreator(doc.verifyWallet) : null,
    doc.verifyWallet ? getWalletTxCount(doc.verifyWallet) : null,
    doc.githubRepo ? getGithubActivity(doc.githubRepo) : null,
    doc.testnetContracts
      ? Promise.all(doc.testnetContracts.map((a) => getBlockscoutVerification(a)))
      : null,
  ]);
  const linkedPublished = linked && linked.status === "published" && linked.slug ? linked : null;

  const commitsLast30Days = github
    ? github.recentCommits.filter(
        (d) => Date.now() - Date.parse(d) < 30 * 24 * 3600 * 1000,
      ).length
    : 0;

  return (
    <div className="container max-w-4xl py-14 md:py-20">
      <div>
        <p className="kicker">Project</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50">
          {doc.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusChip tone="neutral">
            {doc.sector === "other" && doc.sectorOther
              ? doc.sectorOther
              : optionLabel(SECTOR_OPTIONS, doc.sector)}
          </StatusChip>
          <StatusChip tone="info">{optionLabel(STAGE_OPTIONS, doc.stage)}</StatusChip>
          <StatusChip tone="neutral">
            v{doc.publishVersion} · {new Date(snapshot.created_at).toLocaleDateString("en-US")}
          </StatusChip>
        </div>
        <div className="mt-4">
          <ExportButtons kind="p" slug={slug} />
        </div>
      </div>

      <div className="mt-12 space-y-12">
        <Section title="The product">
          <div className="space-y-4">
            <Prose label="What it does" text={doc.whatItDoes} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Prose label="Who the user is" text={doc.userIs} />
              <Prose label="Who pays" text={doc.whoPays} />
            </div>
            <Prose label="Why this chain" text={doc.whyThisChain} />
          </div>
        </Section>

        <Section title="Distribution reality">
          <p className="text-sm leading-relaxed text-ink-400">
            The team has acknowledged: {ROBINHOOD_MYTH.body}
          </p>
          <Prose label={ROBINHOOD_MYTH.followUp} text={doc.firstHundredUsers} />
        </Section>

        <Section title="Contract architecture">
          <div className="space-y-4">
            <Prose label="Contracts" text={doc.architecture.contracts} />
            <Prose label="External dependencies" text={doc.architecture.externalDeps} />
            <Prose label="Oracles" text={doc.architecture.oracles} />
            <Prose label="Admin functions" text={doc.architecture.adminFunctions} />
            <div className="flex flex-wrap gap-2">
              <StatusChip
                tone={doc.architecture.upgradeability === "immutable" ? "success" : "neutral"}
              >
                {optionLabel(UPGRADEABILITY_OPTIONS, doc.architecture.upgradeability)}
              </StatusChip>
              <StatusChip tone={doc.worstCase === "nothing_serious" ? "neutral" : "warning"}>
                Worst case: {optionLabel(WORST_CASE_OPTIONS, doc.worstCase)}
              </StatusChip>
            </div>
          </div>
        </Section>

        <Section title="Security">
          <div className="flex flex-wrap gap-2">
            {PROJECT_SECURITY_FIELDS.map(({ key, label }) => {
              const decl = doc.security[key];
              return (
                <StatusChip key={key} tone={declTone(decl, doc.worstCase)}>
                  {label}: {STATUS_DECL_LABELS[decl.status]}
                  {decl.note ? ` — ${decl.note}` : ""}
                </StatusChip>
              );
            })}
          </div>
        </Section>

        {(deploys || txCount !== null || github || contractChecks) && (
          <Section title="Verified signals">
            <p className="text-sm text-ink-500">
              Read from the chain and public sources — not self-reported.
              {doc.verifyWallet && " Wallet declared by the team."}
            </p>
            <div className="space-y-3">
              {deploys && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-ink-500">
                    Factory deploys by {doc.verifyWallet?.slice(0, 10)}… — {deploys.totalCount}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {deploys.items.map((t) => (
                      <li key={t.address} className="text-sm">
                        <a
                          href={`/launch/t/${t.address}`}
                          className="text-electric-300 transition-colors hover:text-electric-200"
                        >
                          {t.name} (${t.symbol})
                        </a>{" "}
                        <span className="text-ink-500">
                          · {new Date(Number(t.blockTimestamp) * 1000).toLocaleDateString("en-US")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {txCount !== null && (
                <StatusChip tone="neutral">
                  {txCount.toLocaleString("en-US")} transactions from the declared wallet
                </StatusChip>
              )}
              {contractChecks && (
                <div className="flex flex-wrap gap-2">
                  {contractChecks.map(
                    (check, i) =>
                      check && (
                        <StatusChip key={check.address} tone={check.verified ? "success" : "warning"}>
                          <a
                            href={explorerAddressUrl(check.address)}
                            target="_blank"
                            rel="noreferrer"
                            className="transition-colors hover:text-ink-50"
                          >
                            {check.name ?? `${check.address.slice(0, 10)}…`}:{" "}
                            {check.verified ? "verified source" : "unverified"}
                          </a>
                        </StatusChip>
                      ),
                  )}
                </div>
              )}
              {github && (
                <StatusChip tone={commitsLast30Days > 0 ? "success" : "neutral"}>
                  <a
                    href={`https://github.com/${github.repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-ink-50"
                  >
                    {github.repo}: {commitsLast30Days} commits in the last 30 days
                    {github.pushedAt
                      ? ` · last push ${new Date(github.pushedAt).toLocaleDateString("en-US")}`
                      : ""}
                  </a>
                </StatusChip>
              )}
            </div>
          </Section>
        )}

        {linkedPublished && (
          <Section title="Token">
            <LinkedEntityCard
              type="token_design"
              name={linkedPublished.draft_doc.name}
              slug={linkedPublished.slug!}
              summary={linkedPublished.draft_doc.rationale.beyondDatabaseRow}
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
