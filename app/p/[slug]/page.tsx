import { chainInfo, projectChainOf } from "@/lib/chains";
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
  MAINNET_COPY,
  optionLabel,
  sectorLabels,
  subsectorLabels,
  LOGO_COPY,
  TESTNET_COPY,
} from "@/content/ideation";
import { buildProgress } from "@/content/kits/checklists";
import { CHECKLIST_COPY, shapeLabels, startingPointLabel } from "@/content/kits/copy";
import { explorerAddressUrl } from "@/lib/explorer";
import { mainnetView } from "@/lib/mainnet-view";
import { type ProjectDoc, type StatusDecl, docAudience, testnetContractRows } from "@/lib/ideation";
import { getLaunchesByProject, launchRowChain } from "@/lib/launches-db";
import { listUpdates } from "@/lib/updates-db";
import { weekLabel } from "@/lib/updates";
import { getLinkedTokenDesign, getProjectBySlug, getSnapshot, projectVisibleTo } from "@/lib/ideation-db";
import { getSessionUser } from "@/lib/auth";
import { BUILD_COPY } from "@/content/build";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { Card } from "@/components/ui/Card";
import { CANVAS_BLOCKS, canvasFilled } from "@/lib/canvas";
import { brandVars } from "@/lib/brand/record";
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
  // A private project never reaches a search index, link or not (M109).
  if (row.visibility === "private") return { robots: { index: false, follow: false } };
  return {
    description: row.draft_doc.whatItDoes.slice(0, 160),
  };
}

