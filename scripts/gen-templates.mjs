#!/usr/bin/env node
/**
 * Contract template catalog generator (M61). Reads
 * content/templates/catalog.json, the research catalog the owner keeps, and
 * writes one TypeScript file per sector under content/templates/. Run with
 *
 *   npm run gen:templates          write the files
 *   npm run check:templates        fail when the files drift from the JSON
 *
 * The generator refuses an unknown enum, a bad id, a non-https URL, an
 * unknown placement, a duplicate id, and an em dash or a colon followed by
 * whitespace in any text field (the copy rule, scripts/check-copy.mjs).
 * Template ids never contain a dot, so they cannot collide with resource ids
 * ("<source>.<slug>") or build step ids ("<shape>.<slug>").
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const SRC = path.join(ROOT, "content/templates/catalog.json");
const OUT = path.join(ROOT, "content/templates");
const CHECK = process.argv.includes("--check");

/** Catalog sector and subsector names to our ids, and the file each sector lands in. */
const SECTORS = {
  Lending: { id: "credit_lending", file: "credit", constName: "CREDIT_TEMPLATES" },
  Liquidity: { id: "liquidity_infra", file: "liquidity", constName: "LIQUIDITY_TEMPLATES" },
  Derivatives: { id: "perps_derivatives", file: "derivatives", constName: "DERIVATIVES_TEMPLATES" },
  Staking: { id: "staking", file: "staking", constName: "STAKING_TEMPLATES" },
  RWA: { id: "rwa_infra", file: "rwa", constName: "RWA_TEMPLATES" },
  Other: { id: "other", file: "other", constName: "OTHER_TEMPLATES" },
};
const PLACEMENTS = {
  "Lending/Lending": "lending",
  "Lending/Leveraged yield": "leveraged_yield",
  "Lending/Fixed income": "fixed_income",
  "Liquidity/Pools": "pools",
  "Liquidity/Vaults": "vaults",
  "Derivatives/Perp DEX": "perp_dex",
  "Derivatives/Option vaults": "option_vaults",
  "Derivatives/Delta neutral": "delta_neutral",
  "Staking/Liquid staking": "liquid_staking",
  "Staking/Restaking": "restaking",
  "Staking/Liquid restaking": "liquid_restaking",
  "RWA/Tokenized securities": "tokenized_securities",
  "RWA/Private credit": "private_credit",
  "RWA/Asset-backed tokens": "asset_backed_tokens",
  "Other/Underwriting": "underwriting",
  "Other/Governance": "governance",
};
/** Table order of subsector ids, the order lib/sectors.ts declares them. */
const SUBSECTOR_ORDER = [
  "lending", "leveraged_yield", "fixed_income",
  "liquid_staking", "restaking", "liquid_restaking",
  "vaults", "pools",
  "perp_dex", "option_vaults", "delta_neutral",
  "tokenized_securities", "private_credit", "asset_backed_tokens",
  "underwriting", "governance",
];
const KIND = { Integrate: "integrate", "Fork and deploy": "fork", "Create via factory": "factory", Library: "library" };
const LICENSE = { Permissive: "permissive", Copyleft: "copyleft", Restricted: "restricted" };
const CHAIN = { Deployed: "deployed", "Not deployed": "not_deployed", Unknown: "unknown" };
const COMPLEXITY = { Low: "low", Medium: "medium", High: "high" };
const STATUS = { Active: "active", Inactive: "inactive" };
const AUDIT = { yes: "yes", no: "no", partial: "partial", unknown: "unknown" };
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const URL_RE = /^https:\/\/\S+$/;
const TEXT_FIELDS = ["name", "provider", "description", "license", "audited", "robinhood_note", "pons_fit", "notes"];

const problems = [];
const fail = (msg) => problems.push(msg);
const pick = (table, value, what, id) => {
  if (!(value in table)) fail(`${id} has unknown ${what} "${value}"`);
  return table[value];
};
const copyOk = (text, field, id) => {
  if (text.includes("—")) fail(`${id} ${field} contains an em dash`);
  if (/:\s/.test(text) || /:$/.test(text.trimEnd())) fail(`${id} ${field} contains a colon the copy rule refuses`);
};

const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
const seen = new Set();
const bySector = Object.fromEntries(Object.values(SECTORS).map((s) => [s.file, []]));

