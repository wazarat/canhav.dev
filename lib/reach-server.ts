import "server-only";

import { duneConfigured, duneQueryId } from "@/config/dune";
import { subsectorLabel } from "@/content/ideation";
import { type ProjectChain, chainInfo } from "@/lib/chains";
import { categoriesFor } from "@/lib/competitors/llama";
import { getLatestCompetitorSnapshot } from "@/lib/competitors/snapshots-db";
import { getDb } from "@/lib/db";
import { executeDuneQuery } from "@/lib/dune";
import type { ProjectDoc } from "@/lib/ideation";
import { effectiveSubsectors } from "@/lib/kits";
import { poolsFor } from "@/lib/pools/llama";
import { REACH_LIMITS, type ReachSummary, reachDefinition } from "@/lib/reach";
import type { ProfileKey } from "@/lib/value-canvas";

/**
 * Reachable wallets, server side (M168): the parameters from the record
 * and the pools snapshot, the three Dune queries, the cache in
 * launchpad.reach_snapshots and the monthly refresh cap per team.
 */
export interface ReachRows {
  overlap: number;
  subsectorUsers: number;
  assetHolders: number;
  series: Array<{ day: string; wallets: number }>;
}

export interface ReachRead extends ReachSummary {
  series: Array<{ day: string; wallets: number }>;
  /** Manual refreshes the team has left this month. */
  refreshesLeft: number;
  /** Which assets and how many protocol contracts were counted. */
  counted: { assets: string[]; protocols: number };
}

export type ReachResult = { kind: "ok"; read: ReachRead } | { kind: "needs_assets" } | { kind: "not_configured" } | { kind: "cap"; refreshesLeft: 0 } | { kind: "failed"; message: string };

/** The Dune call, injectable for the smoke. */
export type ReachExecutor = (params: { chainId: number; protocolAddresses: string[]; assetAddresses: string[] }) => Promise<ReachRows>;

const ADDRESS = /^0x[0-9a-f]{40}$/;

async function duneExecutor(params: { chainId: number; protocolAddresses: string[]; assetAddresses: string[] }): Promise<ReachRows> {
  const ids = { users: duneQueryId("subsector_users", params.chainId), holders: duneQueryId("asset_holders", params.chainId), overlap: duneQueryId("overlap", params.chainId) };
  if (!ids.users || !ids.holders || !ids.overlap) throw new Error("Dune queries are not configured");
  const p = { protocol_addresses: params.protocolAddresses.join(","), asset_addresses: params.assetAddresses.join(","), min_balance: 0 };
  const [users, holders, overlap] = await Promise.all([executeDuneQuery(ids.users, p), executeDuneQuery(ids.holders, p), executeDuneQuery(ids.overlap, p)]);
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;
  const series = users.rows.filter((r) => r.day).map((r) => ({ day: String(r.day).slice(0, 10), wallets: num(r.wallets) })).sort((a, b) => a.day.localeCompare(b.day));
  const total = users.rows.find((r) => !r.day);
  return {
    subsectorUsers: num(total?.wallets),
    assetHolders: num(holders.rows[0]?.wallets),
    overlap: num(overlap.rows[0]?.wallets),
    series,
  };
}

/** The month a read belongs to, as the first of the month. */
function monthOf(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Asset addresses on the mainnet: the asset's own address, else the token of a single asset pool with its symbol. */
export async function reachParameters(doc: ProjectDoc, chain: ProjectChain): Promise<{ assets: string[]; assetSymbols: string[]; protocols: string[] }> {
  const pools = await poolsFor(chain);
  const assets: string[] = [];
  const assetSymbols: string[] = [];
  for (const a of doc.assets ?? []) {
    const own = a.address && ADDRESS.test(a.address) ? a.address : null;
    const pool = pools.rows.find((p) => p.symbol.toUpperCase() === a.symbol && p.underlyingTokens.length === 1);
    const addr = own ?? pool?.underlyingTokens[0] ?? null;
    if (addr && !assets.includes(addr)) {
      assets.push(addr);
      assetSymbols.push(a.symbol);
    }
  }
  const slugs = new Set<string>();
  for (const c of categoriesFor(effectiveSubsectors(doc.kit, doc))) {
    const snap = await getLatestCompetitorSnapshot(c, chain);
    for (const r of snap?.rows ?? []) slugs.add(r.slug);
  }
  const protocols = new Set<string>();
  for (const p of pools.rows) {
    if (!slugs.has(p.project) || !ADDRESS.test(p.pool.toLowerCase())) continue;
    protocols.add(p.pool.toLowerCase());
    if (protocols.size >= REACH_LIMITS.poolAddresses) break;
  }
  for (const p of doc.reachProtocols ?? []) protocols.add(p.address);
  return { assets, assetSymbols, protocols: [...protocols] };
}

async function manualRefreshesThisMonth(orgId: string | null, projectId: string): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;
  const rows = orgId
    ? await sql`select count(*)::int as n from launchpad.reach_snapshots r join launchpad.projects p on p.id = r.project_id where p.org_id = ${orgId} and r.manual and r.month = ${monthOf()}`
    : await sql`select count(*)::int as n from launchpad.reach_snapshots where project_id = ${projectId} and manual and month = ${monthOf()}`;
  return (rows[0] as { n: number } | undefined)?.n ?? 0;
}

