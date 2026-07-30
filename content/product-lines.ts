/**
 * Product-line cards for the landing page showcase.
 *
 * This file is the single edit point for that section: change a card's
 * title, description, tags, or badge here and the page updates. Add or
 * remove entries freely — the grid reflows on its own.
 *
 * `graphic` picks the decorative terminal-window visual from
 * components/home/productGraphics.tsx ("meters" | "yields" | "metrics" |
 * "table" | "chart" | "governance").
 */

export type Tint = "blue" | "violet" | "cyan";

export type GraphicKey =
  | "meters"
  | "yields"
  | "metrics"
  | "table"
  | "chart"
  | "governance";

export interface ProductLine {
  /** Card heading. */
  title: string;
  /** Small mono label in the fake terminal-window title bar. */
  monoLabel: string;
  /** One-to-two sentence description under the heading. */
  description: string;
  /** Small badge next to the heading (e.g. "12 tracked", "beta"). Empty string hides it. */
  badge: string;
  /** Uppercase chips at the bottom of the card. */
  tags: string[];
  /** Radial glow color behind the terminal window. */
  tint: Tint;
  /** Which decorative graphic to render. */
  graphic: GraphicKey;
}

/** Placeholder seed: the six sectors from the current site. Swap at will. */
export const PRODUCT_LINES: ProductLine[] = [
  {
    title: "Credit",
    monoLabel: "markets · util",
    description:
      "Money markets and lending books: utilization, borrow and supply APRs, collateral health and bad-debt exposure.",
    badge: "8 tracked",
    tags: ["lending", "cdp"],
    tint: "blue",
    graphic: "meters",
  },
  {
    title: "Staking",
    monoLabel: "staking · apr",
    description:
      "Validator and liquid-staking flows: staked supply, real yield, unstaking queues and reward curves.",
    badge: "6 tracked",
    tags: ["liquid staking", "restaking"],
    tint: "violet",
    graphic: "yields",
  },
  {
    title: "Derivatives",
    monoLabel: "perps · live",
    description:
      "Perps and options venues: open interest, funding rates, basis and liquidation depth.",
    badge: "7 tracked",
    tags: ["perps", "options"],
    tint: "cyan",
    graphic: "metrics",
  },
  {
    title: "RWAs",
    monoLabel: "rwa · tvl",
    description:
      "Tokenized treasuries and off-chain assets: backing, attestation cadence, issuer and custody.",
    badge: "9 tracked",
    tags: ["treasuries", "private credit"],
    tint: "blue",
    graphic: "table",
  },
  {
    title: "Liquidity",
    monoLabel: "tvl · 90d",
    description:
      "DEX pools and routing: TVL, depth at price, fees, volume and impermanent-loss exposure.",
    badge: "8 tracked",
    tags: ["dex", "amm"],
    tint: "violet",
    graphic: "chart",
  },
  {
    title: "Governance & Underwriting",
    monoLabel: "gov · treasury",
    description:
      "Protocol governance and on-chain cover: proposals, quorum and treasury allocation alongside cover capacity, premiums and claims history.",
    badge: "5 tracked",
    tags: ["governance", "cover"],
    tint: "cyan",
    graphic: "governance",
  },
];