for (const t of data.templates) {
  const id = t.id;
  if (!ID_RE.test(id)) fail(`bad id ${id}`);
  if (seen.has(id)) fail(`duplicate id ${id}`);
  seen.add(id);
  for (const f of TEXT_FIELDS) copyOk(String(t[f] ?? ""), f, id);
  if (!URL_RE.test(t.repo_url)) fail(`${id} repo_url must be https`);
  if (t.docs_url && !URL_RE.test(t.docs_url)) fail(`${id} docs_url must be https`);
  if (!t.placements?.length) fail(`${id} has no placement`);
  const subs = [];
  let homeFile = null;
  for (const p of t.placements) {
    const key = `${p.sector}/${p.subsector}`;
    if (!(key in PLACEMENTS)) {
      fail(`${id} has unknown placement ${key}`);
      continue;
    }
    if (!subs.includes(PLACEMENTS[key])) subs.push(PLACEMENTS[key]);
    if (!homeFile) homeFile = SECTORS[p.sector].file;
  }
  subs.sort((a, b) => SUBSECTOR_ORDER.indexOf(a) - SUBSECTOR_ORDER.indexOf(b));
  const auditWord = String(t.audited).split(/[,\s]/)[0].toLowerCase();
  const auditRest = String(t.audited).replace(/^[^,]*,?\s*/, "").trim();
  const entry = {
    id,
    name: t.name,
    provider: t.provider,
    subsectors: subs,
    description: t.description,
    kind: pick(KIND, t.kind, "kind", id),
    license: t.license,
    licenseClass: pick(LICENSE, t.license_class, "license_class", id),
    audited: pick(AUDIT, auditWord, "audited", id),
    auditNote: auditRest,
    repoUrl: t.repo_url,
    ...(t.docs_url ? { docsUrl: t.docs_url } : {}),
    chains: {
      robinhood: {
        status: pick(CHAIN, t.robinhood, "robinhood", id),
        ...(t.robinhood_note ? { note: t.robinhood_note } : {}),
      },
      arbitrum: { status: pick(CHAIN, t.arbitrum, "arbitrum", id) },
    },
    // A line that starts with Low says why the fit is poor; it is left out so
    // ponsFit always means a usable pairing.
    ...(t.pons_fit && !/^Low\b/.test(t.pons_fit) ? { ponsFit: t.pons_fit } : {}),
    complexity: pick(COMPLEXITY, t.complexity, "complexity", id),
    notes: t.notes,
    status: pick(STATUS, t.status, "status", id),
  };
  if (homeFile) bySector[homeFile].push(entry);
}

if (problems.length) {
  console.error(`Template catalog is invalid.\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}

const str = (v) => JSON.stringify(v);
const renderEntry = (e) => {
  const lines = [
    `    id: ${str(e.id)},`,
    `    name: ${str(e.name)},`,
    `    provider: ${str(e.provider)},`,
    `    subsectors: [${e.subsectors.map(str).join(", ")}],`,
    `    description: ${str(e.description)},`,
    `    kind: ${str(e.kind)},`,
    `    license: ${str(e.license)},`,
    `    licenseClass: ${str(e.licenseClass)},`,
    `    audited: ${str(e.audited)},`,
    `    auditNote: ${str(e.auditNote)},`,
    `    repoUrl: ${str(e.repoUrl)},`,
  ];
  if (e.docsUrl) lines.push(`    docsUrl: ${str(e.docsUrl)},`);
  const rh = e.chains.robinhood;
  lines.push(
    `    chains: {`,
    `      robinhood: { status: ${str(rh.status)}${rh.note ? `, note: ${str(rh.note)}` : ""} },`,
    `      arbitrum: { status: ${str(e.chains.arbitrum.status)} },`,
    `    },`,
  );
  if (e.ponsFit) lines.push(`    ponsFit: ${str(e.ponsFit)},`);
  lines.push(`    complexity: ${str(e.complexity)},`, `    notes: ${str(e.notes)},`, `    status: ${str(e.status)},`);
  return `  {\n${lines.join("\n")}\n  },`;
};
const renderFile = (sectorName, entries) => {
  const s = SECTORS[sectorName];
  return [
    `import type { ContractTemplate } from "@/lib/templates";`,
    ``,
    `// Generated by scripts/gen-templates.mjs from content/templates/catalog.json`,
    `// (research catalog of ${data.generated}). Do not edit by hand. Ids are immutable.`,
    `// ${entries.length} templates placed first under ${sectorName}.`,
    `export const ${s.constName}: readonly ContractTemplate[] = [`,
    ...entries.map(renderEntry),
    `];`,
    ``,
  ].join("\n");
};

let drift = 0;
for (const [sectorName, s] of Object.entries(SECTORS)) {
  const file = path.join(OUT, `${s.file}.ts`);
  const next = renderFile(sectorName, bySector[s.file]);
  if (CHECK) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (current !== next) {
      drift++;
      console.error(`content/templates/${s.file}.ts is out of date. Run npm run gen:templates.`);
    }
  } else {
    fs.writeFileSync(file, next);
    console.log(`content/templates/${s.file}.ts  ${bySector[s.file].length} templates`);
  }
}
if (CHECK) {
  console.log(drift ? `${drift} file(s) drifted` : `Template catalog files match catalog.json (${data.templates.length} templates).`);
  process.exitCode = drift ? 1 : 0;
}
