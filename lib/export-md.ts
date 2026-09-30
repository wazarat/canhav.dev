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
  AUDIENCE_OPTIONS,
  PERSONA_COPY,
  type PersonaRowSpec,
  PROJECT_SECURITY_FIELDS,
  RATIONALE_WHY_OPTIONS,
  RELEASE_TYPE_OPTIONS,
  REPORTING_OPTIONS,
  ROBINHOOD_MYTH,
  STAGE_OPTIONS,
  STATUS_DECL_LABELS,
  UNDERSUBSCRIPTION_OPTIONS,
  UPGRADEABILITY_OPTIONS,
  WORST_CASE_OPTIONS,
  optionLabel,
  personaRows,
  sectorLabels,
  subsectorLabels,
} from "@/content/ideation";
import {
  ENVIRONMENT_COPY,
  CHECKLIST_COPY,
  FAMILY_LABELS,
  FLAG_COPY,
  KIND_LABELS,
  PRIORITY_LABELS,
  REVIEW_VERDICT_LABELS,
  STEP_LABELS_KIT,
  shapeLabel,
  shapeLabels,
  startingPointLabel,
} from "@/content/kits/copy";
import { LAUNCH_CHAIN } from "@/content/launch";
import { TOKEN_STEPS_COPY, TOKEN_STEP_LABELS } from "@/content/token-steps";
import type { TokenBuildRow } from "@/lib/token-steps";
import { type PackResourceView, buildResourcePack } from "@/lib/kit-pack";
import { KIT_PRIORITY_ORDER, type ProductShape } from "@/lib/kits";
import {
  type ProjectDoc,
  type StatusDecl,
  type TokenDesignDoc,
  docAudience,
  filledConsumerPersonas,
  filledPersonas,
  isSaleEvent,
  vestedCohorts,
} from "@/lib/ideation";
import {
  DEPLOYABILITY_COPY,
  DEPLOYABILITY_TIER_LABELS,
} from "@/content/ideation-resources";
import {
  type DerivedTokenomics,
  deployabilityFindings,
  deriveTokenomics,
} from "@/lib/tokenDesign";

/**
 * Pure markdown builders for the export downloads. Complete by contract:
 * every answered question, every computed output, every fired warning —
 * nothing withheld. All math comes from lib/tokenDesign.ts; all labels from
 * content/ideation.ts. No DB, no fetch.
 */

const COHORT_LABELS = { team: "Team", investors: "Investors", advisors: "Advisors" } as const;

/** Drafts can be exported, so empty answers must read as unset, not vanish. */
function orNotSet(text: string): string {
  return text.trim() ? text : "Not set";
}

/** Optional answers. An unanswered one is left out of the export. */
function payerLine(doc: ProjectDoc): string {
  if (doc.payer === "user") return "The user pays.";
  if (doc.payer === "third_party") return doc.whoPays.trim() || "Someone else pays.";
  return "";
}

/** One persona table, rows from the spec, selects shown as their option label. */
function personaTable<T extends { [K in keyof T]: string }>(
  rows: ReadonlyArray<PersonaRowSpec<keyof T & string>>,
  personas: readonly T[],
): string[] {
  const cell = (v: string) => v.trim().replace(/\|/g, "/") || " ";
  const shown = (row: PersonaRowSpec<keyof T & string>, p: T) => {
    const raw = (p[row.key] as string).trim();
    return row.kind === "select" && raw ? (row.options?.find((o) => o.value === raw)?.label ?? raw) : raw;
  };
  return [
    `| | ${personas.map((_, i) => PERSONA_COPY.column(i + 1)).join(" | ")} |`,
    `|---|${personas.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.label} | ${personas.map((p) => cell(shown(row, p))).join(" | ")} |`),
  ];
}

