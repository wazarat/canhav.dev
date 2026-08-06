import {
  ALLOCATION_FIELDS,
  ANTI_SNIPING_OPTIONS,
  COUNSEL_OPTIONS,
  DISTRIBUTION_EVENT_OPTIONS,
  FOUNDER_LEAVES_OPTIONS,
  GOVERNANCE_FACTS,
  GOVERNANCE_FIELDS,
  IDEATION_RESOURCES,
  ISSUANCE_PATH_OPTIONS,
  LP_TREATMENT_OPTIONS,
  MARKET_FACTS,
  MARKET_TIMING_OPTIONS,
  PROJECT_SECURITY_FIELDS,
  RATIONALE_WHY_OPTIONS,
  RELEASE_TYPE_OPTIONS,
  REPORTING_OPTIONS,
  ROBINHOOD_MYTH,
  SECTOR_OPTIONS,
  STAGE_OPTIONS,
  STATUS_DECL_LABELS,
  UNDERSUBSCRIPTION_OPTIONS,
  UPGRADEABILITY_OPTIONS,
  WORST_CASE_OPTIONS,
  optionLabel,
} from "@/content/ideation";
import { LAUNCH_CHAIN } from "@/content/launch";
import {
  type ProjectDoc,
  type StatusDecl,
  type TokenDesignDoc,
  isSaleEvent,
  vestedCohorts,
} from "@/lib/ideation";
import { type DerivedTokenomics, deriveTokenomics } from "@/lib/tokenDesign";

/**
 * Pure markdown builders for the export downloads. Complete by contract:
 * every answered question, every computed output, every fired warning —
 * nothing withheld. All math comes from lib/tokenDesign.ts; all labels from
 * content/ideation.ts. No DB, no fetch.
 */

const COHORT_LABELS = { team: "Team", investors: "Investors", advisors: "Advisors" } as const;

function decl(label: string, d: StatusDecl): string {
  const status = STATUS_DECL_LABELS[d.status] ?? "—";
  return `- **${label}:** ${status}${d.note ? ` — ${d.note}` : ""}`;
}

function fmtPct(n: number): string {
  return `${n % 1 === 0 ? n : n.toFixed(1)}%`;
}

function fmtRatio(n: number | null): string {
  if (n === null) return "— (zero float)";
  return `${n % 1 === 0 ? n : n.toFixed(1)}×`;
}

// ---------------------------------------------------------------------------
// canhav-[slug].md — project