/** Whether this request may open a private project (M109): the share link, or a signed in member. */
async function mayOpen(row: NonNullable<Awaited<ReturnType<typeof getProjectBySlug>>>, share: string | undefined): Promise<boolean> {
  if ((row.visibility ?? "public") === "public") return true;
  if (projectVisibleTo(row, share, null)) return true;
  const user = await getSessionUser();
  return projectVisibleTo(row, share, user?.owner);
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

/** The website chip reads as its host (M78). */
function websiteHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { slug } = await params;
  const { s: share } = await searchParams;
  const row = await getProjectBySlug(slug);
  if (!row || !row.published_hash) notFound();
  if (!(await mayOpen(row, share))) notFound();
  const isPrivate = row.visibility === "private";

  const snapshot = await getSnapshot(row.published_hash);
  if (!snapshot || snapshot.doc.kind !== "project") notFound();
  const doc = snapshot.doc;
  const audience = docAudience(doc);
  const personaCards = audiencePersonaCards(doc);

  const [linked, deploys, txCount, github, contractChecks, projectLaunches] = await Promise.all([
    getLinkedTokenDesign(row.id),
    doc.verifyWallet ? getTokensByCreator(doc.verifyWallet, projectChainOf(doc)) : null,
    doc.verifyWallet ? getWalletTxCount(doc.verifyWallet, projectChainOf(doc)) : null,
    doc.githubRepo ? getGithubActivity(doc.githubRepo) : null,
    doc.testnetContracts
      ? Promise.all(testnetContractRows(doc).map((c) => getBlockscoutVerification(c.address, projectChainOf(doc))))
      : null,
    // Tokens launched from this project through the studio (M19d).
    getLaunchesByProject(row.id),
  ]);
  // The team's published weekly updates (M124), live rows beside the snapshot.
  const updates = await listUpdates(row.id, true);
  const launchedTokens = await Promise.all(
    (projectLaunches ?? []).slice(0, 5).map(async (l) => ({
      address: l.token_address,
      at: l.created_at,
      curve: await getCurve(l.token_address, launchRowChain(l)),
    })),
  );
  const linkedPublished = linked && linked.status === "published" && linked.slug ? linked : null;
  const mainnet = mainnetView(doc);

  const commitsLast30Days = github
    ? github.recentCommits.filter(
        (d) => Date.now() - Date.parse(d) < 30 * 24 * 3600 * 1000,
      ).length
    : 0;

  return (
    <div className="container max-w-4xl py-14 md:py-20" style={brandVars(doc.brand) as React.CSSProperties}>
      <div>
        <p className="kicker">Project</p>
        <h1 className="mt-3 flex items-center gap-4 font-display text-4xl font-semibold tracking-tight text-ink-50">
          {doc.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.logo} alt={LOGO_COPY.alt(doc.name)} className="h-14 w-14 shrink-0 rounded-xl border border-ink-700/60 object-cover" />
          ) : null}
          <span>{doc.name}</span>
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
          {doc.kit && buildProgress(doc.kit).total > 0 ? (
            <StatusChip tone="info">
              {CHECKLIST_COPY.rowChip(buildProgress(doc.kit).done, buildProgress(doc.kit).total)}
            </StatusChip>
          ) : null}
          <StatusChip tone="info">{optionLabel(STAGE_OPTIONS, doc.stage)}</StatusChip>
          <StatusChip tone="neutral">
            v{doc.publishVersion} · {new Date(snapshot.created_at).toLocaleDateString("en-US")}
          </StatusChip>
          {isPrivate ? <StatusChip tone="warning">{BUILD_COPY.publish.visibility.pageChip}</StatusChip> : null}
        </div>
        {doc.brand ? <div aria-hidden className="mt-6 h-0.5 w-24 rounded-full bg-brand-primary" /> : null}
        {doc.brand?.tagline ? <p className="mt-3 text-sm text-ink-300">{doc.brand.tagline}</p> : null}
        <div className="mt-4">
          <ExportButtons kind="p" slug={slug} share={isPrivate && share ? share : undefined} />
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
            {doc.icp?.length ? (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-500">{STUDIO_PLUS_COPY.icp.title}</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {doc.icp.map((p, i) => (
                    <Card key={i} className="p-4">
                      <p className="text-sm font-medium text-ink-50">{p.name || STUDIO_PLUS_COPY.icp.profile(i + 1)}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-200">{p.summary}</p>
                      <dl className="mt-2 space-y-1.5">
                        {(["walletsTheyUse", "channels", "protocolsTheyUse"] as const).filter((k) => p[k].length).map((k) => (
                          <div key={k}>
                            <dt className="text-[11px] text-ink-500">{STUDIO_PLUS_COPY.icp.fields[k].label}</dt>
                            <dd className="text-sm text-ink-200">{p[k].join(", ")}</dd>
                          </div>
                        ))}
                        {p.buyingTrigger ? (
                          <div>
                            <dt className="text-[11px] text-ink-500">{STUDIO_PLUS_COPY.icp.fields.buyingTrigger.label}</dt>
                            <dd className="text-sm text-ink-200">{p.buyingTrigger}</dd>
                          </div>
                        ) : null}
                        {p.objection ? (
                          <div>
                            <dt className="text-[11px] text-ink-500">{STUDIO_PLUS_COPY.icp.fields.objection.label}</dt>
                            <dd className="text-sm text-ink-200">{p.objection}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </Card>
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
            <Prose label="Chain" text={chainInfo(projectChainOf(doc)).name} />
            {doc.whyThisChain.trim() ? (
              <Prose label="Why this chain" text={doc.whyThisChain} />
            ) : null}
            {doc.kit && startingPointLabel(doc.kit) ? (
              <Prose label="Starting from" text={startingPointLabel(doc.kit) ?? ""} />
            ) : null}
          </div>
        </Section>

        {doc.competitors?.differentiator ? (
          <Section title={STUDIO_PLUS_COPY.competitors.title}>
            <Prose label={STUDIO_PLUS_COPY.competitors.differentiator} text={doc.competitors.differentiator} />
          </Section>
        ) : null}

        {doc.canvas && canvasFilled(doc.canvas) > 0 ? (
          <Section title={STUDIO_PLUS_COPY.canvas.title}>
            <div className="grid gap-3 md:grid-cols-2">
              {CANVAS_BLOCKS.filter((b) => doc.canvas?.[b]).map((b) => (
                <Card key={b} className="p-4">
                  <p className="text-[11px] uppercase tracking-wide text-ink-500">{STUDIO_PLUS_COPY.canvas.blocks[b].label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-200">{doc.canvas?.[b]}</p>
                </Card>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="Distribution reality">
          {projectChainOf(doc) === "robinhood_testnet" ? (
            <p className="text-sm leading-relaxed text-ink-400">
              The team has acknowledged this. {ROBINHOOD_MYTH.body}
            </p>
          ) : null}
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
                            href={explorerAddressUrl(check.address, projectChainOf(doc))}
                            target="_blank"
                            rel="noreferrer"
                            className="transition-colors hover:text-ink-50"
                          >
                            {testnetContractRows(doc)[i]?.label ?? check.name ?? `${check.address.slice(0, 10)}…`}{" "}
                            {check.verified ? "(verified source)" : "(unverified)"}
                          </a>
                        </StatusChip>
                      ),
                  )}
                </div>
              )}
              {doc.addressBook && (
                <StatusChip tone="neutral">
                  <a href={doc.addressBook} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink-50">
                    {TESTNET_COPY.exportAddressBook}
                  </a>
                </StatusChip>
              )}
              {doc.website && (
                <StatusChip tone="neutral">
                  <a
                    href={doc.website}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-ink-50"
                  >
                    {websiteHost(doc.website)}
                  </a>
                </StatusChip>
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

        {mainnet && (
          <Section title={MAINNET_COPY.publicTitle}>
            <p className="text-sm text-ink-500">{MAINNET_COPY.publicLead(mainnet.chainName)}</p>
            <ul className="space-y-2">
              {mainnet.contracts.map((c) => (
                <li key={c.address} className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusChip tone="neutral">{c.label || "Contract"}</StatusChip>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-mono text-electric-300 transition-colors hover:text-electric-200"
                  >
                    {c.address}
                  </a>
                </li>
              ))}
            </ul>
            {mainnet.companion ? (
              <p className="text-sm text-ink-300">{MAINNET_COPY.companionLine(mainnet.companion.name)}</p>
            ) : null}
            {mainnet.pons ? (
              <div className="flex flex-wrap gap-2">
                <StatusChip tone="success">
                  <a href={mainnet.pons.tokenUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink-50">
                    {MAINNET_COPY.ponsLine} {mainnet.pons.tokenAddress.slice(0, 6)}…{mainnet.pons.tokenAddress.slice(-4)}
                  </a>
                </StatusChip>
                <StatusChip tone="neutral">
                  <a href={mainnet.pons.feeUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink-50">
                    {MAINNET_COPY.feeLine} {mainnet.pons.feeRecipient.slice(0, 6)}…{mainnet.pons.feeRecipient.slice(-4)}
                  </a>
                </StatusChip>
              </div>
            ) : null}
            {mainnet.pair ? (
              <div className="flex flex-wrap gap-2">
                <StatusChip tone="success">
                  <a href={mainnet.pair.url} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink-50">
                    {MAINNET_COPY.pairLine(mainnet.pair.venueLabel, mainnet.pair.quoteAsset)}
                  </a>
                </StatusChip>
                {mainnet.pair.pairAddress && mainnet.pair.pairUrl ? (
                  <StatusChip tone="neutral">
                    <a href={mainnet.pair.pairUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink-50">
                      {MAINNET_COPY.pairAddressLine} {mainnet.pair.pairAddress.slice(0, 6)}…{mainnet.pair.pairAddress.slice(-4)}
                    </a>
                  </StatusChip>
                ) : null}
              </div>
            ) : null}
          </Section>
        )}

        {updates.length > 0 && (
          <Section title={BUILD_COPY.weekly.publicTitle}>
            <ul className="space-y-4">
              {updates.map((u) => (
                <li key={u.id} className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-ink-500">{weekLabel(u.weekOf)}</p>
                  {u.body.split(/\n{2,}/).map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-ink-200">
                      {para}
                    </p>
                  ))}
                  {u.highlights.length ? <p className="text-xs text-ink-400">{u.highlights.join(" · ")}</p> : null}
                </li>
              ))}
            </ul>
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
