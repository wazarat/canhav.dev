import { z } from "zod";

import { type ProfileKey, PROFILE_KEYS } from "@/lib/value-canvas";

/**
 * Reachable wallets (M168, V4): how many real wallets already do what the
 * idea depends on, on the chain's mainnet, read from Dune. The summary of
 * the last read sits on the draft per ideal customer profile so the pack
 * prompt, AGENTS.md and the ICP draft carry the numbers with their
 * definitions; the full rows live in launchpad.reach_snapshots. Pure.
 */
export interface ReachSummary {
  /** Wallets that both used the subsector's contracts in 90 days and hold one of the assets. */
  overlap: number;
  subsectorUsers: number;
  assetHolders: number;
  /** What the numbers mean, exactly. */
  definition: string;
  chainName: string;
  readAt: string;
}

export type Reach = Partial<Record<ProfileKey, ReachSummary>>;

/** A protocol contract the team or its agent adds to the reach parameters. */
export interface ReachProtocol {
  name: string;
  address: string;
}

export const REACH_LIMITS = { refreshesPerMonth: 10, protocols: 20, protocolName: 60, poolAddresses: 60 } as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;

export function normalizeReach(raw: unknown): Reach | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Reach = {};
  for (const k of PROFILE_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.round(x) : null);
    const overlap = n(o.overlap);
    const users = n(o.subsectorUsers);
    const holders = n(o.assetHolders);
    if (overlap === null || users === null || holders === null) continue;
    if (typeof o.definition !== "string" || typeof o.chainName !== "string" || typeof o.readAt !== "string" || Number.isNaN(Date.parse(o.readAt))) continue;
    out[k] = { overlap, subsectorUsers: users, assetHolders: holders, definition: o.definition.slice(0, 300), chainName: o.chainName.slice(0, 40), readAt: o.readAt };
  }
  return Object.keys(out).length ? out : null;
}

export function normalizeReachProtocols(raw: unknown): ReachProtocol[] {
  if (!Array.isArray(raw)) return [];
  const out: ReachProtocol[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const o = v as { name?: unknown; address?: unknown };
    const address = typeof o.address === "string" ? o.address.trim().toLowerCase() : "";
    const name = typeof o.name === "string" ? o.name.trim().slice(0, REACH_LIMITS.protocolName) : "";
    if (!ADDRESS.test(address) || !name || seen.has(address)) continue;
    seen.add(address);
    out.push({ name, address });
    if (out.length >= REACH_LIMITS.protocols) break;
  }
  return out;
}

export const reachProtocolsPatchSchema = z.array(z.strictObject({ name: z.string().min(1).max(REACH_LIMITS.protocolName), address: z.string().regex(/^0x[0-9a-fA-F]{40}$/) })).max(REACH_LIMITS.protocols);

/** The sentence that defines the numbers, built from what was counted. */
export function reachDefinition(input: { chainName: string; assets: readonly string[]; protocols: number; subsectors: readonly string[] }): string {
  const assets = input.assets.length ? input.assets.join(", ") : "the assets";
  const subs = input.subsectors.length ? input.subsectors.join(" and ") : "the subsector";
  return `Wallets on ${input.chainName} that hold ${assets} and moved a token through one of ${input.protocols} ${subs} contracts in the last 90 days. Users are the wallets that touched those contracts; holders are the wallets with a positive balance of ${assets}.`;
}

/** The lines the pack prompt and AGENTS.md carry per profile. */
export function reachLine(profile: string, r: ReachSummary): string {
  return `Reachable wallets for ${profile}, ${r.overlap.toLocaleString("en-US")} (${r.subsectorUsers.toLocaleString("en-US")} subsector users, ${r.assetHolders.toLocaleString("en-US")} asset holders). ${r.definition} Dune, read ${r.readAt.slice(0, 10)}.`;
}
