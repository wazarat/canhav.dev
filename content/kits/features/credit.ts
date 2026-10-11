import type { FeatureLists } from "@/lib/kits";

/**
 * Features of the eight credit shapes (M64). Each names one choice the
 * team makes about what the product includes, suggests the templates that
 * fit it and, where the choice brings its own work, gates a build step. No
 * colons, no em dashes.
 */
export const CREDIT_FEATURES: FeatureLists = {
  curated_vault: [
    {
      id: "curated_vault.f.permissioned-deposits",
      title: "Permissioned deposits",
      detail: "Only approved wallets may deposit or hold shares. Adds the gate and exit rights step.",
      templates: ["morpho-vault-v2", "lagoon-v0"],
    },
    {
      id: "curated_vault.f.multi-protocol",
      title: "Allocates across protocols",
      detail: "The vault lends into more than one protocol through adapters, so each adapter is a dependency to review.",
      templates: ["morpho-vault-v2", "yearn-v3", "euler-earn", "superform-v2"],
    },
    {
      id: "curated_vault.f.performance-fee",
      title: "Performance fee",
      detail: "The curator takes a share of the yield, so the fee recipient and the rate are public and locked behind a timelock.",
      templates: ["morpho-vault-v2", "yearn-v3"],
    },
  ],
  embedded_earn: [
    {
      id: "embedded_earn.f.per-user-positions",
      title: "One position per user",
      detail: "Every user holds their own vault shares rather than a pooled balance, so custody and withdrawal follow the user.",
      templates: ["morpho-vault-v2", "openzeppelin-erc4626"],
    },
    {
      id: "embedded_earn.f.aggregated",
      title: "Routes to several vaults",
      detail: "Deposits spread across vaults by a rule the app sets, so the rate shown is a blend and each vault is a dependency.",
      templates: ["superform-v2", "yearn-v3", "euler-earn"],
    },
    {
      id: "embedded_earn.f.fiat-onramp",
      title: "Fiat in, fiat out",
      detail: "Users never see the stablecoin. The app converts on both ends, so the rate display and the disclosures carry the conversion.",
      templates: ["paxos-token-contracts"],
    },
  ],
  collateral_loans: [
    {
      id: "collateral_loans.f.oracle-free",
      title: "Oracle free pricing",
      detail: "Lenders set the price buckets, so no feed is needed and a new token can have a market on day one.",
      templates: ["ajna"],
    },
    {
      id: "collateral_loans.f.isolated-markets",
      title: "Isolated markets",
      detail: "One collateral, one loan asset, one price feed per market, so a bad asset cannot drag the others down.",
      templates: ["morpho-blue", "silo-v2", "fraxlend"],
    },
    {
      id: "collateral_loans.f.stock-collateral",
      title: "Stock token collateral",
      detail: "Users borrow against tokenised stocks that only trade in market hours. Adds the hours and halt step.",
      templates: ["chainlink-data-feeds", "robinhood-stock-tokens"],
    },
    {
      id: "collateral_loans.f.single-base-asset",
      title: "One borrowable asset",
      detail: "Every market lends the same base asset against several collaterals, the Compound III model.",
      templates: ["compound-iii-comet"],
    },
  ],
  fixed_rate_yield: [
    {
      id: "fixed_rate_yield.f.own-wrapper",
      title: "Your own yield wrapper",
      detail: "The asset is one you issue, so the standardised yield wrapper and its exchange rate are yours to write and audit.",
      templates: ["pendle-v2", "spectra-v2", "openzeppelin-erc4626"],
    },
    {
      id: "fixed_rate_yield.f.rolling-maturities",
      title: "Rolling maturities",
      detail: "A new market opens before the old one expires, so rollover and liquidity migration are planned work.",
      templates: ["pendle-v2", "spectra-v2"],
    },
    {
      id: "fixed_rate_yield.f.bond-sale",
      title: "Sold as discounted bonds",
      detail: "Fixed terms are sold through an auction rather than an AMM, with vesting at maturity.",
      templates: ["bond-protocol"],
    },
  ],
  embedded_fixed_rate: [
    {
      id: "embedded_fixed_rate.f.term-deposit",
      title: "Term deposit in the app",
      detail: "The user sees a rate and a date, the app buys the fixed half for them and holds it to maturity.",
      templates: ["pendle-v2", "spectra-v2"],
    },
    {
      id: "embedded_fixed_rate.f.early-exit",
      title: "Early exit at market",
      detail: "The user may leave before maturity at the pool's price, so the exit quote and its slippage are shown before they commit.",
      templates: ["pendle-v2"],
    },
    {
      id: "embedded_fixed_rate.f.fixed-rate-lending",
      title: "Fixed rate lending instead of a yield split",
      detail: "The rate comes from a fixed term lending market, not from a principal token.",
      templates: ["morpho-midnight", "notional-v3", "term-finance"],
    },
  ],
  pt_backed_borrowing: [
    {
      id: "pt_backed_borrowing.f.isolated-market",
      title: "Isolated lending market",
      detail: "The principal token is collateral in a market of its own with a discount oracle.",
      templates: ["morpho-blue", "pendle-v2"],
    },
    {
      id: "pt_backed_borrowing.f.vault-collateral",
      title: "Collateral through an escrow vault",
      detail: "The principal token sits in an escrow vault that a borrow vault accepts, the vault kit model.",
      templates: ["euler-vault-kit", "pendle-v2"],
    },
    {
      id: "pt_backed_borrowing.f.maturity-unwind",
      title: "Automatic unwind at maturity",
      detail: "Positions are closed or rolled when the principal matures, so a keeper and its liveness are part of the product.",
      templates: ["pendle-v2"],
    },
  ],
  leveraged_fixed_yield: [
    {
      id: "leveraged_fixed_yield.f.one-click-loop",
      title: "One transaction loop",
      detail: "The loop is built in one transaction with a flash loan, so the recipe and its failure modes are the product.",
      templates: ["defisaver-v3", "instadapp-dsa-connectors", "contango-v2"],
    },
    {
      id: "leveraged_fixed_yield.f.credit-account",
      title: "Credit account leverage",
      detail: "Leverage comes from an isolated credit account with allow listed adapters rather than from a loop you build.",
      templates: ["gearbox-v3", "euler-vault-kit"],
    },
    {
      id: "leveraged_fixed_yield.f.managed-strategy",
      title: "Managed strategy vault",
      detail: "A keeper runs the loop inside limits the team sets and depositors hold shares of it.",
      templates: ["notional-leveraged-vaults", "lazy-summer-protocol", "fluid-vaults"],
    },
  ],
  yield_token_exposure: [
    {
      id: "yield_token_exposure.f.held-to-expiry",
      title: "Held to expiry",
      detail: "The variable half is held and its yield collected until the market ends, so decay is shown as a rate, not a price.",
      templates: ["pendle-v2"],
    },
    {
      id: "yield_token_exposure.f.traded-exposure",
      title: "Traded exposure",
      detail: "Users buy and sell the variable half at the pool's price, so quotes, slippage and the exit are part of the surface.",
      templates: ["pendle-v2", "spectra-v2"],
    },
    {
      id: "yield_token_exposure.f.points-farming",
      title: "Points and rewards",
      detail: "The underlying earns points or external rewards that the variable half collects, so the claim path is a dependency.",
      templates: ["pendle-v2"],
    },
  ],
};