/** The customer block: audience, persona table, earlier free text, payer, chain. Empty answers drop. */
function customerLines(doc: ProjectDoc): string[] {
  const out: string[] = [];
  const audience = docAudience(doc);
  const table =
    audience === "b2c"
      ? personaTable(personaRows("b2c"), filledConsumerPersonas(doc))
      : audience === "b2b"
        ? personaTable(personaRows("b2b"), filledPersonas(doc))
        : [];
  if (table.length > 2) {
    out.push(`**Who the user is**`, "");
    if (audience) out.push(`**Who you sell to:** ${optionLabel(AUDIENCE_OPTIONS, audience)}`, "");
    out.push(...table, "");
    if (doc.userIs.trim()) out.push(doc.userIs, "");
  } else if (doc.userIs.trim()) {
    out.push(`**Who the user is:** ${doc.userIs}`, "");
  }
  const payer = payerLine(doc);
  if (payer) out.push(`**Who pays:** ${payer}`, "");
  if (doc.whyThisChain.trim()) out.push(`**Why this chain:** ${doc.whyThisChain}`, "");
  return out;
}

function externalDepsLine(a: ProjectDoc["architecture"]): string {
  if (a.externalDepsNone) return "None";
  if (a.externalDeps.length === 0) return "Not set";
  return a.externalDeps.map((d) => (d.url ? `[${d.name}](${d.url})` : d.name)).join(", ");
}

function oraclesLine(a: ProjectDoc["architecture"]): string {
  return a.oracleUse === "none" ? "None" : a.oracles;
}

function decl(label: string, d: StatusDecl): string {
  const status = STATUS_DECL_LABELS[d.status] ?? "Not set";
  return `- **${label}:** ${status}${d.note ? ` (${d.note})` : ""}`;
}

function fmtPct(n: number): string {
  return `${n % 1 === 0 ? n : n.toFixed(1)}%`;
}

function fmtRatio(n: number | null): string {
  if (n === null) return "n/a (zero float)";
  return `${n % 1 === 0 ? n : n.toFixed(1)}×`;
}

/** "Building" and "Starting from" lines when a research kit has a shape. */
function kitLines(doc: ProjectDoc): string[] {
  const kit = doc.kit;
  if (!kit) return [];
  const out: string[] = [];
  const shapes = shapeLabels(kit);
  if (shapes.length) out.push(`- **Building:** ${shapes.join(", ")}`);
  const start = startingPointLabel(kit);
  if (start) out.push(`- **Starting from:** ${start}`);
  return out;
}

function resourceLine(r: PackResourceView): string {
  const tags = [KIND_LABELS[r.kind], r.familyLabel, ...r.flags.map((f) => FLAG_COPY[f].label)];
  const order = r.readOrder !== undefined ? `${r.readOrder}. ` : "";
  const raw = r.rawUrl && r.rawUrl !== r.url ? ` Raw: ${r.rawUrl}` : "";
  return `- ${order}**[${r.title}](${r.url})** (${tags.join(", ")}). ${r.why}${raw}`;
}

