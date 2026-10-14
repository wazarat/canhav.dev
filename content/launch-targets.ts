import type { ChipOption } from "@/components/ui/ChipGroup";
import { MARKET_FACTS } from "@/content/ideation";
import { PROJECT_CHAIN_INFO } from "@/lib/chains";
import {
  type LaunchTarget,
  type LaunchTargetFit,
  PAIR_VENUES,
  type PairVenue,
  launchTargetChainBound,
  pairVenueChainBound,
} from "@/lib/launch-targets";

/**
 * Launch venue copy (M69). The venue facts were checked on 2026-10-11
 * against docs.ponsfamily.com (Pons) and blog.uniswap.org, "Pools.trade: a
 * new way to launch on Robinhood Chain" (Pools, pools.xyz). Pons documents an
 * active factory with a 70/30 creator and protocol split and a legacy
 * factory at 90/10; Pools documents a 0.25% LP fee with an optional creator
 * share. Both run on Robinhood Chain mainnet 4663 only (Pools also lists Arc,
 * which no CanHav project builds on). Re-check before quoting a number. No
 * colons, no em dashes.
 */

const ROBINHOOD_MAINNET = PROJECT_CHAIN_INFO.robinhood_testnet.mainnetName;

export interface LaunchTargetInfo {
  label: string;
  /** One line under the chips once this venue is chosen. */
  blurb: string;
  url: string;
  /** What the venue fixes, shown in the "Fixed by the venue" block and the design export. */
  facts: readonly string[];
}

export const LAUNCH_TARGET_INFO: Record<LaunchTarget, LaunchTargetInfo> = {
  canhav_curve: {
    label: "CanHav curve",
    blurb:
      "The bonding curve every design launches on first, on the project's testnet. The design's supply and snapshot hash are committed on-chain at launch.",
    url: "/launch",
    facts: MARKET_FACTS,
  },
  pons: {
    label: "Pons",
    blurb:
      "The launchpad on Robinhood Chain mainnet where creator fees pay the team. Take the design there once it has launched on the CanHav curve on testnet.",
    url: "https://ponsfamily.com",
    facts: [
      `Runs on ${ROBINHOOD_MAINNET} mainnet only. Every launch has a fixed supply of 1 billion tokens`,
      "Trades carry a 1% fee split between the creator and the protocol. The split is fixed per token at launch (70 to the creator on the current factory, 90 on the legacy one)",
      "The creator share is claimed from the Pons interface and paid to the deployer or a fee redirect address, so a timelock or a treasury can receive it",
      "The launch fee is 0.0005 ETH. Name, symbol and the fee settings are locked at creation",
    ],
  },
  pools_xyz: {
    label: "Pools",
    blurb:
      "The Uniswap launchpad on Robinhood Chain mainnet (pools.xyz, also pools.trade). Every launch ends in a Uniswap v4 pool with liquidity locked for good.",
    url: "https://pools.xyz",
    facts: [
      `Runs on ${ROBINHOOD_MAINNET} mainnet only. Every launch has a fixed supply of 1 billion tokens and ends in a Uniswap v4 pool`,
      "Crowd Launch fills bids over a four hour window and trades once the launch reaches a 10,000 dollar FDV, otherwise every order is refunded. Instant Launch trades on a curve from creation",
      "The pool charges a 0.25% LP fee that compounds into a locked position the creator cannot remove. There is no launchpad fee",
      "A creator may enable a creator share of the LP fee at launch, and the creator buys in the launch block so no sniper is first",
    ],
  },
};

export function launchTargetLabel(target: LaunchTarget): string {
  return LAUNCH_TARGET_INFO[target].label;
}

export const LAUNCH_TARGET_COPY = {
  label: "Launch venue",
  hint: "Where the token first trades. Every design launches on the CanHav curve on testnet first.",
  /** Chip note beside the venues that run on one mainnet. */
  robinhoodOnly: `${ROBINHOOD_MAINNET} mainnet`,
  factsTitle: "Fixed by the venue",
  arbitrumNote: (venue: string) =>
    `${venue} runs on ${ROBINHOOD_MAINNET} mainnet. This design's project builds on Arbitrum Sepolia, so the testnet launch stays on the CanHav curve and a ${venue} launch would need a ${ROBINHOOD_MAINNET} project.`,
  unlinkedNote: (venue: string) =>
    `${venue} runs on ${ROBINHOOD_MAINNET} mainnet. Link this design to a project so the studio can check the chain.`,
  /** Under the market build step and on the public token page. */
  ideatingFor: (venue: string) => `Ideating for ${venue}.`,
  /** The handoff and launch panel line (fit `fits` or `any`). */
  handoff: (venue: string) =>
    `Ideating for ${venue}. Launch on the CanHav curve on Robinhood testnet first, then take the design to ${venue} on ${ROBINHOOD_MAINNET} mainnet.`,
  /** The same line for a venue the project's chain does not have. */
  handoffOffChain: (venue: string) =>
    `Ideating for ${venue}, which runs on ${ROBINHOOD_MAINNET} mainnet. This project builds on Arbitrum Sepolia, so the launch stays on the CanHav curve unless the project moves chain.`,
  /** For the curve itself. */
  handoffCurve: "Ideating for the CanHav curve. Launch on the project's testnet from the Launch tab once the design is published.",
  /** Pack and export section titles. */
  packTitle: "Launch venue",
  ponsFitTitle: "Templates with a Pons fit",
  ponsFitNone: "No template on this project's steps carries a Pons fit line.",
} as const;

/** Chip options in table order, the single-mainnet venues carrying the note. */
export const LAUNCH_TARGET_OPTIONS: ReadonlyArray<ChipOption<LaunchTarget>> = (
  Object.keys(LAUNCH_TARGET_INFO) as LaunchTarget[]
).map((value) => ({
  value,
  label: LAUNCH_TARGET_INFO[value].label,
  ...(launchTargetChainBound(value) ? { note: LAUNCH_TARGET_COPY.robinhoodOnly } : {}),
}));

/** Labels for the venues an external trading pair can be recorded on (M78). */
export const PAIR_VENUE_LABELS: Record<PairVenue, string> = {
  pons: LAUNCH_TARGET_INFO.pons.label,
  pools_xyz: LAUNCH_TARGET_INFO.pools_xyz.label,
  uniswap: "Uniswap",
  other: "Another venue",
};

export function pairVenueLabel(venue: PairVenue): string {
  return PAIR_VENUE_LABELS[venue];
}

/** Select options in catalog order, the single-mainnet venues carrying the note. */
export const PAIR_VENUE_OPTIONS: ReadonlyArray<{ value: PairVenue; label: string; chainBound: boolean }> =
  PAIR_VENUES.map((value) => ({
    value,
    label: pairVenueChainBound(value) ? `${PAIR_VENUE_LABELS[value]} (${LAUNCH_TARGET_COPY.robinhoodOnly})` : PAIR_VENUE_LABELS[value],
    chainBound: pairVenueChainBound(value),
  }));

/** The one line a project surface shows for the linked design's venue. */
export function launchTargetHandoffLine(target: LaunchTarget, fit: LaunchTargetFit): string {
  if (target === "canhav_curve") return LAUNCH_TARGET_COPY.handoffCurve;
  const venue = launchTargetLabel(target);
  return fit === "off_chain" ? LAUNCH_TARGET_COPY.handoffOffChain(venue) : LAUNCH_TARGET_COPY.handoff(venue);
}