async function latestSnapshot(projectId: string, profile: number, chain: ProjectChain): Promise<{ rows: ReachRows & { definition: string; counted: { assets: string[]; protocols: number } }; fetchedAt: string } | null> {
  const sql = getDb();
  if (!sql) return null;
  const rows = await sql`
    select rows, fetched_at from launchpad.reach_snapshots
    where project_id = ${projectId} and profile = ${profile} and chain = ${chain} and month = ${monthOf()}
    order by fetched_at desc limit 1
  `;
  const r = rows[0] as { rows: ReachRows & { definition: string; counted: { assets: string[]; protocols: number } }; fetched_at: string | Date } | undefined;
  return r ? { rows: r.rows, fetchedAt: new Date(r.fetched_at).toISOString() } : null;
}

/**
 * The reach of one profile: this month's cached read, else a fresh run
 * (manual when the team asked, counted against the cap), else what is
 * wrong (no assets, Dune not configured, the cap, a failure).
 */
export async function reachFor(
  projectId: string,
  orgId: string | null,
  doc: ProjectDoc,
  profile: ProfileKey,
  chain: ProjectChain,
  opts: { refresh?: boolean; requestedBy?: string; execute?: ReachExecutor; configured?: boolean } = {},
): Promise<ReachResult> {
  const info = chainInfo(chain);
  const configured = opts.configured ?? duneConfigured(info.mainnetChainId);
  if (!configured) return { kind: "not_configured" };
  const used = await manualRefreshesThisMonth(orgId, projectId);
  const refreshesLeft = Math.max(0, REACH_LIMITS.refreshesPerMonth - used);
  const cached = opts.refresh ? null : await latestSnapshot(projectId, Number(profile), chain);
  if (cached) {
    const { definition, counted, ...rows } = cached.rows;
    return { kind: "ok", read: { ...rows, definition, counted, chainName: info.mainnetName, readAt: cached.fetchedAt, refreshesLeft } };
  }
  if (opts.refresh && refreshesLeft === 0) return { kind: "cap", refreshesLeft: 0 };
  const params = await reachParameters(doc, chain);
  if (!params.assets.length) return { kind: "needs_assets" };
  const subsectors = effectiveSubsectors(doc.kit, doc).map((s) => subsectorLabel(s).toLowerCase());
  const definition = reachDefinition({ chainName: info.mainnetName, assets: params.assetSymbols, protocols: params.protocols.length, subsectors });
  try {
    const rows = await (opts.execute ?? duneExecutor)({ chainId: info.mainnetChainId, protocolAddresses: params.protocols, assetAddresses: params.assets });
    const stored = { ...rows, definition, counted: { assets: params.assetSymbols, protocols: params.protocols.length } };
    const sql = getDb();
    const fetchedAt = new Date().toISOString();
    if (sql)
      await sql`
        insert into launchpad.reach_snapshots (project_id, profile, chain, month, rows, manual, requested_by, fetched_at)
        values (${projectId}, ${Number(profile)}, ${chain}, ${monthOf()}, ${JSON.stringify(stored)}, ${Boolean(opts.refresh)}, ${opts.requestedBy ?? null}, ${fetchedAt})
      `;
    return { kind: "ok", read: { ...rows, definition, counted: stored.counted, chainName: info.mainnetName, readAt: fetchedAt, refreshesLeft: opts.refresh ? refreshesLeft - 1 : refreshesLeft } };
  } catch (err) {
    return { kind: "failed", message: err instanceof Error ? err.message : String(err) };
  }
}

/** The summary the draft keeps per profile. */
export function reachSummaryOf(read: ReachRead): ReachSummary {
  return { overlap: read.overlap, subsectorUsers: read.subsectorUsers, assetHolders: read.assetHolders, definition: read.definition, chainName: read.chainName, readAt: read.readAt };
}
