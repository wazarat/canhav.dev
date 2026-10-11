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

/** The venue a design ideates for, read defensively from any market block. */
export function launchTargetOf(doc: { market?: { launchTarget?: unknown } } | null | undefined): LaunchTarget | null {
  const v = doc?.market?.launchTarget;
  return isLaunchTarget(v) ? v : null;
}
