import type { ShapeOption } from "@/content/kits/copy";

/**
 * The three derivatives shapes (M65), one per subsector, with CanHav's own
 * wording. Sector-neutral kit copy lives in content/kits/copy.ts. No em
 * dashes, no colons in UI strings.
 */
export const DERIVATIVES_SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = [
  {
    value: "perp_exchange",
    building: "a perpetuals venue",
    label: "Perpetuals venue",
    blurb:
      "Your users open leveraged long and short positions that never expire. You " +
      "pick the counterparty model, a shared pool or a book with a matching engine, " +
      "the feed that marks positions, and the liquidation line.",
    examples: [
      "A perps front end on a shared order book, branded for your community, with your own fee tier",
      "A stock token perps market marked by a Chainlink feed during market hours and frozen outside them",
      "One pool that takes the other side of ETH and BTC trades, with funding paid between longs and shorts",
    ],
  },
  {
    value: "option_vault",
    building: "an option vault",
    label: "Option vault",
    blurb:
      "Depositors hand you collateral and your vault writes or buys options on a " +
      "schedule. You choose the underlying, the strike rule, the expiry cycle, where " +
      "the options settle and who takes the other side.",
    examples: [
      "A weekly covered call vault on a token your community holds, with the premium shown before each roll",
      "A cash-secured put vault that buys the dip on a stock token at a strike you publish",
      "A vault that writes options against concentrated liquidity positions instead of holding spot",
    ],
  },
  {
    value: "delta_neutral_vault",
    building: "a delta neutral yield product",
    label: "Delta neutral yield",
    blurb:
      "Depositors earn funding or basis while the price exposure is hedged away. You " +
      "hold the long leg, open the short leg on a perps venue, and keep the two inside " +
      "a band you rebalance.",
    examples: [
      "A dollar-like vault that holds staked ETH and shorts the same amount of ETH perps for the funding",
      "A basis trade product for a treasury that wants yield without a directional view",
      "A hedged liquidity position with the rebalance rule and the band written down before the first deposit",
    ],
  },
];