export function buildProjectMarkdown(doc: ProjectDoc, publishedAt?: string): string {
  const sector =
    doc.sector === "other" && doc.sectorOther
      ? doc.sectorOther
      : optionLabel(SECTOR_OPTIONS, doc.sector);
  const a = doc.architecture;
  const lines: string[] = [
    `# ${doc.name}`,
    "",
    `> CanHav project record · /p/${doc.slug} · v${doc.publishVersion}${publishedAt ? ` · published ${publishedAt}` : ""}`,
    "",
    "## The product",
    "",
    `- **Sector:** ${sector}`,
    `- **Stage:** ${optionLabel(STAGE_OPTIONS, doc.stage)}`,
    "",
    `**What it does**`,
    "",
    doc.whatItDoes,
    "",
    `**Who the user is** — ${doc.userIs}`,
    "",
    `**Who pays** — ${doc.whoPays}`,
    "",
    `**Why this chain** — ${doc.whyThisChain}`,
    "",
    "## Distribution reality",
    "",
    `Acknowledged by the team: ${ROBINHOOD_MYTH.body}`,
    "",
    `**${ROBINHOOD_MYTH.followUp}**`,
    "",
    doc.firstHundredUsers,
    "",
    "## Contract architecture",
    "",
    `- **Contracts:** ${a.contracts}`,
    `- **External dependencies:** ${a.externalDeps}`,
    `- **Oracles:** ${a.oracles}`,
    `- **Admin functions:** ${a.adminFunctions}`,
    `- **Upgradeability:** ${optionLabel(UPGRADEABILITY_OPTIONS, a.upgradeability)}`,
    `- **Worst thing a bug could do:** ${optionLabel(WORST_CASE_OPTIONS, doc.worstCase)}`,
    "",
    "## Security",
    "",
    ...PROJECT_SECURITY_FIELDS.map(({ key, label }) => decl(label, doc.security[key])),
  ];
  if (doc.githubRepo || doc.testnetContracts?.length || doc.verifyWallet) {
    lines.push("", "## Declared pointers", "");
    if (doc.githubRepo) lines.push(`- **GitHub:** https://github.com/${doc.githubRepo}`);
    if (doc.verifyWallet)
      lines.push(`- **Team wallet (declared, unproven):** ${doc.verifyWallet}`);
    for (const c of doc.testnetContracts ?? [])
      lines.push(`- **Testnet contract:** ${c} (${LAUNCH_CHAIN.explorerUrl}/address/${c})`);
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// canhav-[slug].md — token design

export function buildTokenDesignMarkdown(doc: TokenDesignDoc, publishedAt?: string): string {
  const d = deriveTokenomics(doc);
  const al = doc.supply.allocations;

  const lines: string[] = [
    `# ${doc.name} ($${doc.ticker})`,
    "",
    `> CanHav token design · /t/${doc.slug} · v${doc.publishVersion}${publishedAt ? ` · published ${publishedAt}` : ""}`,
    "",
    "## 1. Token rationale",
    "",
    `- **Why a token:** ${optionLabel(RATIONALE_WHY_OPTIONS, doc.rationale.why)}`,
    `- **Issuance path:** ${optionLabel(ISSUANCE_PATH_OPTIONS, doc.rationale.path)}`,
    `- **Beyond a database row:** ${doc.rationale.beyondDatabaseRow}`,
    "",
    "## 2. Supply and allocation",
    "",
    `- **Total supply:** ${doc.supply.total.toLocaleString("en-US")}`,
    `- **Policy:** ${doc.supply.policy === "fixed" ? "Fixed" : "Inflationary"}${doc.supply.inflationNote ? ` — ${doc.supply.inflationNote}` : ""}`,
    "",
    "| Allocation | % of supply |",
    "| --- | ---: |",
    ...ALLOCATION_FIELDS.filter((f) => al[f.key] > 0).map((f) => {
      const label = f.key === "other" && al.otherLabel ? `Other — ${al.otherLabel}` : f.label;
      return `| ${label} | ${al[f.key]}% |`;
    }),
    "",
    "## 3. Vesting and lockups",
    "",
  ];

  if (vestedCohorts(al).length === 0) {
    lines.push("No team, investor, or advisor allocations — nothing vests.");
  } else {
    lines.push(
      "| Cohort | Cliff | Total duration |",
      "| --- | ---: | ---: |",
      ...doc.vesting.cohorts.map(
        (c) => `| ${COHORT_LABELS[c.cohort]} | ${c.cliffMonths} mo | ${c.durationMonths} mo |`,
      ),
      "",
      `- **Release type:** ${optionLabel(RELEASE_TYPE_OPTIONS, doc.vesting.release)}`,
      `- **If a founder leaves early:** ${optionLabel(FOUNDER_LEAVES_OPTIONS, doc.vesting.founderLeaves)}`,
    );
  }

  lines.push(
    "",
    "## 4. Distribution",
    "",
    `- **Event:** ${optionLabel(DISTRIBUTION_EVENT_OPTIONS, doc.distribution.event)}`,
  );
  if (isSaleEvent(doc.distribution.event) && doc.distribution.sale) {
    const s = doc.distribution.sale;
    lines.push(
      `- **Price:** ${s.price} ETH`,
      `- **Caps:** ${s.softCap} ETH soft / ${s.hardCap} ETH hard`,
      `- **Per-wallet limit:** ${s.perWalletLimit > 0 ? `${s.perWalletLimit} ETH` : "none"}`,
      `- **Access:** ${s.access === "allowlist" ? "Allowlist" : "Open"}`,
      `- **If undersubscribed:** ${optionLabel(UNDERSUBSCRIPTION_OPTIONS, s.undersubscription)}`,
    );
  }

  lines.push(
    "",
    "## 5. Market",
    "",
    `- **Market at launch:** ${optionLabel(MARKET_TIMING_OPTIONS, doc.market.when)}`,
  );
  if (doc.market.when === "at_launch" && doc.market.atLaunch) {
    const m = doc.market.atLaunch;
    lines.push(
      `- **Launch liquidity:** ${m.liquidityEth} ETH — ${m.ethSource}`,
      `- **LP treatment:** ${m.lp === "locked" && m.lpLockMonths ? `Locked ${m.lpLockMonths} months` : optionLabel(LP_TREATMENT_OPTIONS, m.lp)}`,
      `- **Anti-sniping:** ${optionLabel(ANTI_SNIPING_OPTIONS, m.antiSniping)}`,
    );
  }
  lines.push("", "Platform-fixed facts:", "", ...MARKET_FACTS.map((f) => `- ${f}`));

  lines.push(
    "",
    "## 6. Governance",
    "",
    ...GOVERNANCE_FIELDS.map(({ key, label }) => decl(label, doc.governance[key])),
    "",
    "Guaranteed by the contract (not promises):",
    "",
    ...GOVERNANCE_FACTS.map((f) => `- ${f}`),
    "",
    "## 7. Legal",
    "",
    `- **Counsel:** ${optionLabel(COUNSEL_OPTIONS, doc.legal.counsel)}`,
    "",
    "## 8. Post-launch",
    "",
  );
  const pl = doc.postLaunch;
  const plLines = [
    pl.runwayMonths !== undefined ? `- **Treasury runway:** ${pl.runwayMonths} months` : null,
    pl.reporting ? `- **Reporting cadence:** ${optionLabel(REPORTING_OPTIONS, pl.reporting)}` : null,
    pl.priceCollapsePlan ? `- **If the price collapses:** ${pl.priceCollapsePlan}` : null,
    pl.failureCriteria ? `- **Failure criteria:** ${pl.failureCriteria}` : null,
  ].filter((l): l is string => l !== null);
  lines.push(...(plLines.length ? plLines : ["Not answered (all optional)."]));

  lines.push("", ...computedSection(d), "");
  return lines.join("\n");
}

function computedSection(d: DerivedTokenomics): string[] {
  const lines = [
    "## Computed from the design",
    "",
    "Derived, never asked — recomputed from the inputs above.",
    "",
    `- **Circulating float at launch:** ${fmtPct(d.floatAtLaunchPct)}`,
    `- **Fully-diluted-to-float ratio:** ${fmtRatio(d.fdvToFloat)}`,
    `- **Treasury share:** ${fmtPct(d.treasuryPct)}`,
  ];
  if (d.milestoneUncertain)
    lines.push(
      "- **Note:** milestone-conditional releases cannot be dated; the calendar plots them at the latest possible month.",
    );

  const unlocking = d.unlockCalendar.filter((m) => m.totalPct > 1e-9);
  if (unlocking.length > 0) {
    lines.push(
      "",
      "### Unlock calendar (months since TGE, % of total supply)",
      "",
      "| Month | Total | By cohort |",
      "| ---: | ---: | --- |",
      ...unlocking.map((m) => {
        const by = Object.entries(m.byCohort)
          .map(([c, v]) => `${c} ${fmtPct(v as number)}`)
          .join(", ");
        return `| M${m.month}${d.clusterMonths.includes(m.month) ? " ⚠" : ""} | ${fmtPct(m.totalPct)} | ${by} |`;
      }),
    );
    if (d.clusterMonths.length > 0)
      lines.push("", `⚠ cluster months (multiple cohorts' first unlock): ${d.clusterMonths.map((m) => `M${m}`).join(", ")}`);
  }

  if (d.teamVsInvestors.team || d.teamVsInvestors.investors) {
    lines.push("", "### Team vs investor terms");
    if (d.teamVsInvestors.team)
      lines.push(
        `- Team: ${d.teamVsInvestors.team.cliffMonths} mo cliff · ${d.teamVsInvestors.team.durationMonths} mo total`,
      );
    if (d.teamVsInvestors.investors)
      lines.push(
        `- Investors: ${d.teamVsInvestors.investors.cliffMonths} mo cliff · ${d.teamVsInvestors.investors.durationMonths} mo total`,
      );
    if (d.teamVsInvestors.teamCliffShorter)
      lines.push("- **Flag:** the team's cliff is shorter than the investors'.");
  }

  if (d.warnings.length > 0) {
    lines.push("", "## Warnings that fired", "");
    for (const w of d.warnings) {
      const r = IDEATION_RESOURCES[w];
      lines.push(`### ${r.title}`, "", r.body, "", `_${r.example}_`, "");
    }
  } else {
    lines.push("", "## Warnings that fired", "", "None.");
  }
  return lines;
}

// ---------------------------------------------------------------------------
// AGENTS.md — context for an AI IDE

export function buildAgentsMd(input: {
  project?: ProjectDoc;
  token?: TokenDesignDoc;
  deployedAddress?: string | null;
}): string {
  const { project, token } = input;
  const name = project?.name ?? token?.name ?? "CanHav record";
  const lines: string[] = [
    `# AGENTS.md — ${name}`,
    "",
    "Context for AI coding assistants working on this project. Generated from",
    "the team's published CanHav record(s); constraints below are the team's",
    "own stated design.",
    "",
    "## Chain",
    "",
    `- Network: ${LAUNCH_CHAIN.name} (chain id ${LAUNCH_CHAIN.chainId})`,
    `- Explorer: ${LAUNCH_CHAIN.explorerUrl}`,
    `- CanHav token factory (v4): ${LAUNCH_CHAIN.factoryAddress}`,
  ];

  if (project) {
    const sector =
      project.sector === "other" && project.sectorOther
        ? project.sectorOther
        : optionLabel(SECTOR_OPTIONS, project.sector);
    const a = project.architecture;
    lines.push(
      "",
      "## Product",
      "",
      `- **Sector:** ${sector}`,
      `- **Stage:** ${optionLabel(STAGE_OPTIONS, project.stage)}`,
      `- **What it does:** ${project.whatItDoes}`,
      "",
      "## Contract architecture",
      "",
      `- **Contracts:** ${a.contracts}`,
      `- **External dependencies:** ${a.externalDeps}`,
      `- **Oracles:** ${a.oracles}`,
      `- **Admin functions (and why):** ${a.adminFunctions}`,
      `- **Upgradeability:** ${optionLabel(UPGRADEABILITY_OPTIONS, a.upgradeability)}`,
      `- **Worst-case bug impact:** ${optionLabel(WORST_CASE_OPTIONS, project.worstCase)}`,
      "",
      "Treat the worst-case answer as the review bar: changes touching value",
      "flows deserve scrutiny proportional to it.",
    );
    if (project.githubRepo) lines.push("", `Repository: https://github.com/${project.githubRepo}`);
  }

  if (token) {
    const d = deriveTokenomics(token);
    const al = token.supply.allocations;
    lines.push(
      "",
      `## Token: ${token.name} ($${token.ticker})`,
      "",
      input.deployedAddress
        ? `Deployed at ${input.deployedAddress} (${LAUNCH_CHAIN.explorerUrl}/address/${input.deployedAddress}).`
        : "Not deployed yet.",
      "",
      "### Design constraints (testable assertions)",
      "",
      `- totalSupply == ${token.supply.total}`,
      `- supply policy: ${token.supply.policy === "fixed" ? "fixed (factory mints once; no mint function exists)" : "inflationary per the team's own contracts — the factory token itself cannot mint"}`,
      ...ALLOCATION_FIELDS.filter((f) => al[f.key] > 0).map(
        (f) => `- allocation.${f.key} == ${al[f.key]}% of total supply`,
      ),
      ...token.vesting.cohorts.map(
        (c) =>
          `- vesting.${c.cohort}: cliff == ${c.cliffMonths} months, duration == ${c.durationMonths} months`,
      ),
    );
    if (token.vesting.release)
      lines.push(`- release type: ${optionLabel(RELEASE_TYPE_OPTIONS, token.vesting.release)}`);
    lines.push(
      `- derived float at launch == ${fmtPct(d.floatAtLaunchPct)}`,
      `- derived FDV-to-float == ${fmtRatio(d.fdvToFloat)}`,
    );
    if (d.clusterMonths.length > 0)
      lines.push(
        `- unlock cluster months: ${d.clusterMonths.map((m) => `M${m}`).join(", ")} (multiple cohorts' first unlock)`,
      );
    lines.push(
      "",
      "### Enforced on-chain vs stated",
      "",
      "Enforced by the factory token contract:",
      "",
      ...GOVERNANCE_FACTS.map((f) => `- ${f}`),
      "",
      "Everything else above (allocations, non-team vesting, distribution and",
      "market plans) is a published commitment — snapshotted and",
      "tamper-evident on CanHav, but not enforced by the contract.",
    );
  }

  lines.push("");
  return lines.join("\n");
}
