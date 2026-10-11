import type { FeatureLists } from "@/lib/kits";

/** Features of the three derivatives shapes (M65). No colons, no em dashes. */
export const DERIVATIVES_FEATURES: FeatureLists = {
  perp_exchange: [
    {
      id: "perp_exchange.f.shared-book",
      title: "Shared order book",
      detail: "Orders match on an existing network's book and your front end is the venue. Adds the broker and fee split step.",
      templates: ["orderly-evm", "lighter-contracts", "gains-gtrade"],
    },
    {
      id: "perp_exchange.f.pool-counterparty",
      title: "Pool as counterparty",
      detail: "One pool takes the other side of every trade and earns the spread. Adds the pool risk step.",
      templates: ["gmx-v2-synthetics", "ostium-v2", "gmx-v1"],
    },
    {
      id: "perp_exchange.f.stock-markets",
      title: "Stock token markets",
      detail: "Markets on stock tokens that only trade in market hours. Adds the hours and halt step.",
      templates: ["chainlink-data-feeds", "robinhood-stock-tokens", "ostium-v2"],
    },
    {
      id: "perp_exchange.f.pull-oracle",
      title: "Pull oracle pricing",
      detail: "The price arrives with the trade and is verified on-chain. Adds the update fee and staleness step.",
      templates: ["chainlink-data-streams", "pyth-evm-sdk"],
    },
    {
      id: "perp_exchange.f.keepers",
      title: "Keeper execution",
      detail: "Orders are requested in one transaction and executed by a keeper in another. Adds the keeper liveness step.",
      templates: ["gmx-v2-synthetics", "synthetix-v3-perps"],
    },
    {
      id: "perp_exchange.f.referrals",
      title: "Referral codes and fee tiers",
      detail: "Fee tiers and referral codes on your venue, paid from your share.",
      templates: ["orderly-evm"],
    },
  ],
  option_vault: [
    {
      id: "option_vault.f.covered-calls",
      title: "Covered calls",
      detail: "The vault holds the underlying and sells calls above the price each cycle. Adds the premium sale step.",
      templates: ["ribbon-v2-theta-vaults", "hegic-herge", "opyn-gamma-protocol"],
    },
    {
      id: "option_vault.f.cash-secured-puts",
      title: "Cash-secured puts",
      detail: "The vault holds cash and sells puts below the price each cycle. Shares the premium sale step with covered calls.",
      templates: ["ribbon-v2-theta-vaults", "opyn-gamma-protocol"],
    },
    {
      id: "option_vault.f.lp-backed",
      title: "Options against liquidity positions",
      detail: "Options are written from concentrated liquidity ranges rather than spot. Adds the ranges step.",
      templates: ["panoptic-v2", "stryke-clamm", "panoptic-hypovault"],
    },
    {
      id: "option_vault.f.async-deposits",
      title: "Async deposits and NAV",
      detail: "Deposits and redemptions settle on a cadence against a published NAV. Adds the NAV step.",
      templates: ["lagoon-v0", "panoptic-hypovault", "erc7540-reference"],
    },
    {
      id: "option_vault.f.stock-underlying",
      title: "Stock token underlying",
      detail: "The underlying is a stock token with market hours. Adds the hours step.",
      templates: ["chainlink-data-feeds", "robinhood-stock-tokens"],
    },
  ],
  delta_neutral_vault: [
    {
      id: "delta_neutral_vault.f.perp-hedge",
      title: "Hedge on a perps venue",
      detail: "The short leg is a perpetual on a venue you do not control. Adds the venue risk step.",
      templates: ["gmx-v2-synthetics", "lighter-contracts", "ethena-usde"],
    },
    {
      id: "delta_neutral_vault.f.staked-long",
      title: "Staked long leg",
      detail: "The long leg earns staking yield on top of funding. Adds the yield accounting step.",
      templates: ["ethena-usde"],
    },
    {
      id: "delta_neutral_vault.f.async-vault",
      title: "Async deposits and NAV",
      detail: "Deposits and redemptions settle on a cadence against a NAV that counts both legs. Adds the NAV step.",
      templates: ["lagoon-v0", "erc7540-reference", "enzyme"],
    },
    {
      id: "delta_neutral_vault.f.strategist",
      title: "External strategist",
      detail: "A strategist or keeper calls the rebalance within limits you set. Adds the limits step.",
      templates: ["sommelier-cellars", "enzyme", "yearn-v3", "morpho-vault-v2"],
    },
    {
      id: "delta_neutral_vault.f.lp-hedge",
      title: "Hedged liquidity position",
      detail: "The long leg is a liquidity position whose exposure drifts. Adds the drift step.",
      templates: ["rage-dn-gmx-vaults"],
    },
  ],
};
