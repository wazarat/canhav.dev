import "server-only";

import { erc20Abi } from "viem";

import { WATCH_DEFAULTS } from "@/lib/alerts/kinds";
import { type WatchRule, deleteWatchRules, getWatch, setWatchRow, syncWatchRules } from "@/lib/alerts/db";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { LAUNCH_SUPPLY } from "@/content/launch";
import { testnetContractRows } from "@/lib/ideation";
import { type ProjectRow, getLinkedTokenDesign } from "@/lib/ideation-db";
import { getLaunchesByProject, launchRowChain } from "@/lib/launches-db";
import { publicClientFor } from "@/lib/publicClient";

/**
 * The Watch switch (M128). One rule per recorded testnet contract
 * (ownership and pause) and per launched or linked token (every kind, large
 * transfers at one percent of the supply), reconciled on every read so a
 * contract recorded later is watched too.
 */

const ADDRESS = /^0x[0-9a-f]{40}$/;

async function tokenFacts(address: `0x${string}`, chain: ReturnType<typeof projectChainOf>): Promise<{ symbol: string | null; supply: bigint; decimals: number }> {
  const client = publicClientFor(chain);
  const fallback = { symbol: null, supply: BigInt(LAUNCH_SUPPLY) * 10n ** 18n, decimals: 18 };
  try {
    const [symbol, supply, decimals] = await Promise.all([
      client.readContract({ address, abi: erc20Abi, functionName: "symbol" }).catch(() => null),
      client.readContract({ address, abi: erc20Abi, functionName: "totalSupply" }).catch(() => fallback.supply),
      client.readContract({ address, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    ]);
    return { symbol: symbol || null, supply, decimals: Number(decimals) };
  } catch {
    return fallback;
  }
}

/** The rules the switch wants for the project right now. */
export async function desiredWatchRules(project: ProjectRow): Promise<WatchRule[]> {
  const chain = projectChainOf(project.draft_doc);
  const byAddress = new Map<string, WatchRule>();
  for (const row of testnetContractRows(project.draft_doc)) {
    const address = row.address.trim().toLowerCase();
    if (!ADDRESS.test(address)) continue;
    byAddress.set(address, { address, label: row.label ?? null, kinds: [...WATCH_DEFAULTS.contractKinds], thresholdWei: null, decimals: 18 });
  }
  const [launches, design] = await Promise.all([getLaunchesByProject(project.id), getLinkedTokenDesign(project.id)]);
  const tokens = new Map<string, string | null>();
  for (const l of launches ?? []) if (launchRowChain(l) === chain) tokens.set(l.token_address.toLowerCase(), null);
  if (design?.deployed_token_address) tokens.set(design.deployed_token_address.toLowerCase(), design.draft_doc.name || null);
  for (const [address, designName] of tokens) {
    if (!ADDRESS.test(address)) continue;
    const facts = await tokenFacts(address as `0x${string}`, chain);
    const label = designName ?? facts.symbol ?? `${project.draft_doc.name || "Project"} token`;
    const thresholdWei = ((facts.supply * BigInt(WATCH_DEFAULTS.tokenThresholdBps)) / 10_000n).toString();
    byAddress.set(address, { address, label, kinds: [...WATCH_DEFAULTS.tokenKinds], thresholdWei, decimals: facts.decimals });
  }
  return Array.from(byAddress.values());
}

/** Bring the watch rules in line with the record when the switch is on. Cheap and idempotent. */
export async function syncWatch(project: ProjectRow, userId: string): Promise<void> {
  if (!(await getWatch(project.id))) return;
  const desired = await desiredWatchRules(project);
  await syncWatchRules(project.id, chainInfo(projectChainOf(project.draft_doc)).chainId, desired, userId);
}

export async function setWatch(project: ProjectRow, enabled: boolean, userId: string): Promise<{ ok: true; rules: number } | { ok: false; message: string }> {
  if (!(await setWatchRow(project.id, enabled, userId))) return { ok: false, message: "Could not change the switch." };
  if (!enabled) {
    await deleteWatchRules(project.id);
    return { ok: true, rules: 0 };
  }
  const desired = await desiredWatchRules(project);
  const synced = await syncWatchRules(project.id, chainInfo(projectChainOf(project.draft_doc)).chainId, desired, userId);
  if (!synced) return { ok: false, message: "Could not create the rules." };
  return { ok: true, rules: desired.length };
}
