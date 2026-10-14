import { type ProjectChain, chainInfo } from "@/lib/chains";

/**
 * Launch venues a token design can ideate for (M69). The CanHav curve runs
 * on every chain a project can pick. Pons and Pools (pools.xyz, the Uniswap
 * launchpad) run on Robinhood Chain mainnet 4663 only, so on an Arbitrum
 * project they are a note and a design warning, never a block. Pure, no
 * imports from lib/ideation so the document module can import this one.
 * Facts and copy live in content/launch-targets.ts.
 */

export const LAUNCH_TARGETS = ["canhav_curve", "pons", "pools_xyz"] as const;
export type LaunchTarget = (typeof LAUNCH_TARGETS)[number];

/** Mainnet chain ids a venue runs on. Empty means every chain a project can pick. */
export const LAUNCH_TARGET_CHAIN_IDS: Record<LaunchTarget, readonly number[]> = {
  canhav_curve: [],
  pons: [4663],
  pools_xyz: [4663],
};

export function isLaunchTarget(v: unknown): v is LaunchTarget {
  return typeof v === "string" && (LAUNCH_TARGETS as readonly string[]).includes(v);
}

/** `any` when the venue runs everywhere, `fits` on the project's mainnet, `off_chain` otherwise. */
export type LaunchTargetFit = "any" | "fits" | "off_chain";

export function launchTargetFit(target: LaunchTarget, chain: ProjectChain): LaunchTargetFit {
  const ids = LAUNCH_TARGET_CHAIN_IDS[target];
  if (ids.length === 0) return "any";
  return ids.includes(chainInfo(chain).mainnetChainId) ? "fits" : "off_chain";
}

/** True when the venue is tied to specific mainnets. */
export function launchTargetChainBound(target: LaunchTarget): boolean {
  return LAUNCH_TARGET_CHAIN_IDS[target].length > 0;
}

/**
 * Venues an external trading pair can be recorded on (M78). Pons and Pools
 * are bound to Robinhood Chain mainnet like the launch targets above;
 * Uniswap and "other" run anywhere. The record itself lives on the project's
 * mainnet block (lib/ideation.ts MainnetPair), labels in content/launch-targets.ts.
 */
export const PAIR_VENUES = ["pons", "pools_xyz", "uniswap", "other"] as const;
export type PairVenue = (typeof PAIR_VENUES)[number];

const PAIR_VENUE_CHAIN_IDS: Record<PairVenue, readonly number[]> = {
  pons: LAUNCH_TARGET_CHAIN_IDS.pons,
  pools_xyz: LAUNCH_TARGET_CHAIN_IDS.pools_xyz,
  uniswap: [],
  other: [],
};

export function isPairVenue(v: unknown): v is PairVenue {
  return typeof v === "string" && (PAIR_VENUES as readonly string[]).includes(v);
}

/** True when the venue is tied to specific mainnets. */
export function pairVenueChainBound(venue: PairVenue): boolean {
  return PAIR_VENUE_CHAIN_IDS[venue].length > 0;
}

/** True when the venue runs on the project's mainnet (or on every mainnet). */
export function pairVenueFits(venue: PairVenue, chain: ProjectChain): boolean {
  const ids = PAIR_VENUE_CHAIN_IDS[venue];
  return ids.length === 0 || ids.includes(chainInfo(chain).mainnetChainId);
}

/** The venue a design ideates for, read defensively from any market block. */
export function launchTargetOf(doc: { market?: { launchTarget?: unknown } } | null | undefined): LaunchTarget | null {
  const v = doc?.market?.launchTarget;
  return isLaunchTarget(v) ? v : null;
}
