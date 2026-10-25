import { FAMILY_LABELS } from "@/content/kits/copy";
import { VIABILITY_COPY } from "@/content/viability";
import type { AssetEntry } from "@/lib/assets";
import { type ProjectChain, chainInfo, chainIsBeta } from "@/lib/chains";
import { formatTvl } from "@/lib/competitors/tvl";
import { formatDayShort } from "@/lib/format";
import type { ExternalDep, TestnetContract } from "@/lib/ideation";
import { type EnvironmentRows, type FamilyEnvironment, type ProductShape, SHAPE_FAMILIES } from "@/lib/kits";
import { equityFeedCount, feedsFor } from "@/lib/oracles";
import { type ContractTemplate, templateAvailability, templateOnChain } from "@/lib/templates";

/**
 * The dependency check (M163, V1): does everything the idea depends on
 * exist on the project's chain today, and if not, what is the workaround.
 * Pure. The protocols come from the shapes' families and the kit
 * environment rows, the templates from the ones the team accepted, the
 * external dependencies from Decisions, the assets from the record with
 * the committed oracle list and the pools snapshot, the chain facts from
 * the chain itself. Each row reads as a sentence that starts with its
 * state in words; the caller lays them out and the agent reads them
 * through check_dependencies.
 */
export const DEPENDENCY_STATES = ["available", "mainnet_only", "workaround", "missing", "unknown"] as const;
export type DependencyState = (typeof DEPENDENCY_STATES)[number];
export type DependencyGroup = "protocols" | "assets" | "chain";

export interface DependencySource {
  label: string;
  url?: string;
  /** ISO date or time the source was read. */
  readAt?: string;
}

/** A build step the row offers when something is missing or needs a workaround. */
export interface DependencyStep {
  shape: ProductShape;
  title: string;
  detail: string;
  milestone: "design" | "testnet";
}

export interface DependencyRow {
  group: DependencyGroup;
  /** Stable within a check: "protocol:morpho", "asset:<id>", "chain:faucet". */
  key: string;
  title: string;
  state: DependencyState;
  /** One or two sentences after the state. */
  reason: string;
  source?: DependencySource;
  step?: DependencyStep;
}

/** Pool liquidity holding an asset, summed from the pools snapshot. */
export interface Liquidity {
  usd: number;
  pools: number;
  top: Array<{ project: string; symbol: string; tvlUsd: number }>;
}

export interface DependencyInput {
  chain: ProjectChain;
  shapes: readonly ProductShape[];
  environment: EnvironmentRows;
  /** The templates the team accepted. */
  templates: readonly ContractTemplate[];
  externalDeps: readonly ExternalDep[];
  assets: readonly AssetEntry[];
  /** The recorded testnet contracts, read for a mock price feed. */
  contracts: readonly TestnetContract[];
  /** Liquidity per asset id from the pools snapshot, null for an asset no pool holds; the whole field null when nothing was read. */
  liquidity?: { byAsset: Record<string, Liquidity | null>; readAt: string } | null;
}

const MOCK_FEED = /oracle|feed|price/i;
const C = VIABILITY_COPY.dependencies;

function sourceOf(label: string, url: string | undefined, readAt: string | undefined): DependencySource {
  return { label, ...(url ? { url } : {}), ...(readAt ? { readAt } : {}) };
}

function protocolRow(family: FamilyEnvironment["family"], row: FamilyEnvironment | undefined, chain: ProjectChain, shape: ProductShape): DependencyRow {
  const info = chainInfo(chain);
  const name = FAMILY_LABELS[family];
  const key = `protocol:${family}`;
  if (!row) return { group: "protocols", key, title: name, state: "missing", reason: C.protocol.noRow, step: { shape, title: C.protocol.stepMissing(name), detail: C.protocol.stepDetail, milestone: "design" } };
  const source = sourceOf("Kit environment", row.testnet.source ?? row.mainnet.source, row.checkedOn);
  const t = row.testnet.status;
  if (t === "official") return { group: "protocols", key, title: name, state: "available", reason: `${C.protocol.official(info.short)} ${row.testnet.note}`, source };
  if (t === "community")
    return { group: "protocols", key, title: name, state: "workaround", reason: `${C.protocol.community(info.short)} ${row.testnet.note}`, source, step: { shape, title: C.protocol.stepCommunity(name), detail: C.protocol.stepDetail, milestone: "testnet" } };
  if (row.mainnet.status === "official" || row.mainnet.status === "manifest_only")
    return { group: "protocols", key, title: name, state: "mainnet_only", reason: `${C.protocol.mainnetOnly(info.mainnetName, info.short)} ${row.testnet.note}`, source, step: { shape, title: C.protocol.stepMainnetOnly(name, info.short), detail: C.protocol.stepDetail, milestone: "testnet" } };
  return { group: "protocols", key, title: name, state: "missing", reason: `${C.protocol.missing(info.mainnetName, info.short)} ${row.testnet.note}`, source, step: { shape, title: C.protocol.stepMissing(name), detail: C.protocol.stepDetail, milestone: "design" } };
}

