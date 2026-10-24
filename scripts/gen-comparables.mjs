#!/usr/bin/env node
/**
 * Comparables generator (M132). Reads the canhav.co research store
 * (wazarat/canhav-prod, frontend/data/bootstrap-store.json), keeps the
 * timeless parts of how existing protocols are built and writes
 * content/research/comparables.json for the MCP tools. Nothing time bound
 * leaves the store: no metrics, no dated events, no "as of" claims, no
 * rankings. canhav.dev never reads canhav-prod at runtime.
 *
 *   node scripts/gen-comparables.mjs [store path]   write the file
 *   npm run check:comparables                        fail when the file would change
 *   --recheck                                        ignore the link cache
 *   --no-links                                       skip link checks (keeps cached results, drops unchecked links)
 *
 * Review sentences land in scripts/comparables/review.json with an empty
 * verdict; a person sets keep, rewrite (with the rewrite) or drop, and the
 * generator applies them by exact sentence on the next run. An empty verdict
 * counts as drop and is listed in the summary.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const OUT = path.join(ROOT, "content/research/comparables.json");
const REVIEW = path.join(ROOT, "scripts/comparables/review.json");
const LINKS = path.join(ROOT, "scripts/comparables/links-cache.json");
const TEMPLATES = path.join(ROOT, "content/templates/catalog.json");
const KIT_CATALOG_DIR = path.join(ROOT, "content/kits/catalog");
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const RECHECK = args.includes("--recheck");
const NO_LINKS = args.includes("--no-links");
const storeArg = args.find((a) => !a.startsWith("--"));
const STORE = storeArg ?? process.env.COMPARABLES_STORE ?? path.join(os.homedir(), "Documents/canhav-prod/frontend/data/bootstrap-store.json");

// ---------------------------------------------------------------------------
// Subsector mapping, canhav.co "Sector / SubSector" to lib/sectors.ts ids.

const MAP = {
  "Credit / Lending": "lending",
  "Credit / Decentralized CDP": "lending",
  "Credit / Fixed Income": "fixed_income",
  "Credit / Fixed-rate lending": "fixed_income",
  "Credit / Leveraged Yield": "leveraged_yield",
  "Liquidity / Vaults": "vaults",
  "Liquidity / Pools": "pools",
  "Derivatives / Perp DEX": "perp_dex",
  "Derivatives / Option Vaults": "option_vaults",
  "Derivatives / Delta-Neutral": "delta_neutral",
  "Staking / Liquid Staking": "liquid_staking",
  "Staking / Restaking": "restaking",
  "Staking / Liquid Restaking": "liquid_restaking",
  "RWA / Tokenized Equities": "tokenized_securities",
  "RWA / Tokenized Treasuries": "tokenized_securities",
  "RWA / Structured Products": "tokenized_securities",
  "RWA / Tokenization Infrastructure": "tokenized_securities",
  "RWA / Private Credit": "private_credit",
  "RWA / Real Estate": "asset_backed_tokens",
  "RWA / Carbon / ESG": "asset_backed_tokens",
  "RWA / Event Finance": "asset_backed_tokens",
  "RWA / Tokenized Commodities": "asset_backed_tokens",
  "Other / Underwriting": "underwriting",
  "Other / Governance": "governance",
};
/** Every DEX subsector lands on pools. */
const DEX_SECTOR = "pools";
const SUBSECTOR_ORDER = [
  "lending", "leveraged_yield", "fixed_income",
  "liquid_staking", "restaking", "liquid_restaking",
  "vaults", "pools",
  "perp_dex", "option_vaults", "delta_neutral",
  "tokenized_securities", "private_credit", "asset_backed_tokens",
  "underwriting", "governance",
];
/** The store's per sector subsector field, for secondary sectors. */
const SECTOR_SUBSECTOR_FIELD = {
  Credit: "LendingSubSector",
  Liquidity: "LiquiditySubSector",
  Derivatives: "DerivativesSubSector",
  DEX: "DexSubSector",
  Staking: "StakingSubSector",
  RWA: "RwaSubSector",
  Other: "OtherSubSector",
  Stablecoin: "StablecoinSubSector",
};

const unmapped = new Map();
function mapPair(sector, sub) {
  if (!sector) return null;
  if (sector === "DEX") return DEX_SECTOR;
  const key = `${sector} / ${sub ?? "None"}`;
  const id = MAP[key];
  if (!id) unmapped.set(key, (unmapped.get(key) ?? 0) + 1);
  return id ?? null;
}