/** "## Resource pack" and "## Where this runs today", or nothing without a shape. */
function resourcePackSections(doc: ProjectDoc, heading: "##" | "###"): string[] {
  const pack = buildResourcePack(doc);
  if (!pack) return [];
  const lines: string[] = [
    "",
    `${heading} Resource pack`,
    "",
    `${pack.counts.selected} of ${pack.counts.total} resources selected by the team for ${pack.shapeLabels.join(", ") || pack.shape}. Core items are numbered in read-first order.`,
  ];
  for (const p of KIT_PRIORITY_ORDER) {
    const items = pack.resources.filter((r) => r.priority === p);
    if (!items.length) continue;
    lines.push("", `${heading}# ${PRIORITY_LABELS[p]}`, "", ...items.map(resourceLine));
  }
  if (pack.checklist.total > 0) {
    lines.push(
      "",
      `${heading} Build steps`,
      "",
      `${pack.checklist.done} of ${pack.checklist.total} done. ${CHECKLIST_COPY.countNote} In order.`,
    );
    const label = (shape: ProductShape) => shapeLabel(shape) ?? shape;
    for (const shape of pack.shapes as ProductShape[]) {
      const groups = pack.checklist.groups.filter((g) => g.shape === shape);
      const above = pack.checklist.groups.filter((g) => g.shape !== shape && g.shapes.includes(shape));
      lines.push("", `${heading}# ${label(shape)}`, "");
      if (groups.length === 0 && above.length > 0) {
        lines.push(CHECKLIST_COPY.sharedAboveLine([...new Set(above.map((g) => label(g.shape)))]));
        continue;
      }
      lines.push(
        ...groups.map((g, n) => {
          const others = g.shapes.filter((x) => x !== shape).map(label);
          const tag = others.length ? ` (${CHECKLIST_COPY.sharedTag(others)})` : "";
          return `${n + 1}. [${g.done ? "x" : " "}] **${g.title}**${tag} (${STEP_LABELS_KIT[g.step]}). ${g.detail}`;
        }),
      );
      if (above.length)
        lines.push("", CHECKLIST_COPY.sharedAboveLine([...new Set(above.map((g) => label(g.shape)))]));
    }
  }
  if (pack.review.passes.length > 0) {
    const p = pack.review.progress;
    lines.push(
      "",
      `${heading} Review passes`,
      "",
      `${p.pass} pass, ${p.fail} fail, ${p.na} not applicable, ${p.open} open of ${p.total}. Run before anything holds value.`,
      "",
      ...pack.review.passes.map(
        (r, n) =>
          `${n + 1}. **${r.title}** [${r.verdict ? REVIEW_VERDICT_LABELS[r.verdict] : "Open"}]. ${r.detail} Defined by ${r.resources.map((x) => `[${x.title}](${x.url})`).join(", ")}.`,
      ),
    );
  }
  if (pack.environment.families.length) {
    lines.push("", `${heading} Where this runs today`, "");
    for (const f of pack.environment.families) {
      lines.push(
        `- **${FAMILY_LABELS[f.family]}.** ${ENVIRONMENT_COPY.testnet}, ${ENVIRONMENT_COPY.status[f.testnet.status].toLowerCase()}. ${f.testnet.note} ${ENVIRONMENT_COPY.mainnet}, ${ENVIRONMENT_COPY.status[f.mainnet.status].toLowerCase()}. ${f.mainnet.note}`,
      );
    }
    lines.push("", ENVIRONMENT_COPY.pathTitle, "");
    const shared = pack.environment.families[0];
    shared.devPath.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    for (const f of pack.environment.families.slice(1)) {
      if (f.devPath.join("\n") === shared.devPath.join("\n")) continue;
      lines.push("", ENVIRONMENT_COPY.pathTitleFor(FAMILY_LABELS[f.family]), "");
      f.devPath.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    }
    if (pack.environment.checkedOn) lines.push("", ENVIRONMENT_COPY.checked(pack.environment.checkedOn));
  }
  return lines;
}