function templateRow(t: ContractTemplate, chain: ProjectChain, shape: ProductShape): DependencyRow {
  const info = chainInfo(chain);
  const key = `template:${t.id}`;
  const on = templateOnChain(t, chain);
  const source = sourceOf("Template catalog", t.docsUrl ?? t.repoUrl, undefined);
  const note = on.note ? ` ${on.note}` : "";
  switch (templateAvailability(t, chain)) {
    case "ready":
      return { group: "protocols", key, title: t.name, state: "mainnet_only", reason: `${C.template.ready(info.mainnetName)}${note}`, source, step: { shape, title: C.template.stepReady(t.name, info.short), detail: C.protocol.stepDetail, milestone: "testnet" } };
    case "self_deploy":
      return { group: "protocols", key, title: t.name, state: "workaround", reason: `${C.template.selfDeploy(info.short)}${note}`, source, step: { shape, title: C.template.stepSelfDeploy(t.name, info.short), detail: C.protocol.stepDetail, milestone: "testnet" } };
    case "unavailable":
      return { group: "protocols", key, title: t.name, state: "missing", reason: `${C.template.unavailable(info.mainnetName)}${note}`, source, step: { shape, title: C.template.stepUnavailable(t.name), detail: C.protocol.stepDetail, milestone: "design" } };
    default:
      return { group: "protocols", key, title: t.name, state: "unknown", reason: `${C.template.unknown(info.mainnetName)}${note}`, source };
  }
}

function assetRow(a: AssetEntry, input: DependencyInput): DependencyRow {
  const info = chainInfo(input.chain);
  const feeds = feedsFor(a.symbol, input.chain);
  const mock = input.contracts.find((c) => c.label && MOCK_FEED.test(c.label));
  const shape = input.shapes[0];
  const key = `asset:${a.id}`;
  let state: DependencyState;
  let oracle: string;
  let source: DependencySource | undefined;
  if (feeds.testnet) {
    state = "available";
    oracle = C.asset.feedTestnet(feeds.testnet.pair, info.short);
    source = sourceOf("Chainlink", feeds.testnet.source, feeds.checkedOn);
  } else if (feeds.mainnet && mock) {
    state = "workaround";
    oracle = C.asset.feedMainnetWithMock(feeds.mainnet.pair, info.mainnetName, mock.label as string, info.short);
    source = sourceOf("Chainlink", feeds.mainnet.source, feeds.checkedOn);
  } else if (feeds.mainnet) {
    state = "mainnet_only";
    oracle = C.asset.feedMainnetOnly(feeds.mainnet.pair, info.mainnetName, info.short);
    source = sourceOf("Chainlink", feeds.mainnet.source, feeds.checkedOn);
  } else if (mock) {
    state = "workaround";
    oracle = C.asset.noFeedWithMock(info.mainnetName, mock.label as string);
  } else {
    state = "missing";
    oracle = C.asset.noFeed(info.mainnetName, info.short);
  }
  let liquidity: string;
  if (!input.liquidity) liquidity = C.asset.liquidityNotRead;
  else {
    const l = input.liquidity.byAsset[a.id];
    const read = ` (DefiLlama, read ${formatDayShort(input.liquidity.readAt)})`;
    liquidity = l ? `${C.asset.liquidity(formatTvl(l.usd), l.pools, info.mainnetName)}${read}` : `${C.asset.noLiquidity(info.mainnetName)}${read}`;
  }
  const title = `${a.symbol} ${VIABILITY_COPY.assets.roles[a.role].toLowerCase()}`;
  const step = shape && (state === "mainnet_only" || state === "missing") ? { shape, title: C.asset.stepMock(a.symbol, info.short), detail: C.asset.stepDetail, milestone: "testnet" as const } : undefined;
  return { group: "assets", key, title, state, reason: `${oracle} ${liquidity}.`, ...(source ? { source } : {}), ...(step ? { step } : {}) };
}