// ---------------------------------------------------------------------------
// The time filter.

const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z(])/;
// Ratios blank only with short numbers (80/20), so a 2018/2020 pair still reads as years.
const SAFE = [/\b(ERC|EIP|BIP)-?\d+\b/g, /\b[Vv]\d+(\.\d+)?\b/g, /\b\d+\s?decimals\b/g, /\b\d{1,3}\/\d{1,3}\b/g];
const DROP = [
  /\b(19|20)\d\d\b/,
  /\b(January|February|March|April|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b\.?\s+\d/,
  /\bQ[1-4]\b/,
  /\bas (of|at)\b/i,
  /\bat (the )?time of writing\b/i,
  /\b(this|last|next) (year|month|week|quarter)\b/i,
  /[$€£¥]\s?\d/,
  /\d+(\.\d+)?\s?%/,
  /\b\d+(\.\d+)?\s?(k|m|b|bn|mm|million|billion|trillion|thousand)\b/i,
  /\b\d{1,3}(,\d{3})+\b/,
  /\b(TVL|APY|APR|market cap)\b/,
];
const REVIEW_RULES = [
  /\b(currently|current|today|recent(ly)?|now|latest|upcoming|planned|soon|newly|to date|no longer|formerly|previously|rebrand\w*|still)\b/i,
  /\b(largest|biggest|leading|fastest|most popular|dominant|market leader|number one|deepest|broadest|widest|first-mover|pioneer|incumbent|most trusted|safest|fast-growing|fastest-growing|(far |much )?(smaller|larger|bigger) than)\b/i,
  /\b\d{2,}\b/,
];

const stats = { sentences: 0, kept: 0, dropped: 0, review: 0, reviewApplied: { keep: 0, rewrite: 0, drop: 0, pending: 0 } };
const reviewRows = loadJson(REVIEW, []);
const reviewByKey = new Map(reviewRows.map((r) => [`${r.id}\u0000${r.field}\u0000${r.sentence}`, r]));
const reviewBySentence = new Map(reviewRows.map((r) => [r.sentence, r]));
const newReview = [];
const pending = [];

function classify(sentence) {
  let blank = sentence;
  for (const re of SAFE) blank = blank.replace(re, " ");
  if (DROP.some((re) => re.test(blank))) return "drop";
  if (REVIEW_RULES.some((re) => re.test(blank))) return "review";
  return "keep";
}

/** The timeless sentences of a string, rejoined. Empty when nothing survives. */
function filterText(text, id, field) {
  if (typeof text !== "string") return "";
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const out = [];
  for (const sentence of t.split(SENTENCE_SPLIT)) {
    stats.sentences++;
    const verdict = classify(sentence);
    if (verdict === "keep") { stats.kept++; out.push(sentence); continue; }
    if (verdict === "drop") { stats.dropped++; continue; }
    stats.review++;
    const row = reviewByKey.get(`${id}\u0000${field}\u0000${sentence}`) ?? reviewBySentence.get(sentence);
    if (!row) { newReview.push({ id, field, sentence, verdict: "", rewrite: "" }); stats.reviewApplied.pending++; pending.push(`${id} ${field}: ${sentence}`); continue; }
    if (row.verdict === "keep") { stats.reviewApplied.keep++; out.push(sentence); }
    else if (row.verdict === "rewrite" && row.rewrite?.trim()) { stats.reviewApplied.rewrite++; out.push(row.rewrite.trim()); }
    else if (row.verdict === "drop") stats.reviewApplied.drop++;
    else { stats.reviewApplied.pending++; pending.push(`${id} ${field}: ${sentence}`); }
  }
  return out.join(" ");
}

// ---------------------------------------------------------------------------
// Links.

const linkCache = RECHECK ? {} : loadJson(LINKS, {});
const linkStats = { checked: 0, unverified: 0, dead: [], filtered: 0, duplicates: 0, catalogDuplicates: 0 };
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function normalizeUrl(u) {
  try {
    const url = new URL(u.trim());
    url.hash = "";
    let s = url.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}
/** News, metrics and social hosts. The export keeps docs, GitHub, whitepapers and specs; these are time bound by nature. */
const NEWSY_HOSTS = /(^|\.)(theblock\.co|cointelegraph\.com|coindesk\.com|decrypt\.co|cryptobriefing\.com|dailycoin\.com|ccn\.com|defillama\.com|messari\.io|coingecko\.com|coinmarketcap\.com|crypto-fundraising\.info|exponential\.fi|dune\.com|tokenterminal\.com|mirror\.xyz|medium\.com|substack\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|t\.me|discord\.(gg|com)|reddit\.com|blockworks\.co|dlnews\.com|cryptoslate\.com|bankless\.com|rekt\.news|crunchbase\.com|pitchbook\.com|linkedin\.com)$/;
function datedOrNewsy(u) {
  let url;
  try { url = new URL(u); } catch { return true; }
  const host = url.hostname.toLowerCase();
  const p = url.pathname;
  if (NEWSY_HOSTS.test(host)) return true;
  if (/\/(19|20)\d\d\//.test(p)) return true;
  if (/\/(news|blog|press|announcements?)\//i.test(p)) return true;
  if (/^(governance|forum|gov|blog|news|press)\./.test(host) || /\/t\//.test(p)) return true;
  if (/(^|\.)(x\.com|twitter\.com)$/.test(host)) return true;
  return false;
}
/**
 * A link is dead when the server says the page is gone (404, 410). A 2xx is
 * alive. Bot protection (401, 402, 403, 429), server errors and a fetch that
 * never answered are unverified: the page probably exists and the link is
 * kept, counted apart in the summary.
 */
function verdictFor(status) {
  if (status >= 200 && status < 300) return "alive";
  if (status === 404 || status === 410) return "dead";
  return "unverified";
}
async function checkLink(u) {
  const hit = linkCache[u];
  if (hit && typeof hit.status === "number") {
    const v = verdictFor(hit.status);
    if (v === "unverified") linkStats.unverified++;
    return v !== "dead";
  }
  if (NO_LINKS) return null;
  linkStats.checked++;
  let status = 0;
  try {
    const res = await fetch(u, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10_000), headers: { "user-agent": UA, accept: "text/html,*/*" } });
    status = res.status;
    try { await res.body?.cancel(); } catch { /* ignore */ }
  } catch {
    status = 0;
  }
  const v = verdictFor(status);
  linkCache[u] = { ok: v === "alive", status, checkedAt: new Date().toISOString().slice(0, 10) };
  if (v === "unverified") linkStats.unverified++;
  return v !== "dead";
}
async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; results[idx] = await fn(items[idx], idx); }
  }));
  return results;
}

