import { CANVAS_BLOCKS, type Canvas, canvasFilled } from "@/lib/canvas";
import { PROFILE_KEYS, VALUE_AREAS, unanswered } from "@/lib/value-canvas";
import type { Icp } from "@/lib/icp";
import type { Competitors } from "@/lib/competitors/record";
import { googleFontsUrl } from "@/content/brand-fonts";
import { briefSummary } from "@/lib/draft/briefs";
import { DRAFT_KIND_FIELDS, draftPromptName, draftWriteHint, openRequests } from "@/lib/draft/requests";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { agentRequestHowTo, openAgentRequests } from "@/lib/agent-requests";
import { type ProjectChain, chainInfo, chainIsBeta, projectChainOf } from "@/lib/chains";
import { LAUNCH_TARGET_COPY, LAUNCH_TARGET_INFO, launchTargetLabel } from "@/content/launch-targets";
import { type LaunchTarget, launchTargetOf } from "@/lib/launch-targets";
import { mainnetView } from "@/lib/mainnet-view";
import {
  AUDIT_LABELS,
  CHAIN_DEPLOYMENT_COPY,
  COMPLEXITY_LABELS,
  LICENSE_CLASS_LABELS,
  TEMPLATE_COPY,
  TEMPLATE_KIND_LABELS,
} from "@/content/templates/copy";
import {
  CHAIN_COPY,
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
  MARKET_TIMING_OPTIONS,
  AUDIENCE_OPTIONS,
  PERSONA_COPY,
  type PersonaRowSpec,
  PROJECT_SECURITY_FIELDS,
  RATIONALE_WHY_OPTIONS,
  RELEASE_TYPE_OPTIONS,
  REPORTING_OPTIONS,
  REFERENCES_COPY,
  ROBINHOOD_MYTH,
  STAGE_OPTIONS,
  UNDERSUBSCRIPTION_OPTIONS,
  optionLabel,
  personaRows,
  sectorLabels,
  subsectorLabels,
  MAINNET_COPY,
  TESTNET_COPY,
  STATUS_DECL_LABELS,
  FIELD_STATE_COPY,
  FIRST_HUNDRED_LABEL,
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
  KIT_COPY,
} from "@/content/kits/copy";
import { launchChain } from "@/content/launch";
import { deployerEnvFile, DEPLOYER_ENV, deployerHint, deployerView } from "@/lib/deployer";
import { TOKEN_STEPS_COPY, TOKEN_STEP_LABELS } from "@/content/token-steps";
import type { TokenBuildRow } from "@/lib/token-steps";
import { type PackResourceView, buildResourcePack } from "@/lib/kit-pack";
import { KIT_PRIORITY_ORDER, type ProductShape } from "@/lib/kits";
import {
  type ProjectDoc,
  referenceIsLink,
  type TokenDesignDoc,
  docAudience,
  filledConsumerPersonas,
  filledPersonas,
  isSaleEvent,
  vestedCohorts,
  testnetContractRows,
  type StatusDecl,
} from "@/lib/ideation";
import { fieldText, openFieldLines } from "@/lib/project-fields";
import { tokenDesignOpenSections } from "@/lib/token-design-steps";
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

/**
 * The contracts as markdown (M153): one line per row, the name in bold then
 * why it exists; the earlier free text answer as a paragraph; else the
 * field's state in words (None yet, Not stated, Not applicable).
 */
/** The admin functions as markdown (M154): one line per row with the contract and holder, the explicit None, the legacy paragraph, or the state. */
function adminFunctionLines(doc: ProjectDoc, label: string): string[] {
  const a = doc.architecture;
  if (a.adminFunctions.length)
    return [
      `- **${label}:**`,
      ...a.adminFunctions.map((f) => {
        const tail = [f.contract ? `on ${f.contract}` : "", f.holder ? `held by ${f.holder}` : ""].filter(Boolean).join(", ");
        return `  - **${f.name}.** ${f.why}${tail ? ` (${tail})` : ""}`;
      }),
    ];
  if (a.adminFunctionsLegacy?.trim() && !a.adminFunctionsNone) return [`- **${label}:** ${a.adminFunctionsLegacy.trim()}`];
  return [`- **${label}:** ${fieldText(doc, "adminFunctions")}`];
}