function chainRows(input: DependencyInput): DependencyRow[] {
  const info = chainInfo(input.chain);
  const rows: DependencyRow[] = [];
  const own = input.environment[info.family];
  if (own)
    rows.push({ group: "chain", key: "chain:network", title: C.chain.networkTitle(info.name), state: own.testnet.status === "none" ? "missing" : "available", reason: C.chain.network(own.testnet.note), source: sourceOf("Chain docs", own.testnet.source, own.checkedOn) });
  rows.push(
    chainIsBeta(input.chain)
      ? { group: "chain", key: "chain:faucet", title: C.chain.faucetTitle, state: "workaround", reason: C.chain.faucetBeta(info.short), source: sourceOf("Faucet", info.faucetUrl, undefined) }
      : { group: "chain", key: "chain:faucet", title: C.chain.faucetTitle, state: "available", reason: C.chain.faucet(info.short), source: sourceOf("Faucet", info.faucetUrl, undefined) },
  );
  const equities = equityFeedCount(input.chain);
  const feed = feedsFor("GOOGL", input.chain).mainnet ?? feedsFor("SPY", input.chain).mainnet;
  rows.push({
    group: "chain",
    key: "chain:equity_feeds",
    title: C.chain.equityTitle,
    state: equities > 0 ? "mainnet_only" : "missing",
    reason: equities > 0 ? C.chain.equityFeeds(equities, info.mainnetName) : C.chain.noEquityFeeds(info.mainnetName),
    ...(feed ? { source: sourceOf("Chainlink", feed.source, feedsFor("GOOGL", input.chain).checkedOn) } : {}),
  });
  return rows;
}

/** Every dependency row, Protocols, then Assets, then Chain. */
export function resolveDependencies(input: DependencyInput): DependencyRow[] {
  const rows: DependencyRow[] = [];
  const seen = new Set<string>();
  for (const shape of input.shapes)
    for (const family of SHAPE_FAMILIES[shape]) {
      if (seen.has(family)) continue;
      seen.add(family);
      rows.push(protocolRow(family, input.environment[family], input.chain, shape));
    }
  for (const t of input.templates) rows.push(templateRow(t, input.chain, input.shapes[0] ?? "curated_vault"));
  for (const d of input.externalDeps) rows.push({ group: "protocols", key: `external:${d.name}`, title: d.name, state: "unknown", reason: C.external, ...(d.url ? { source: sourceOf("Decisions", d.url, undefined) } : {}) });
  for (const a of input.assets) rows.push(assetRow(a, input));
  rows.push(...chainRows(input));
  return rows;
}

export interface DependencySummary {
  sentence: string;
  available: number;
  /** Rows with a checkable answer (unknown rows are left out). */
  total: number;
  missing: string[];
  workaround: string[];
  mainnetOnly: string[];
}

/** The sentence on top of the section and in the Viability summary card. */
export function dependencySummary(rows: readonly DependencyRow[], chain: ProjectChain): DependencySummary {
  const checkable = rows.filter((r) => r.state !== "unknown" && r.group !== "chain");
  const available = checkable.filter((r) => r.state === "available").length;
  const missing = checkable.filter((r) => r.state === "missing").map((r) => r.title);
  const workaround = checkable.filter((r) => r.state === "workaround").map((r) => r.title);
  const mainnetOnly = checkable.filter((r) => r.state === "mainnet_only").map((r) => r.title);
  const parts = [C.summary(available, checkable.length, chainInfo(chain).short)];
  if (missing.length) parts.push(C.missingLine(missing.slice(0, 3)));
  if (mainnetOnly.length) parts.push(C.mainnetOnlyLine(mainnetOnly.length));
  if (workaround.length) parts.push(C.workaroundLine(workaround.length));
  return { sentence: parts.join(" "), available, total: checkable.length, missing, workaround, mainnetOnly };
}

/** Missing and workaround rows for the agent, each as one line. */
export function dependencyLines(rows: readonly DependencyRow[]): string[] {
  return rows
    .filter((r) => r.state === "missing" || r.state === "workaround" || r.state === "mainnet_only")
    .map((r) => `- ${C.states[r.state]}. ${r.title}, ${r.reason}${r.step ? ` Suggested step (${r.step.milestone}), ${r.step.title}.` : ""}`);
}