/** RESOURCES.md, the pack on its own for a repo. */
export function buildResourcesMd(doc: ProjectDoc, draft = true): string {
  const pack = buildResourcePack(doc);
  const lines: string[] = [
    `# RESOURCES.md: ${doc.name}`,
    "",
    draft
      ? "Generated from the team's current CanHav draft, not a published snapshot."
      : "Generated from the team's published CanHav record.",
  ];
  if (!pack) {
    lines.push("", "No product shape chosen yet, so no resource pack.");
  } else {
    lines.push("", pack.howToUse, ...resourcePackSections(doc, "##"));
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// canhav-[slug].md — project

export function buildProjectMarkdown(doc: ProjectDoc, publishedAt?: string): string {
  const a = doc.architecture;
  const subsectors = subsectorLabels(doc);
  const lines: string[] = [
    `# ${doc.name}`,
    "",
    `> CanHav project record · /p/${doc.slug} · v${doc.publishVersion}${publishedAt ? ` · published ${publishedAt}` : ""}`,
    "",
    "## The product",
    "",
    `- **Sector:** ${sectorLabels(doc).join(", ") || "Not set"}`,
    ...(subsectors.length ? [`- **Subsector:** ${subsectors.join(", ")}`] : []),
    ...kitLines(doc),
    `- **Stage:** ${optionLabel(STAGE_OPTIONS, doc.stage)}`,
    "",
    `**What it does**`,
    "",
    doc.whatItDoes,
    "",
    ...customerLines(doc),
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
    `- **External dependencies:** ${externalDepsLine(a)}`,
    `- **Oracles:** ${oraclesLine(a)}`,
    `- **Admin functions:** ${a.adminFunctions}`,
    `- **Upgradeability:** ${optionLabel(UPGRADEABILITY_OPTIONS, a.upgradeability)}`,
    `- **Worst thing a bug could do:** ${optionLabel(WORST_CASE_OPTIONS, doc.worstCase)}`,
    "",
    "## Security",
    "",
    ...PROJECT_SECURITY_FIELDS.map(({ key, label }) => decl(label, doc.security[key])),
  ];
  lines.push(...resourcePackSections(doc, "##"));
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

export function buildTokenDesignMarkdown(
  doc: TokenDesignDoc,
  publishedAt?: string,
  /** The token build steps (M46), when the caller has the launch facts. */
  build?: readonly TokenBuildRow[],
): string {
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
    `- **Policy:** ${doc.supply.policy === "fixed" ? "Fixed" : "Inflationary"}${doc.supply.inflationNote ? `. ${doc.supply.inflationNote}` : ""}`,
    "",
    "| Allocation | % of supply |",
    "| --- | ---: |",
    ...ALLOCATION_FIELDS.filter((f) => al[f.key] > 0).map((f) => {
      const label = f.key === "other" && al.otherLabel ? `Other: ${al.otherLabel}` : f.label;
      return `| ${label} | ${al[f.key]}% |`;
    }),
    "",
    "## 3. Vesting and lockups",
    "",
  ];

  if (vestedCohorts(al).length === 0) {
    lines.push("No team, investor, or advisor allocations, so nothing vests.");
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
      `- **Launch liquidity:** ${m.liquidityEth} ETH (${m.ethSource})`,
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

  if (build && build.length) {
    const counted = build.filter((r) => r.state !== "na");
    lines.push(
      "",
      "## 9. Build steps",
      "",
      `${counted.filter((r) => r.state === "done").length} of ${counted.length} done. In order.`,
    );
    for (const phase of ["design", "launch"] as const) {
      lines.push("", `### ${TOKEN_STEPS_COPY.phases[phase]}`, "");
      build
        .filter((r) => r.step.phase === phase)
        .forEach((r, n) => {
          const tag = r.state === "na" ? ` (${TOKEN_STEPS_COPY.naTag})` : r.computed ? ` (${TOKEN_STEPS_COPY.computedTag})` : "";
          lines.push(
            `${n + 1}. [${r.state === "done" ? "x" : " "}] **${r.step.title}**${tag} (${TOKEN_STEP_LABELS[r.step.step]}). ${r.step.detail}`,
          );
        });
    }
  }

  lines.push("", ...deployabilitySection(doc));
  lines.push("", ...computedSection(d), "");
  return lines.join("\n");
}

/** The same three-tier classification the editor and public page show. */
function deployabilitySection(doc: TokenDesignDoc): string[] {
  const findings = deployabilityFindings(doc);
  const lines = ["## Deployability against the CanHav contract suite", ""];
  if (findings.length === 0) {
    lines.push("Nothing beyond the factory launch transaction.");
    return lines;
  }
  for (const tier of ["custom", "stated", "canhav"] as const) {
    const inTier = findings.filter((code) => DEPLOYABILITY_COPY[code].tier === tier);
    if (inTier.length === 0) continue;
    lines.push(`### ${DEPLOYABILITY_TIER_LABELS[tier]}`, "");
    for (const code of inTier) lines.push(`- ${DEPLOYABILITY_COPY[code].text}`);
    lines.push("");
  }
  while (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function computedSection(d: DerivedTokenomics): string[] {
  const lines = [
    "## Computed from the design",
    "",
    "Derived, never asked; recomputed from the inputs above.",
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

/** The subset of a curve row the Market line needs. */
export interface AgentsCurve {
  graduated: boolean;
  raisedWei: string;
  thresholdWei: string;
  poolId: string | null;
}

function marketLine(c: AgentsCurve): string {
  if (c.graduated)
    return `Market: graduated to LaunchAMM pool #${c.poolId ?? "?"}, liquidity locked forever in the curve launcher.`;
  const raised = formatEth(c.raisedWei);
  const threshold = formatEth(c.thresholdWei);
  const pct = BigInt(c.thresholdWei) === 0n ? 0 : Number((BigInt(c.raisedWei) * 10_000n) / BigInt(c.thresholdWei)) / 100;
  return `Market: on the bonding curve, ${raised} of ${threshold} ETH raised toward graduation (${pct}%).`;
}

function formatEth(wei: string): string {
  const w = BigInt(wei);
  const whole = w / 10n ** 18n;
  const frac = (w % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 6)}` : whole.toString();
}

export function buildAgentsMd(input: {
  project?: ProjectDoc;
  token?: TokenDesignDoc;
  deployedAddress?: string | null;
  /** The token's bonding curve, when it was launched through the launcher. */
  curve?: AgentsCurve | null;
  /** True when built from the current draft rather than a published snapshot. */
  draft?: boolean;
}): string {
  const { project, token } = input;
  const name = project?.name ?? token?.name ?? "CanHav record";
  const lines: string[] = [
    `# AGENTS.md: ${name}`,
    "",
    "Context for AI coding assistants working on this project. Generated from",
    input.draft
      ? "the team's current CanHav draft, not a published snapshot; constraints"
      : "the team's published CanHav record(s); constraints below are the team's",
    input.draft ? "below are the team's own stated design." : "own stated design.",
    "",
    "## Chain",
    "",
    `- Network: ${LAUNCH_CHAIN.name} (chain id ${LAUNCH_CHAIN.chainId})`,
    `- Explorer: ${LAUNCH_CHAIN.explorerUrl}`,
    `- CanHav token factory (v4): ${LAUNCH_CHAIN.factoryAddress}`,
    `- CanHav curve launcher: ${LAUNCH_CHAIN.curveAddress}`,
    `- CanHav AMM: ${LAUNCH_CHAIN.ammAddress}`,
  ];

  if (project) {
    const a = project.architecture;
    const subsectors = subsectorLabels(project);
    lines.push(
      "",
      "## Product",
      "",
      `- **Sector:** ${sectorLabels(project).join(", ") || "Not set"}`,
      ...(subsectors.length ? [`- **Subsector:** ${subsectors.join(", ")}`] : []),
      ...kitLines(project),
      `- **Stage:** ${optionLabel(STAGE_OPTIONS, project.stage)}`,
      `- **What it does:** ${orNotSet(project.whatItDoes)}`,
      "",
      "## Contract architecture",
      "",
      `- **Contracts:** ${orNotSet(a.contracts)}`,
      `- **External dependencies:** ${externalDepsLine(a)}`,
      `- **Oracles:** ${orNotSet(oraclesLine(a))}`,
      `- **Admin functions (and why):** ${orNotSet(a.adminFunctions)}`,
      `- **Upgradeability:** ${optionLabel(UPGRADEABILITY_OPTIONS, a.upgradeability)}`,
      `- **Worst-case bug impact:** ${optionLabel(WORST_CASE_OPTIONS, project.worstCase)}`,
      "",
      "Treat the worst-case answer as the review bar: changes touching value",
      "flows deserve scrutiny proportional to it.",
    );
    if (project.githubRepo) lines.push("", `Repository: https://github.com/${project.githubRepo}`);
    lines.push(...resourcePackSections(project, "##"));
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
      ...(input.deployedAddress && input.curve ? ["", marketLine(input.curve)] : []),
      "",
      "### Design constraints (testable assertions)",
      "",
      `- totalSupply == ${token.supply.total}`,
      `- supply policy: ${token.supply.policy === "fixed" ? "fixed (factory mints once; no mint function exists)" : "inflationary per the team's own contracts; the factory token itself cannot mint"}`,
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
      "market plans) is a published commitment: snapshotted and",
      "tamper-evident on CanHav, but not enforced by the contract.",
    );
  }

  lines.push("");
  return lines.join("\n");
}