function contractsLines(doc: ProjectDoc): string[] {
  const a = doc.architecture;
  if (a.contracts.length) return [`- **Contracts:**`, ...a.contracts.map((c) => `  - **${c.name}.** ${c.why}`)];
  if (a.contractsLegacy?.trim()) return [`- **Contracts:** ${a.contractsLegacy.trim()}`];
  return [`- **Contracts:** ${fieldText(doc, "contracts")}`];
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



/** One status declaration line; an empty status reads as not stated (M130). */
function decl(label: string, d: StatusDecl): string {
  const status = d.status ? STATUS_DECL_LABELS[d.status] : FIELD_STATE_COPY.notStated;
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
  out.push(`- **Chain:** ${chainInfo(projectChainOf(doc)).name}`);
  // A beta chain says what is still in progress there (M148), so the agent does not promise a path that does not exist.
  if (chainIsBeta(projectChainOf(doc))) out.push(`- **Chain note:** ${CHAIN_COPY.betaNote(chainInfo(projectChainOf(doc)).name)}`);
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
function resourcePackSections(
  doc: ProjectDoc,
  heading: "##" | "###",
  /** The linked design's venue (M69), when the caller has the design. */
  launchTarget: LaunchTarget | null = null,
): string[] {
  const pack = buildResourcePack(doc, { launchTarget });
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
      `${pack.checklist.done} of ${pack.checklist.total} done. ${CHECKLIST_COPY.countNote} A step marked na does not apply and leaves the count. In order.`,
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
          // A step the team added has no editor step, so it carries its own tag (M50).
          const where = g.custom ? CHECKLIST_COPY.customTag : STEP_LABELS_KIT[g.step];
          const evidence = g.evidence ? `\n   ${CHECKLIST_COPY.evidence}. ${g.evidence}` : "";
          if (g.state === "na")
            return `${n + 1}. [na] ~~**${g.title}**~~${tag} (${where}). ${CHECKLIST_COPY.naBecause(g.reason ?? "")}`;
          return `${n + 1}. [${g.done ? "x" : " "}] **${g.title}**${tag} (${where})${g.detail ? `. ${g.detail}` : ""}${evidence}`;
        }),
      );
      if (above.length)
        lines.push("", CHECKLIST_COPY.sharedAboveLine([...new Set(above.map((g) => label(g.shape)))]));
    }
  }
  if (pack.ideas.items.length > 0) {
    lines.push("", `${heading} ${KIT_COPY.examplesTitle}`, "", KIT_COPY.ideasExport(pack.ideas.count), "");
    for (const i of pack.ideas.items)
      lines.push(
        `- [${i.on ? "x" : " "}] ${i.text} (${shapeLabel(i.shape) ?? i.shape}${i.own ? `, ${(i.from ? KIT_COPY.ideaEdited : KIT_COPY.ideaOwn).toLowerCase()}` : ""})`,
      );
  }
  if (pack.templateGaps.length > 0) {
    lines.push("", `${heading} ${TEMPLATE_COPY.gapsTitle}`, "");
    for (const g of pack.templateGaps) lines.push(`- **${g.label}.** ${TEMPLATE_COPY.noneOnChainNote(g.mainnet)}. ${g.plan}`);
  }
  if (pack.features.total > 0) {
    lines.push("", `${heading} Features`, "", CHECKLIST_COPY.featuresExport(pack.features.on, pack.features.total), "");
    for (const f of pack.features.items)
      lines.push(`- [${f.on ? "x" : " "}] **${f.title}** (${shapeLabel(f.shape) ?? f.shape}). ${f.detail}`);
  }
  if (pack.templates.items.length > 0) {
    lines.push("", `${heading} Contract templates`, "", TEMPLATE_COPY.exportIntro(pack.templates.counts));
    const chainName = chainInfo(pack.chain.key).mainnetName;
    for (const state of ["accepted", "open", "rejected"] as const) {
      const items = pack.templates.items.filter((t) => t.decision === state);
      if (!items.length) continue;
      lines.push("", `${heading}# ${TEMPLATE_COPY.state[state]}`, "");
      for (const t of items) {
        const bits = [
          TEMPLATE_KIND_LABELS[t.kind],
          LICENSE_CLASS_LABELS[t.licenseClass].toLowerCase(),
          AUDIT_LABELS[t.audited].toLowerCase(),
          COMPLEXITY_LABELS[t.complexity].toLowerCase(),
        ];
        const where = CHAIN_DEPLOYMENT_COPY[t.onChain.status].label(chainName);
        const steps = t.steps.map((k) => pack.checklist.groups.find((g) => g.key === k)?.title).filter(Boolean);
        lines.push(
          `- **[${t.name}](${t.repoUrl})** (${t.provider}). ${bits.join(", ")}. ${where}. ${t.description}` +
            (t.docsUrl ? ` [Docs](${t.docsUrl}).` : "") +
            (t.ponsFit ? ` ${TEMPLATE_COPY.ponsFit}. ${t.ponsFit}` : "") +
            (steps.length ? ` Steps. ${steps.join("; ")}.` : ""),
        );
      }
    }
  }
  if (pack.launchTarget) {
    const lt = pack.launchTarget;
    lines.push("", `${heading} ${LAUNCH_TARGET_COPY.packTitle}`, "", lt.note);
    if (lt.target !== "canhav_curve") {
      lines.push("", `${heading}# ${LAUNCH_TARGET_COPY.ponsFitTitle}`, "");
      if (!lt.ponsFitTemplates.length) lines.push(LAUNCH_TARGET_COPY.ponsFitNone);
      for (const t of lt.ponsFitTemplates) lines.push(`- **${t.name}** (${TEMPLATE_COPY.state[t.decision]}). ${t.ponsFit}`);
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
          `${n + 1}. **${r.title}** [${r.verdict ? REVIEW_VERDICT_LABELS[r.verdict] : "Open"}]. ${r.detail} Defined by ${r.resources.map((x) => `[${x.title}](${x.url})`).join(", ")}.${r.evidence ? ` Evidence: ${r.evidence}.` : ""}`, // copy-ok, export text
      ),
    );
  }
  if (pack.environment.families.length) {
    lines.push("", `${heading} Where this runs today`, "");
    for (const f of pack.environment.families) {
      lines.push(
        `- **${FAMILY_LABELS[f.family]}.** ${ENVIRONMENT_COPY.testnet(f.testnet.chainId)}, ${ENVIRONMENT_COPY.status[f.testnet.status].toLowerCase()}. ${f.testnet.note} ${ENVIRONMENT_COPY.mainnet(f.mainnet.chainId)}, ${ENVIRONMENT_COPY.status[f.mainnet.status].toLowerCase()}. ${f.mainnet.note}`,
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

/** "## Your files", the team's own references (M53), or nothing. Draft exports only, a snapshot never carries them. */
/** The mainnet deployment and the Pons pairing (M70), when recorded. */
function mainnetSections(doc: ProjectDoc, heading: "##" | "###"): string[] {
  const m = mainnetView(doc);
  if (!m) return [];
  const lines = ["", `${heading} ${MAINNET_COPY.exportTitle}`, "", MAINNET_COPY.chainLine(m.chainName, m.chainId), ""];
  for (const c of m.contracts) lines.push(`- **${c.label || "Contract"}:** ${c.address} (${c.url})`);
  if (m.companion) lines.push(`- **Companion contract template:** ${m.companion.name} (${m.companion.id})${m.companion.ponsFit ? `. ${m.companion.ponsFit}` : ""}`);
  if (m.pons) lines.push(`- **Pons token:** ${m.pons.tokenAddress} (${m.pons.tokenUrl})`, `- **Creator fee recipient:** ${m.pons.feeRecipient} (${m.pons.feeUrl})`);
  if (m.pair) {
    lines.push(`- **Trading pair:** ${m.pair.venueLabel}, quote ${m.pair.quoteAsset} (${m.pair.url})`);
    if (m.pair.pairAddress) lines.push(`- **Pair address:** ${m.pair.pairAddress} (${m.pair.pairUrl})`);
  }
  return lines;
}

function referenceSections(doc: ProjectDoc): string[] {
  const refs = (doc.references ?? []).filter((r) => r.title.trim() && r.location.trim());
  if (!refs.length) return [];
  return [
    "",
    `## ${REFERENCES_COPY.exportTitle}`,
    "",
    REFERENCES_COPY.exportIntro,
    "",
    ...refs.map((r) => {
      const where = referenceIsLink(r) ? `[${r.title}](${r.location.trim()})` : `${r.title}, \`${r.location.trim()}\``;
      const evidence = r.evidence?.trim() ? ` Evidence \`${r.evidence.trim()}\`.` : "";
      return `- **${where}**${r.note.trim() ? `. ${r.note.trim()}` : ""}${evidence}`;
    }),
  ];
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
  lines.push(...referenceSections(doc));
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// canhav-[slug].md — project

/** "## Ideal customers", the profiles (M114), or nothing. */
function icpLines(icp: Icp[] | undefined): string[] {
  if (!icp?.length) return [];
  const F = STUDIO_PLUS_COPY.icp.fields;
  const lines = ["## Ideal customers", ""];
  icp.forEach((p, i) => {
    lines.push(`**${p.name || `Profile ${i + 1}`}.** ${p.summary}`, "");
    const facts = [
      p.walletsTheyUse.length ? `- **${F.walletsTheyUse.label}:** ${p.walletsTheyUse.join(", ")}` : null,
      p.channels.length ? `- **${F.channels.label}:** ${p.channels.join(", ")}` : null,
      p.protocolsTheyUse.length ? `- **${F.protocolsTheyUse.label}:** ${p.protocolsTheyUse.join(", ")}` : null,
      p.buyingTrigger ? `- **${F.buyingTrigger.label}:** ${p.buyingTrigger}` : null,
      p.objection ? `- **${F.objection.label}:** ${p.objection}` : null,
    ].filter((l): l is string => Boolean(l));
    if (facts.length) lines.push(...facts, "");
  });
  return lines;
}

/** The brand kit as one JSON file (M118), the same object the agent reads in AGENTS.md. */
export function brandFile(doc: ProjectDoc, ticker: string | null) {
  const b = doc.brand ?? null;
  return {
    name: doc.name,
    ticker,
    logo: doc.logo ?? null,
    tagline: b?.tagline ?? null,
    palette: b?.palette ?? null,
    fonts: b?.fonts ?? null,
    fontsUrl: b ? googleFontsUrl(b.fonts.display, b.fonts.body) : null,
    tone: b?.tone ?? [],
    banners: b ? { x: "/api/ideation/projects/<id>/brand/banner?kind=x", og: "/api/ideation/projects/<id>/brand/banner?kind=og", square: "/api/ideation/projects/<id>/brand/banner?kind=square" } : null,
  };
}

/** "## Brand" in AGENTS.md (M118), or nothing. */
function brandLines(doc: ProjectDoc, ticker: string | null): string[] {
  const b = doc.brand;
  if (!b) return [];
  return [
    "",
    "## Brand",
    "",
    `- **Palette:** primary ${b.palette.primary}, secondary ${b.palette.secondary}, accent ${b.palette.accent}, surface ${b.palette.surface}`,
    `- **Fonts:** ${b.fonts.display} for display, ${b.fonts.body} for body (${googleFontsUrl(b.fonts.display, b.fonts.body)})`,
    ...(b.tone.length ? [`- **Tone:** ${b.tone.join(", ")}`] : []),
    ...(b.tagline ? [`- **Tagline:** ${b.tagline}`] : []),
    ...(ticker ? [`- **Ticker:** ${ticker}`] : []),
    ...(doc.logo ? [`- **Logo:** ${doc.logo}`] : []),
    "",
    "The same kit is one file, brand.json, on the project export (?file=brand). Use these colours and fonts in anything you build for the product.",
  ];
}

/** "## Positioning", the differentiator line (M115), or nothing. The landscape itself is read live with get_competitors. */
function positioningLines(c: Competitors | undefined): string[] {
  if (!c?.differentiator) return [];
  return ["## Positioning", "", c.differentiator, ""];
}

/** "## Business model", the nine canvas blocks (M113), or nothing. */
/** The value proposition canvas per profile (M157): each area as a list, the fit line, under "## Value proposition". */
function valueCanvasLines(doc: Pick<ProjectDoc, "valueCanvas" | "icp">): string[] {
  const all = doc.valueCanvas;
  if (!all) return [];
  const V = STUDIO_PLUS_COPY.valueCanvas;
  const lines = ["## Value proposition", ""];
  for (const key of PROFILE_KEYS) {
    const c = all[key];
    if (!c) continue;
    const who = doc.icp?.[Number(key)]?.name?.trim() || V.profile(Number(key) + 1);
    lines.push(`### ${V.forProfile(who)}`, "");
    for (const a of VALUE_AREAS) {
      if (!c[a].length) continue;
      lines.push(`**${V.areas[a].label}.**`, ...c[a].map((i) => `- ${i.text}`), "");
    }
    const pains = unanswered(c, "pains").length;
    const gains = unanswered(c, "gains").length;
    lines.push(pains || gains ? [pains ? V.unansweredPains(pains) : "", gains ? V.unansweredGains(gains) : ""].filter(Boolean).join(" ") : V.allAnswered, "");
  }
  return lines;
}

function canvasLines(canvas: Canvas | undefined): string[] {
  if (!canvas || canvasFilled(canvas) === 0) return [];
  // Each block as a list of its items (M155).
  const lines = ["## Business model", ""];
  for (const b of CANVAS_BLOCKS) {
    const items = canvas[b];
    if (!items?.length) continue;
    lines.push(`**${STUDIO_PLUS_COPY.canvas.blocks[b].label}.**`, ...items.map((i) => `- ${i.text}`), "");
  }
  return lines;
}

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
    ...icpLines(doc.icp),
    ...canvasLines(doc.canvas),
    ...valueCanvasLines(doc),
    ...positioningLines(doc.competitors),
    "## Distribution reality",
    "",
    // The acknowledgement is about Robinhood Chain, so only a project there carries it (M52).
    ...(projectChainOf(doc) === "robinhood_testnet"
      ? [`Acknowledged by the team: ${ROBINHOOD_MYTH.body} ${ROBINHOOD_MYTH.followUp}`, ""]
      : []),
    `**${FIRST_HUNDRED_LABEL}**`,
    "",
    fieldText(doc, "firstHundredUsers"),
    "",
    "## Contract architecture",
    "",
    ...contractsLines(doc),
    `- **External dependencies:** ${a.externalDeps.length ? externalDepsLine(a) : fieldText(doc, "externalDeps")}`,
    `- **Oracles:** ${fieldText(doc, "oracles")}`,
    ...adminFunctionLines(doc, "Admin functions"),
    `- **Upgradeability:** ${fieldText(doc, "upgradeability")}`,
    `- **Worst thing a bug could do:** ${fieldText(doc, "worstCase")}`,
    "",
    "## Security",
    "",
    ...PROJECT_SECURITY_FIELDS.map(({ key, label }) => `- **${label}:** ${fieldText(doc, key)}`),
  ];
  lines.push(...resourcePackSections(doc, "##"));
  if (doc.githubRepo || doc.website || doc.testnetContracts?.length || doc.addressBook || doc.verifyWallet || doc.deployer) {
    lines.push("", "## Declared pointers", "");
    if (doc.githubRepo) lines.push(`- **GitHub:** https://github.com/${doc.githubRepo}`);
    if (doc.website) lines.push(`- **Website:** ${doc.website}`);
    if (doc.verifyWallet)
      lines.push(`- **Team wallet (declared, unproven):** ${doc.verifyWallet}`);
    if (doc.deployer) lines.push(`- **Deployer address (testnets only):** ${doc.deployer}`);
    for (const c of testnetContractRows(doc))
      lines.push(`- **Testnet contract${c.label ? `, ${c.label}` : ""}:** ${c.address} (${launchChain(projectChainOf(doc)).explorerUrl}/address/${c.address})`);
    if (doc.addressBook) lines.push(`- **${TESTNET_COPY.exportAddressBook}:** ${doc.addressBook}`);
  }
  lines.push(...mainnetSections(doc, "##"));
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
  const venue = launchTargetOf(doc);
  if (venue) lines.push(`- **Launch venue:** ${launchTargetLabel(venue)}`);
  if (doc.market.when === "at_launch" && doc.market.atLaunch) {
    const m = doc.market.atLaunch;
    lines.push(
      `- **Launch liquidity:** ${m.liquidityEth} ETH (${m.ethSource})`,
      `- **LP treatment:** ${m.lp === "locked" && m.lpLockMonths ? `Locked ${m.lpLockMonths} months` : optionLabel(LP_TREATMENT_OPTIONS, m.lp)}`,
      `- **Anti-sniping:** ${optionLabel(ANTI_SNIPING_OPTIONS, m.antiSniping)}`,
    );
  }
  lines.push("", `${LAUNCH_TARGET_COPY.factsTitle}:`, "", ...LAUNCH_TARGET_INFO[venue ?? "canhav_curve"].facts.map((f) => `- ${f}`));

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
    ...(pl.milestones?.length
      ? [
          `- **Milestones:** ${pl.milestones.length}, the launch's commitment when this design is launched on CanHav`,
          ...pl.milestones.map((m, i) => `  ${i + 1}. ${m.date} ${m.title}${m.description ? `. ${m.description}` : ""}`),
        ]
      : []),
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
          const evidence = doc.stepEvidence?.[r.step.id] ? `\n   ${CHECKLIST_COPY.evidence}. ${doc.stepEvidence[r.step.id]}` : "";
          lines.push(
            `${n + 1}. [${r.state === "done" ? "x" : " "}] **${r.step.title}**${tag} (${TOKEN_STEP_LABELS[r.step.step]}). ${r.step.detail}${evidence}`,
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
  /** The chain the token is on. Left out, the project's chain, else Robinhood (M54). */
  chain?: ProjectChain;
}): string {
  const { project, token } = input;
  const net = launchChain(input.chain ?? (project ? projectChainOf(project) : undefined));
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
    `- Network: ${net.name} (chain id ${net.chainId})`,
    `- Explorer: ${net.explorerUrl}`,
    ...(net.live
      ? [
          `- CanHav token factory (v4): ${net.factoryAddress}`,
          `- CanHav curve launcher: ${net.curveAddress}`,
          `- CanHav AMM: ${net.ammAddress}`,
        ]
      : ["- CanHav launch contracts: not deployed on this chain yet, so a token cannot launch here for now."]),
    // A beta chain says what is still in progress there (M148), so the agent does not promise a path that does not exist.
    ...(project && chainIsBeta(projectChainOf(project)) ? [`- Note: ${CHAIN_COPY.betaNote(net.name)}`] : []),
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
      ...icpLines(project.icp),
      ...canvasLines(project.canvas),
      ...valueCanvasLines(project),
      ...positioningLines(project.competitors),
      "## Contract architecture",
      "",
      ...contractsLines(project),
      `- **External dependencies:** ${a.externalDeps.length ? externalDepsLine(a) : fieldText(project, "externalDeps")}`,
      `- **Oracles:** ${fieldText(project, "oracles")}`,
      ...adminFunctionLines(project, "Admin functions (and why)"),
      `- **Upgradeability:** ${fieldText(project, "upgradeability")}`,
      `- **Worst-case bug impact:** ${fieldText(project, "worstCase")}`,
      "",
      "Treat the worst-case answer as the review bar: changes touching value",
      "flows deserve scrutiny proportional to it.",
      "",
      "Before proposing architecture, call get_comparables on this project's MCP server for how protocols in the same subsectors are built and what goes wrong with each design (no metrics or dates on purpose), and read its risks before the security review passes.",
    );
    // Recommended fields the team left open (M130): the agent states each or waives it.
    const open = openFieldLines(project);
    if (open.length) lines.push("", "## Open fields", "", "Recommended fields the team has not stated yet. Each publishes as Not stated until it is filled or marked not applicable.", "", ...open);
    if (project.githubRepo) lines.push("", `Repository: https://github.com/${project.githubRepo}`);
    // The brand kit (M118), when one is set.
    lines.push(...brandLines(project, token?.ticker ?? null));
    // The owner's requests for the agent (M151): make the deployer key, work a step. Each says how.
    const asks = openAgentRequests(project);
    if (asks.length) {
      lines.push("", "## Open requests", "", "The owner asked for these first. Answering each one clears it.", "");
      for (const r of asks) lines.push(`- ${r.kind === "deployer" ? "Deployer key" : `Build step ${r.target}`}, asked ${r.requestedAt.slice(0, 10)}. ${agentRequestHowTo(r.kind, deployerEnvFile(project))}`);
    }
    // Open draft requests (M117): the owner clicked Draft and waits on the agent.
    const requests = openRequests(project);
    if (requests.length) {
      lines.push("", "## Open draft requests", "", "The owner asked for these drafts. Writing each one clears its request.", "");
      for (const r of requests) {
        const brief = briefSummary(r.kind, project.briefs?.[r.kind]);
        lines.push(`- ${DRAFT_KIND_FIELDS[r.kind] ?? r.kind} (${r.kind}${r.target ? `, ${r.target}` : ""}), asked ${r.requestedAt.slice(0, 10)}, prompt ${draftPromptName(r.kind)}. ${draftWriteHint(r.kind, r.target)}${brief ? ` The team's brief, ${brief}` : ""}`);
      }
    }
    // The team's update cadence (Studio+): the agent writes one with set_weekly_update when get_project_status says it is due.
    if (project.updateCadence && project.updateCadence !== "weekly") lines.push("", `Updates: the team posts ${project.updateCadence.replace(/_/g, " ")}. get_project_status says when one is due; write it with set_weekly_update.`); // copy-ok
    // The agent's summary (M104), when one has been written.
    if (project.summary) {
      lines.push("", "## Summary, by the agent", "", `Last written ${project.summary.updatedAt.slice(0, 10)}. Keep it current with set_summary.`, "", "**Built**", "");
      lines.push(...(project.summary.built.length ? project.summary.built.map((l) => `- ${l}`) : ["- Nothing recorded yet."]));
      lines.push("", "**Being built**", "");
      lines.push(...(project.summary.building.length ? project.summary.building.map((l) => `- ${l}`) : ["- Nothing recorded yet."]));
    }
    // The throwaway deployer key (M102): where it lives and where it is funded. The key itself is never exported.
    const deployer = deployerView(project, projectChainOf(project));
    lines.push("", "## Deployer key", "");
    if (deployer) {
      lines.push(
        `- Address: ${deployer.address}`,
        `- The private key is in ${deployer.envFile} as ${DEPLOYER_ENV}. Never paste it anywhere else and never commit it.`,
        ...deployer.chains.map((c) => `- ${c.name} (chain id ${c.chainId}): faucet ${c.faucetUrl}, balance at ${c.explorerUrl}${deployer.address}`),
      );
    } else {
      lines.push(deployerHint(project));
    }
    lines.push(...resourcePackSections(project, "##", token ? launchTargetOf(token) : null));
    lines.push(...mainnetSections(project, "##"));
    lines.push(...referenceSections(project));
  }

  if (token) {
    const d = deriveTokenomics(token);
    const al = token.supply.allocations;
    lines.push(
      "",
      `## Token: ${token.name} ($${token.ticker})`,
      "",
      input.deployedAddress
        ? `Deployed at ${input.deployedAddress} (${net.explorerUrl}/address/${input.deployedAddress}).`
        : "Not deployed yet.",
      ...(input.deployedAddress && input.curve ? ["", marketLine(input.curve)] : []),
      // The editor sections still open (M131); update_linked_token_design fills any field.
      ...(input.draft && tokenDesignOpenSections(token).length
        ? ["", `Open sections in the design: ${tokenDesignOpenSections(token).join(", ")}. Fill any field with update_linked_token_design.`]
        : []),
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