// ---------------------------------------------------------------------------
// Load.

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
const haveStore = fs.existsSync(STORE);
if (!haveStore && !CHECK) {
  console.error(`Store not found at ${STORE}. Pass the path to bootstrap-store.json.`);
  process.exit(1);
}

function validateOutput(data) {
  const problems = [];
  const ID = /^[a-z0-9][a-z0-9-]*$/;
  if (!data || typeof data !== "object") return ["not an object"];
  if (!data.generatedFrom?.repo || !data.generatedFrom?.file) problems.push("generatedFrom missing");
  const ids = new Set();
  for (const e of data.entities ?? []) {
    if (!ID.test(e.id)) problems.push(`bad id ${e.id}`);
    if (ids.has(e.id)) problems.push(`duplicate id ${e.id}`);
    ids.add(e.id);
    if (!e.subsectors?.length || e.subsectors.some((s) => !SUBSECTOR_ORDER.includes(s))) problems.push(`${e.id} subsectors`);
    if (!e.description) problems.push(`${e.id} empty description`);
  }
  for (const e of data.entities ?? []) for (const c of e.contrasts ?? []) if (!ids.has(c.slug)) problems.push(`${e.id} contrast ${c.slug} not exported`);
  // The drop patterns must not survive in any filtered prose (ids, names, urls and labels are not prose).
  const prose = [];
  for (const e of data.entities ?? []) {
    prose.push([e.id, e.description], [e.id, e.differentiator ?? ""]);
    for (const c of e.components ?? []) prose.push([e.id, c.name], [e.id, c.description]);
    for (const c of e.contrasts ?? []) prose.push([e.id, c.similarities ?? ""], [e.id, c.differences ?? ""], [e.id, c.positioning ?? ""]);
    for (const r of e.risks ?? []) prose.push([e.id, r.description]);
    for (const d of e.dependencies ?? []) prose.push([e.id, d.description]);
  }
  for (const s of data.assetTypes?.stablecoins ?? []) prose.push([s.slug, s.description ?? ""]);
  for (const r of data.assetTypes?.receipts ?? []) prose.push([r.slug, r.description ?? ""], [r.slug, r.notes ?? ""]);
  for (const [id, t] of prose) {
    let blank = t;
    for (const re of SAFE) blank = blank.replace(re, " ");
    for (const re of DROP) {
      const m = blank.match(re);
      if (m) { problems.push(`${id}: drop pattern leaked: ${m[0]} in "${t.slice(0, 80)}"`); break; }
    }
  }
  return problems;
}

