#!/usr/bin/env node
/**
 * Oracle feed list generator (M162). Reads Chainlink's reference data
 * directory, the same JSON the docs' feed address pages render, for the
 * two mainnets the project chains stand in for and the two testnets, and
 * writes content/chains/oracles.json with the date it was read. The app
 * never fetches a feed directory at runtime; the dependency check reads
 * the committed file. Robinhood's testnet has no directory (the request
 * answers 404), which the file records as an empty list, so every oracle
 * there reads mainnet only unless the team's own mock is recorded.
 *
 *   node scripts/gen-oracles.mjs            write the file
 *   npm run check:oracles                   validate the committed file offline (shape, addresses, no repeats)
 *   node scripts/gen-oracles.mjs --check --live   also fail when the directory has drifted
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const OUT = path.join(ROOT, "content/chains/oracles.json");
const CHECK = process.argv.includes("--check");
const LIVE = process.argv.includes("--live");

const DIRECTORY = "https://reference-data-directory.vercel.app";
/** Our network key, Chainlink's directory name and the docs page the source links point at. */
const NETWORKS = [
  { key: "robinhood_mainnet", directory: "robinhood-mainnet", docs: "robinhood" },
  { key: "robinhood_testnet", directory: "robinhood-testnet", docs: "robinhood" },
  { key: "arbitrum_one", directory: "ethereum-mainnet-arbitrum-1", docs: "arbitrum" },
  { key: "arbitrum_sepolia", directory: "ethereum-testnet-sepolia-arbitrum-1", docs: "arbitrum" },
];
const ASSET_CLASSES = { Crypto: "crypto", Equity: "equity", ETF: "equity", Fiat: "fx", Commodity: "commodity" };
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function classOf(feed) {
  return ASSET_CLASSES[feed.docs?.assetClass] ?? "other";
}

/** The feed's base asset as a ticker: "Robinhood GOOGL / USD" reads GOOGL, "syrupUSDG / USDG Exchange Rate" reads SYRUPUSDG. */
/** "X / Y" or "X-Y" as its two sides, without the Robinhood prefix the equity feeds carry. */
function sidesOf(name) {
  const clean = name.replace(/^Robinhood\s+/i, "").replace(/Exchange Rate/i, "").trim();
  const parts = clean.includes("/") ? clean.split("/") : clean.split(/-(?=[A-Z]{2,5}$)/);
  return parts.map((s) => s.trim().toUpperCase());
}

function isPair(feed) {
  return sidesOf(feed.name).length === 2 && sidesOf(feed.name).every(Boolean);
}

function assetOf(feed) {
  const base = feed.docs?.baseAsset || sidesOf(feed.name)[0];
  return String(base).replace(/^Robinhood\s+/i, "").trim().toUpperCase();
}

function quoteOf(feed) {
  const q = feed.docs?.quoteAsset || sidesOf(feed.name)[1] || "";
  return String(q).trim().toUpperCase();
}

async function fetchDirectory(net) {
  const res = await fetch(`${DIRECTORY}/feeds-${net.directory}.json`);
  if (res.status === 404) return { feeds: [], absent: true };
  if (!res.ok) throw new Error(`${net.directory} answered ${res.status}`);
  const json = await res.json();
  const feeds = json
    .filter((f) => f && typeof f.name === "string" && ADDRESS.test(f.proxyAddress ?? "") && (f.contractType ?? "") === "")
    // Price feeds, exchange rates, and the directory rows without product metadata that still read as a pair (the testnets, two Robinhood equities).
    .filter((f) => f.docs?.productType === "Price" || /Exchange Rate/i.test(f.name) || (f.docs?.productType == null && isPair(f)))
    .map((f) => ({
      asset: assetOf(f),
      quote: quoteOf(f),
      pair: f.name.trim(),
      provider: "chainlink",
      address: f.proxyAddress,
      kind: /Exchange Rate/i.test(f.name) ? "exchange_rate" : "price",
      assetClass: classOf(f),
      heartbeat: typeof f.heartbeat === "number" ? f.heartbeat : null,
      decimals: typeof f.decimals === "number" ? f.decimals : null,
      source: `https://docs.chain.link/data-feeds/price-feeds/addresses?network=${net.docs}`,
    }))
    .sort((a, b) => a.pair.localeCompare(b.pair));
  return { feeds, absent: false };
}

function validate(data) {
  const problems = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.checkedOn ?? "")) problems.push("checkedOn is not a date");
  for (const net of NETWORKS) {
    const n = data.networks?.[net.key];
    if (!n || !Array.isArray(n.feeds) || typeof n.absent !== "boolean") {
      problems.push(`${net.key} is missing`);
      continue;
    }
    const seen = new Set();
    for (const f of n.feeds) {
      if (!ADDRESS.test(f.address)) problems.push(`${net.key} ${f.pair} has a bad address`);
      if (seen.has(f.address.toLowerCase())) problems.push(`${net.key} ${f.pair} repeats ${f.address}`);
      seen.add(f.address.toLowerCase());
      if (!f.asset || !f.pair || f.provider !== "chainlink") problems.push(`${net.key} ${f.pair} is incomplete`);
      if (!["price", "exchange_rate"].includes(f.kind)) problems.push(`${net.key} ${f.pair} has kind ${f.kind}`);
      if (!["crypto", "equity", "fx", "commodity", "other"].includes(f.assetClass)) problems.push(`${net.key} ${f.pair} has class ${f.assetClass}`);
    }
  }
  return problems;
}

async function build() {
  const networks = {};
  for (const net of NETWORKS) networks[net.key] = await fetchDirectory(net);
  return { checkedOn: new Date().toISOString().slice(0, 10), directory: DIRECTORY, networks };
}

function summary(data) {
  return NETWORKS.map((n) => `${n.key} ${data.networks[n.key].absent ? "no directory" : `${data.networks[n.key].feeds.length} feeds`}`).join(", ");
}

if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error("content/chains/oracles.json is missing. Run npm run gen:oracles.");
    process.exit(1);
  }
  const current = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const problems = validate(current);
  for (const p of problems) console.error(`oracles: ${p}`);
  let drift = false;
  if (LIVE) {
    const fresh = await build();
    const same = (a, b) => JSON.stringify(a.feeds) === JSON.stringify(b.feeds) && a.absent === b.absent;
    for (const net of NETWORKS) if (!same(current.networks[net.key], fresh.networks[net.key])) {
      drift = true;
      console.error(`oracles: ${net.key} has drifted from the directory (${current.networks[net.key].feeds.length} committed, ${fresh.networks[net.key].feeds.length} live)`);
    }
  }
  console.log(`oracles checked on ${current.checkedOn}: ${summary(current)}`);
  process.exitCode = problems.length || drift ? 1 : 0;
} else {
  const data = await build();
  const problems = validate(data);
  if (problems.length) {
    for (const p of problems) console.error(`oracles: ${p}`);
    process.exit(1);
  }
  fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${summary(data)}`);
}
