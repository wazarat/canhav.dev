import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExportButtons } from "@/components/ideation/ExportButtons";
import { LinkedEntityCard } from "@/components/ideation/LinkedEntityCard";
import { CurveProgress } from "@/components/launch/CurveProgress";
import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import {
  AUDIENCE_OPTIONS,
  PERSONA_COPY,
  audiencePersonaCards,
  PROJECT_SECURITY_FIELDS,
  ROBINHOOD_MYTH,
  STAGE_OPTIONS,
  STATUS_DECL_LABELS,
  UPGRADEABILITY_OPTIONS,
  WORST_CASE_OPTIONS,
  optionLabel,
  sectorLabels,
  subsectorLabels,
} from "@/content/ideation";
import { checklistFor } from "@/content/kits/checklists";
import { CHECKLIST_COPY, shapeLabels, startingPointLabel } from "@/content/kits/copy";
import { checklistProgress, kitShapes } from "@/lib/kits";
import { explorerAddressUrl } from "@/lib/explorer";
import { type ProjectDoc, type StatusDecl, docAudience } from "@/lib/ideation";
import { getLaunchesByProject } from "@/lib/launches-db";
import { getLinkedTokenDesign, getProjectBySlug, getSnapshot } from "@/lib/ideation-db";
import { getCurve, getTokensByCreator } from "@/lib/indexer";
import {
  getBlockscoutVerification,
  getGithubActivity,
  getWalletTxCount,
} from "@/lib/verifySignals";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getProjectBySlug(slug);
  if (!row) return {};
  return {
    description: row.draft_doc.whatItDoes.slice(0, 160),
  };
}

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
  const audience = docAudience(doc);
  const personaCards = audiencePersonaCards(doc);

  const [linked, deploys, txCount, github, contractChecks, projectLaunches] = await Promise.all([
    getLinkedTokenDesign(row.id),
    doc.verifyWallet ? getTokensByCreator(doc.verifyWallet) : null,
    doc.verifyWallet ? getWalletTxCount(doc.verifyWallet) : null,
    doc.githubRepo ? getGithubActivity(doc.githubRepo) : null,
    doc.testnetContracts
      ? Promise.all(doc.testnetContracts.map((a) => getBlockscoutVerification(a)))
      : null,
    // Tokens launched from this project through the studio (M19d).
    getLaunchesByProject(row.id),
  ]);
  const launchedTokens = await Promise.all(
    (projectLaunches ?? []).slice(0, 5).map(async (l) => ({
      address: l.token_address,
      at: l.created_at,
      curve: await getCurve(l.token_address),
    })),
  );
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
          {sectorLabels(doc).map((label) => (
            <StatusChip key={`sector-${label}`} tone="neutral">
              {label}
            </StatusChip>
          ))}
          {subsectorLabels(doc).map((label) => (
            <StatusChip key={label} tone="neutral">
              {label}
            </StatusChip>
          ))}
          {shapeLabels(doc.kit).map((label) => (
            <StatusChip key={label} tone="neutral">
              {label}
            </StatusChip>
          ))}
          {doc.kit && checklistFor(kitShapes(doc.kit)).length > 0 ? (
            <StatusChip tone="info">
              {CHECKLIST_COPY.rowChip(
                checklistProgress(checklistFor(kitShapes(doc.kit)), doc.kit).done,
                checklistFor(kitShapes(doc.kit)).length,
              )}
            </StatusChip>
          ) : null}
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
            {personaCards.length > 0 ? (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-500">
                  {PERSONA_COPY.label}
                </p>
                {audience ? (
                  <p className="mt-1 text-sm text-ink-300">
                    <span className="text-ink-500">{PERSONA_COPY.audienceLabel} </span>
                    {optionLabel(AUDIENCE_OPTIONS, audience)}
                  </p>
                ) : null}
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {personaCards.map((cells, i) => (
                    <div key={i} className="glass rounded-xl border border-ink-700/60 p-4">
                      <p className="text-xs font-medium text-ink-400">
                        {PERSONA_COPY.column(i + 1)}
                      </p>
                      <dl className="mt-2 space-y-2">
                        {cells.map((cell) => (
                          <div key={cell.label}>
                            <dt className="text-[11px] text-ink-500">{cell.label}</dt>
                            <dd className="text-sm text-ink-200">{cell.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {doc.userIs.trim() || doc.payer ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {doc.userIs.trim() ? (
                  <Prose
                    label={personaCards.length ? PERSONA_COPY.legacyLabel : PERSONA_COPY.label}
                    text={doc.userIs}
                  />
                ) : null}
                {doc.payer ? (
                  <Prose
                    label="Who pays"
                    text={
                      doc.payer === "user"
                        ? "The user pays."
                        : doc.whoPays.trim() || "Someone else pays."
                    }
                  />
                ) : null}
              </div>
            ) : null}
            {doc.whyThisChain.trim() ? (
              <Prose label="Why this chain" text={doc.whyThisChain} />
            ) : null}
            {doc.kit && startingPointLabel(doc.kit) ? (
              <Prose label="Starting from" text={startingPointLabel(doc.kit) ?? ""} />
            ) : null}
          </div>
        </Section>

        <Section title="Distribution reality">
          <p className="text-sm leading-relaxed text-ink-400">
            The team has acknowledged this. {ROBINHOOD_MYTH.body}
          </p>
          <Prose label={ROBINHOOD_MYTH.followUp} text={doc.firstHundredUsers} />
        </Section>

        <Section title="Contract architecture">
          <div className="space-y-4">
            <Prose label="Contracts" text={doc.architecture.contracts} />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-500">
                External dependencies
              </p>
              {doc.architecture.externalDepsNone || doc.architecture.externalDeps.length === 0 ? (
                <p className="mt-1 text-sm leading-relaxed text-ink-200">None</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {doc.architecture.externalDeps.map((dep, i) => (
                    <StatusChip key={`${dep.name}-${i}`} tone="neutral">
                      {dep.url ? (
                        <a
                          href={dep.url}
                          target="_blank"
                          rel="noreferrer"
                          className="transition-colors hover:text-ink-50"
                        >
                          {dep.name}
                        </a>
                      ) : (
                        dep.name
                      )}
                    </StatusChip>
                  ))}
                </div>
              )}
            </div>
            <Prose
              label="Oracles"
              text={doc.architecture.oracleUse === "none" ? "None" : doc.architecture.oracles}
            />
            <Prose label="Admin functions" text={doc.architecture.adminFunctions} />
            <div className="flex flex-wrap gap-2">
              <StatusChip
                tone={doc.architecture.upgradeability === "immutable" ? "success" : "neutral"}
              >
                {optionLabel(UPGRADEABILITY_OPTIONS, doc.architecture.upgradeability)}
              </StatusChip>
              <StatusChip tone={doc.worstCase === "nothing_serious" ? "neutral" : "warning"}>
                <span className="text-ink-400">Worst case</span>{" "}
                {optionLabel(WORST_CASE_OPTIONS, doc.worstCase)}
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
                  <span className="text-ink-400">{label}</span> {STATUS_DECL_LABELS[decl.status]}
                  {decl.note ? ` (${decl.note})` : ""}
                </StatusChip>
              );
            })}
          </div>
        </Section>

        {(deploys || txCount !== null || github || contractChecks) && (
          <Section title="Verified signals">
            <p className="text-sm text-ink-500">
              Read from the chain and public sources, not self-reported.
              {doc.verifyWallet && " Wallet declared by the team."}
            </p>
            <div className="space-y-3">
              {deploys && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-ink-500">
                    Factory deploys by {doc.verifyWallet?.slice(0, 10)}… ({deploys.totalCount})
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
                            {check.name ?? `${check.address.slice(0, 10)}…`}{" "}
                            {check.verified ? "(verified source)" : "(unverified)"}
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
                    {github.repo}, {commitsLast30Days} commits in the last 30 days
                    {github.pushedAt
                      ? ` · last push ${new Date(github.pushedAt).toLocaleDateString("en-US")}`
                      : ""}
                  </a>
                </StatusChip>
              )}
            </div>
          </Section>
        )}

        {launchedTokens.length > 0 && (
          <Section title="Launched from this project">
            <ul className="space-y-3">
              {launchedTokens.map((t) => (
                <li key={t.address} className="text-sm">
                  <a
                    href={`/launch/t/${t.address}`}
                    className="break-all font-mono text-electric-300 transition-colors hover:text-electric-200"
                  >
                    {t.address}
                  </a>{" "}
                  <span className="text-ink-500">
                    · {new Date(t.at).toLocaleDateString("en-US")}
                  </span>
                  {t.curve ? (
                    <CurveProgress
                      className="mt-2 max-w-sm"
                      raisedWei={t.curve.raisedWei}
                      thresholdWei={t.curve.thresholdWei}
                      graduated={t.curve.graduated}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
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