if (!haveStore && CHECK) {
  const current = loadJson(OUT, null);
  const problems = validateOutput(current);
  if (problems.length) { console.error(`Comparables file is invalid.\n${problems.map((p) => `  ${p}`).join("\n")}`); process.exit(1); }
  console.log(`Store not present; committed comparables.json validates (${current.entities.length} entities, ${current.assetTypes.stablecoins.length} stablecoins, ${current.assetTypes.receipts.length} receipts).`);
  process.exit(0);
}

const store = JSON.parse(fs.readFileSync(STORE, "utf8"));
const items = Object.entries(store.items ?? {}).map(([key, rec]) => ({ key, cat: key.split("|")[0].replace("CATEGORY#", ""), rec }));
const entitiesRaw = items.filter((i) => i.cat === "Entity").map((i) => i.rec);
const stablesRaw = items.filter((i) => i.cat === "Stablecoin").map((i) => i.rec);
const receiptsRaw = items.filter((i) => i.cat === "Receipt").map((i) => i.rec);

// Templates, for templateIds.
const templates = loadJson(TEMPLATES, { templates: [] }).templates;
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } };
/** The registrable part of a host (aave.com for docs.aave.com), so docs on a subdomain still match. */
const site = (u) => { const h = host(u); return h ? h.split(".").slice(-2).join(".") : null; };
const ghOrg = (u) => { const m = typeof u === "string" && u.match(/github\.com\/([^/\s#?]+)/i); return m ? m[1].toLowerCase() : null; };
const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function templateIdsFor(e) {
  const org = ghOrg(e.GitHub);
  const docs = site(e.OfficialDocs);
  const web = site(e.Website);
  const name = norm(e.Name);
  const first = name.split(" ")[0];
  const out = [];
  for (const t of templates) {
    const tOrg = ghOrg(t.repo_url);
    const tDocs = site(t.docs_url);
    const prov = norm(t.provider);
    const provFirst = prov.split(" ")[0];
    // Loose on purpose: the same GitHub org, the same site for the docs, or the
    // provider named after the protocol (first word, four letters or more).
    const hit =
      (org && tOrg === org) ||
      (docs && tDocs === docs) ||
      (web && tDocs === web) ||
      (name && (prov === name || prov.startsWith(`${name} `))) ||
      (first.length >= 4 && provFirst === first);
    if (hit) out.push(t.id);
  }
  return out.sort();
}

// Catalog URLs, for source deduping.
const catalogUrls = new Set();
for (const f of fs.readdirSync(KIT_CATALOG_DIR)) {
  if (!f.endsWith(".ts")) continue;
  const src = fs.readFileSync(path.join(KIT_CATALOG_DIR, f), "utf8");
  for (const m of src.matchAll(/https?:\/\/[^\s"'`)]+/g)) { const n = normalizeUrl(m[0]); if (n) catalogUrls.add(n); }
}

// ---------------------------------------------------------------------------
// Entities.

const perSubsector = {};
const bySlug = new Map();
const drafts = [];
for (const e of entitiesRaw) {
  const subs = new Set();
  const primary = mapPair(e.Sector, e.SubSector);
  if (primary) subs.add(primary);
  for (const sec of e.SecondarySectors ?? []) {
    const field = SECTOR_SUBSECTOR_FIELD[sec];
    const sub = field ? e[field] : null;
    const id = sub || sec === "DEX" ? mapPair(sec, sub) : null;
    if (id) subs.add(id);
  }
  if (subs.size === 0) continue;
  const id = e.Slug;
  const description = filterText(e.Description, id, "description");
  if (!description) continue;
  const differentiator = filterText(e.Differentiator, id, "differentiator");
  const components = (e.Components ?? [])
    .map((c) => ({ name: filterText(c.name, id, "component.name"), description: filterText(c.description, id, "component.description") }))
    .filter((c) => c.name && c.description);
  const risks = (e.Risks ?? [])
    .map((r) => ({ category: typeof r.category === "string" ? r.category.trim() : "", description: filterText(r.description, id, "risk") }))
    .filter((r) => r.description);
  const dependencies = (e.Dependencies ?? [])
    .map((d) => ({ kind: d.kind ?? "", name: d.name ?? "", description: filterText(d.description, id, "dependency"), severity: d.severity ?? "" }))
    .filter((d) => d.description && d.name);
  const contrastsRaw = (e.Competitors ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    similarities: filterText(c.similarities, id, "contrast.similarities"),
    differences: filterText(c.differences, id, "contrast.differences"),
    positioning: filterText(c.positioning, id, "contrast.positioning"),
  }));
  drafts.push({
    id,
    name: e.Name,
    subsectors: SUBSECTOR_ORDER.filter((s) => subs.has(s)),
    description,
    differentiator,
    components,
    contrastsRaw,
    risks,
    dependencies,
    linksRaw: { website: e.Website, docs: e.OfficialDocs, github: e.GitHub, sources: e.Sources ?? [] },
    templateIds: templateIdsFor(e),
  });
}
for (const d of drafts) bySlug.set(d.id, d);

// Links: collect, filter, check.
const toCheck = new Set();
for (const d of drafts) {
  for (const k of ["website", "docs", "github"]) { const n = d.linksRaw[k] ? normalizeUrl(d.linksRaw[k]) : null; if (n) toCheck.add(n); }
  for (const s of d.linksRaw.sources) { const n = s?.url ? normalizeUrl(s.url) : null; if (n && !datedOrNewsy(n)) toCheck.add(n); }
}
const stableLinks = new Set();
for (const s of stablesRaw) { const n = s.Website ? normalizeUrl(s.Website) : null; if (n) { toCheck.add(n); stableLinks.add(n); } }
const checkList = [...toCheck];
const okByUrl = new Map();
const results = await pool(checkList, 12, async (u) => [u, await checkLink(u)]);
for (const [u, ok] of results) okByUrl.set(u, ok);
const alive = (u) => { const n = u ? normalizeUrl(u) : null; if (!n) return null; const ok = okByUrl.get(n); if (ok === true) return n; if (ok === false) linkStats.dead.push(n); return null; };

const entities = drafts.map((d) => {
  const seen = new Set();
  const sources = [];
  for (const s of d.linksRaw.sources) {
    if (!s?.url || !s.label) continue;
    const n = normalizeUrl(s.url);
    if (!n) continue;
    if (datedOrNewsy(n)) { linkStats.filtered++; continue; }
    if (seen.has(n)) { linkStats.duplicates++; continue; }
    seen.add(n);
    if (catalogUrls.has(n)) { linkStats.catalogDuplicates++; continue; }
    const live = alive(n);
    if (!live) continue;
    sources.push({ label: s.label.replace(/\s+/g, " ").trim(), url: live });
  }
  const links = {};
  const website = alive(d.linksRaw.website); if (website) links.website = website;
  const docs = alive(d.linksRaw.docs); if (docs) links.docs = docs;
  const github = alive(d.linksRaw.github); if (github) links.github = github;
  if (sources.length) links.sources = sources;
  const contrasts = d.contrastsRaw
    .filter((c) => c.slug && bySlug.has(c.slug) && (c.similarities || c.differences || c.positioning))
    .map((c) => ({ slug: c.slug, name: bySlug.get(c.slug).name, ...(c.similarities ? { similarities: c.similarities } : {}), ...(c.differences ? { differences: c.differences } : {}), ...(c.positioning ? { positioning: c.positioning } : {}) }));
  for (const s of d.subsectors) perSubsector[s] = (perSubsector[s] ?? 0) + 1;
  return {
    id: d.id,
    name: d.name,
    subsectors: d.subsectors,
    description: d.description,
    ...(d.differentiator ? { differentiator: d.differentiator } : {}),
    components: d.components,
    contrasts,
    risks: d.risks,
    dependencies: d.dependencies,
    links,
    templateIds: d.templateIds,
  };
}).sort((a, b) => a.id.localeCompare(b.id));

// ---------------------------------------------------------------------------
// Asset types.

const str = (v) => (typeof v === "string" ? v.trim() : "");
const stablecoins = stablesRaw
  .map((s) => {
    const description = filterText(s.Description, s.Slug, "stablecoin.description");
    const website = alive(s.Website);
    return {
      slug: s.Slug, name: str(s.Name), symbol: str(s.Symbol),
      ...(str(s.PegTarget) ? { pegTarget: str(s.PegTarget) } : {}),
      ...(str(s.PegMechanism) ? { pegMechanism: str(s.PegMechanism) } : {}),
      ...(str(s.AssetSubtype) ? { assetSubtype: str(s.AssetSubtype) } : {}),
      ...(str(s.EntitySlug) ? { entitySlug: str(s.EntitySlug) } : {}),
      ...(description ? { description } : {}),
      ...(website ? { website } : {}),
    };
  })
  .filter((s) => s.slug && s.name)
  .sort((a, b) => a.slug.localeCompare(b.slug));
const receipts = receiptsRaw
  .map((r) => {
    const description = filterText(r.Description, r.Slug, "receipt.description");
    const notes = filterText(r.Notes, r.Slug, "receipt.notes");
    return {
      slug: r.Slug, name: str(r.Name), symbol: str(r.Symbol),
      ...(str(r.ReceiptType) ? { receiptType: str(r.ReceiptType) } : {}),
      ...(str(r.BaseAsset) ? { baseAsset: str(r.BaseAsset) } : {}),
      ...(str(r.EntitySlug) ? { entitySlug: str(r.EntitySlug) } : {}),
      ...(description ? { description } : {}),
      ...(notes ? { notes } : {}),
    };
  })
  .filter((r) => r.slug && r.name)
  .sort((a, b) => a.slug.localeCompare(b.slug));

const output = {
  generatedFrom: { repo: "wazarat/canhav-prod", file: "frontend/data/bootstrap-store.json" },
  entities,
  assetTypes: { stablecoins, receipts },
};

// ---------------------------------------------------------------------------
// Write, check, summary.

const problems = validateOutput(output);
if (problems.length) {
  console.error(`Generated comparables are invalid.\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
const rendered = `${JSON.stringify(output, null, 2)}\n`;
if (!NO_LINKS) fs.writeFileSync(LINKS, `${JSON.stringify(Object.fromEntries(Object.entries(linkCache).sort()), null, 2)}\n`);
if (newReview.length) {
  const merged = [...reviewRows, ...newReview].sort((a, b) => a.id.localeCompare(b.id) || a.field.localeCompare(b.field) || a.sentence.localeCompare(b.sentence));
  fs.writeFileSync(REVIEW, `${JSON.stringify(merged, null, 2)}\n`);
}
let drift = false;
if (CHECK) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  drift = current !== rendered;
  if (drift) console.error("content/research/comparables.json is out of date. Run npm run gen:comparables.");
} else {
  fs.writeFileSync(OUT, rendered);
}

const lines = [
  `Entities ${entities.length} (of ${entitiesRaw.length}), stablecoins ${stablecoins.length}, receipts ${receipts.length}.`,
  `Per subsector: ${SUBSECTOR_ORDER.map((s) => `${s} ${perSubsector[s] ?? 0}`).join(", ")}.`,
  `Sentences ${stats.sentences}: kept ${stats.kept}, dropped ${stats.dropped}, review ${stats.review} (keep ${stats.reviewApplied.keep}, rewrite ${stats.reviewApplied.rewrite}, drop ${stats.reviewApplied.drop}, pending ${stats.reviewApplied.pending}).`,
  `Links checked now ${linkStats.checked}, dead ${[...new Set(linkStats.dead)].length}, unverified and kept ${linkStats.unverified}, dated or newsy ${linkStats.filtered}, duplicates ${linkStats.duplicates}, already in the resource catalog ${linkStats.catalogDuplicates}.`,
  `Template matches: ${entities.filter((e) => e.templateIds.length).length} entities carry template ids.`,
  `Unmapped sector pairs: ${[...unmapped.entries()].map(([k, n]) => `${k} (${n})`).join(", ") || "none"}.`,
];
if (newReview.length) lines.push(`${newReview.length} new review sentences written to scripts/comparables/review.json with an empty verdict.`);
if (pending.length) lines.push(`Pending review (treated as drop): ${pending.length}.`);
if (linkStats.dead.length) lines.push(`Dead links: ${[...new Set(linkStats.dead)].slice(0, 40).join(", ")}${linkStats.dead.length > 40 ? " ..." : ""}`);
console.log(lines.join("\n"));
process.exitCode = drift ? 1 : 0;
