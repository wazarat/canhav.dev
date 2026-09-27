import type { ChecklistItem } from "@/lib/kits";

/**
 * Build steps for the three fixed income shapes, in the order a small team
 * should take them. Each step names the editor step it informs and the
 * catalog resources that help. Ids are immutable. Our own wording.
 */

export const FIXED_RATE_YIELD_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "fixed_rate_yield.asset",
    title: "Name the yield source and pass the token integration checklist",
    detail: "One research file for the asset and a registry entry that says what it earns and where. Nothing is wrapped before this exists.",
    step: "architecture",
    resources: ["canhav.asset-research-template", "canhav.asset-registry", "tob.token-integration"],
  },
  {
    id: "fixed_rate_yield.wrapper",
    title: "Choose the wrapper and run the wrapper checklist",
    detail: "A common wrapper over a vault share where one fits, a custom one only with the conformance suite green in CI.",
    step: "architecture",
    resources: ["canhav.sy-wrapper-checklist", "pendle.common-sy", "pendle.sy-interface", "pendle.sy-tests"],
  },
  {
    id: "fixed_rate_yield.exchange-rate",
    title: "Prove the exchange rate follows the underlying accounting",
    detail: "A test where the vault takes a loss and the rate falls in the same block, and one where a donation cannot inflate it.",
    step: "security",
    resources: ["canhav.cross-protocol-invariants", "pendle.sy-concept", "oz.erc-4626"],
  },
  {
    id: "fixed_rate_yield.market",
    title: "Fill the market parameter worksheet",
    detail: "Maturity, rate band, initial implied rate, fee and seed liquidity, each with the rate history that justifies it.",
    step: "architecture",
    resources: ["canhav.market-parameters", "pendle.common-market-deployments", "pendle.amm-concept"],
  },
  {
    id: "fixed_rate_yield.liquidity",
    title: "Decide who seeds the pool and how the seed leaves",
    detail: "The amount, the source of funds, the target depth to a one percent move and the exit plan, written down before launch.",
    step: "reality",
    resources: ["canhav.market-parameters", "pendle.amm-whitepaper", "pendle.fees"],
  },
  {
    id: "fixed_rate_yield.custody",
    title: "Decide who holds the fixed half",
    detail: "Each user in their own wallet, or the product on their behalf with a claim. State which and why in the architecture document.",
    step: "architecture",
    resources: ["canhav.strategy-vault-yield-to-fixed-rate", "canhav.architecture-template"],
  },
  {
    id: "fixed_rate_yield.rollover",
    title: "Write the rollover plan",
    detail: "What happens the week before maturity and on the day, who acts, and what users see. A market expires; the product should not.",
    step: "reality",
    resources: ["canhav.market-parameters", "pendle.pt-concept"],
  },
  {
    id: "fixed_rate_yield.rates",
    title: "Label every rate from the rate transparency file",
    detail: "Yield source rate, implied rate, fixed rate, fees, each on its own line with source and time. The fixed rate is fixed to maturity and for nobody who exits early.",
    step: "security",
    resources: ["canhav.rate-transparency", "pendle.glossary"],
  },
  {
    id: "fixed_rate_yield.environment",
    title: "Plan the fork and the mainnet staging",
    detail: "No wrapper factory or market factory exists on testnet 46630. Integration runs on a fork of mainnet 4663 against the manifest addresses, then staging behind caps.",
    step: "reality",
    resources: ["pendle.robinhood-manifest", "canhav.pendle-mainnet-manifest", "canhav.chain-master"],
  },
  {
    id: "fixed_rate_yield.invariants",
    title: "Put the wrapper and the two halves under property tests",
    detail: "Cross-protocol invariants 1 to 7 map to a test each, run on the fork, or to a written reason one does not apply.",
    step: "security",
    resources: ["canhav.cross-protocol-invariants", "foundry.invariant-testing", "pendle.py-index"],
  },
  {
    id: "fixed_rate_yield.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to the evidence before the seed liquidity moves.",
    step: "review",
    resources: ["canhav.prelaunch-review", "pendle.security"],
  },
];

export const EMBEDDED_FIXED_RATE_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "embedded_fixed_rate.markets",
    title: "Pick the markets the app buys into and the rule for choosing a maturity",
    detail: "Which wrappers, which maturities, and what would make you stop offering one. Read the markets from the hosted API, not from memory.",
    step: "architecture",
    resources: ["pendle.skill-data", "pendle.api", "canhav.asset-registry"],
  },
  {
    id: "embedded_fixed_rate.custody",
    title: "Decide the custody model",
    detail: "Each user holds their own fixed half, or the app holds one position and owes claims. Write down which and why.",
    step: "architecture",
    resources: ["canhav.strategy-vault-yield-to-fixed-rate", "eip.erc-1271"],
  },
  {
    id: "embedded_fixed_rate.purchase",
    title: "Design the purchase flow",
    detail: "Quote from a simulation through the hosted SDK, a slippage bound on the fixed half received, an approval method, then simulate, explain, confirm, execute.",
    step: "architecture",
    resources: ["pendle.hosted-sdk", "pendle.skill-swap", "viem.simulate-contract", "eip.eip-2612"],
  },
  {
    id: "embedded_fixed_rate.promise",
    title: "Write down what the user is promised and what they are not",
    detail: "The rate at purchase, held to maturity, in the wrapped unit. Not a guarantee by anyone, not fixed in the underlying if the vault takes a loss.",
    step: "security",
    resources: ["canhav.rate-transparency", "pendle.pt-concept", "canhav.strategy-vault-yield-to-fixed-rate"],
  },
  {
    id: "embedded_fixed_rate.exit",
    title: "Design the early exit and its pricing",
    detail: "Selling the fixed half sells into the pool at that day's implied rate. The screen shows the difference from the fixed rate before the user confirms.",
    step: "architecture",
    resources: ["pendle.router", "pendle.amm-concept", "canhav.rate-transparency"],
  },
  {
    id: "embedded_fixed_rate.rollover",
    title: "Decide what happens at maturity",
    detail: "Auto-roll into the next market, redeem to the underlying, or ask. Each has its own disclosure and its own gas.",
    step: "architecture",
    resources: ["canhav.market-parameters", "pendle.minting"],
  },
  {
    id: "embedded_fixed_rate.rates",
    title: "Show the fixed rate, today's implied rate and fees on their own lines",
    detail: "Each with source and time, labelled from the rate transparency file. No line called yield.",
    step: "security",
    resources: ["canhav.rate-transparency", "pendle.fees", "pendle.glossary"],
  },
  {
    id: "embedded_fixed_rate.disclosures",
    title: "Write the disclosures shown before the first purchase",
    detail: "Maturity date, early exit terms, the vault loss case, who runs the market and who runs the wrapper.",
    step: "security",
    resources: ["pendle.security", "canhav.rate-transparency"],
  },
  {
    id: "embedded_fixed_rate.revenue",
    title: "Choose how the app earns",
    detail: "A fee on purchase, a spread, or none, written down with its ceiling.",
    step: "basics",
    resources: ["pendle.fees"],
  },
  {
    id: "embedded_fixed_rate.environment",
    title: "Plan the fork and the mainnet staging",
    detail: "The hosted SDK and API serve mainnet only. Testnet gets mocked quotes; real purchases are tested on a fork of mainnet 4663.",
    step: "reality",
    resources: ["pendle.hosted-sdk", "canhav.pendle-mainnet-manifest", "canhav.chain-master"],
  },
  {
    id: "embedded_fixed_rate.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to the evidence before the first real purchase.",
    step: "review",
    resources: ["canhav.prelaunch-review"],
  },
];

export const PT_BACKED_BORROWING_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "pt_backed_borrowing.assets",
    title: "Research the fixed half and the loan asset",
    detail: "A research file and a registry entry for the fixed half that walks back to the wrapper, the vault and the underlying, and one for the loan asset.",
    step: "architecture",
    resources: ["canhav.asset-research-template", "canhav.asset-registry", "tob.token-integration", "pendle.pt-contract"],
  },
  {
    id: "pt_backed_borrowing.feed",
    title: "Choose the deterministic discount feed and its rate",
    detail: "Never the pool price. The discount rate sits above the usual implied rate, the timestamp wrapper is in the path, the underlying's feed is chained when the loan asset differs.",
    step: "architecture",
    resources: ["pendle.linear-discount-oracle", "pendle.linear-discount-params", "pendle.oracle-integration", "canhav.pt-collateral-parameters"],
  },
  {
    id: "pt_backed_borrowing.parameters",
    title: "Fill the collateral parameter template",
    detail: "Threshold from the enabled set, maximum term at listing, caps from the pool's exit depth, the liquidation incentive that covers the pool discount.",
    step: "security",
    resources: ["canhav.pt-collateral-parameters", "pendle.pt-as-collateral", "canhav.risk-framework"],
  },
  {
    id: "pt_backed_borrowing.scenarios",
    title: "Write the four scenarios down",
    detail: "The implied rate doubles, the vault loses five percent, the pool drains to a tenth, maturity arrives with open positions. What the feed, the health and the queue do in each.",
    step: "security",
    resources: ["canhav.pt-collateral-parameters", "canhav.strategy-fixed-half-as-collateral", "chaoslabs.aave-v3-methodology"],
  },
  {
    id: "pt_backed_borrowing.market",
    title: "Create the market and record its parameters",
    detail: "The market address in the registry under the fixed half's collateralIn, with the feed, the rate model and the threshold it was created with.",
    step: "reality",
    resources: ["morpho.create-market", "morpho.oracle-deploy", "canhav.asset-registry"],
  },
  {
    id: "pt_backed_borrowing.maturity",
    title: "Decide what the borrower sees near maturity and what the market does on the day",
    detail: "The feed reaches par. Positions are closed, rolled or repaid, and the borrower knew the date from the first screen.",
    step: "architecture",
    resources: ["canhav.pt-collateral-parameters", "pendle.pt-concept", "canhav.strategy-fixed-half-as-collateral"],
  },
  {
    id: "pt_backed_borrowing.liquidity",
    title: "Measure the exit depth and decide who liquidates",
    detail: "How much of the fixed half sells at a two percent move, on a date, and whether a liquidator can receive and resell it.",
    step: "architecture",
    resources: ["pendle.amm-concept", "morpho.liquidation", "canhav.pt-collateral-parameters"],
  },
  {
    id: "pt_backed_borrowing.health",
    title: "Design the position health surface",
    detail: "Health, the implied rate that liquidates, the maturity date and a warning path, in the borrower's terms.",
    step: "security",
    resources: ["morpho.ltv-health", "morpho.skill-borrow-review"],
  },
  {
    id: "pt_backed_borrowing.environment",
    title: "Plan the fork and the mainnet staging",
    detail: "The fixed half and its feed exist on mainnet only. Testnet gets a mock fixed half and a mock feed; the real pair is tested on a fork of mainnet 4663.",
    step: "reality",
    resources: ["canhav.pendle-mainnet-manifest", "morpho.testnet-community-deployment", "canhav.chain-master"],
  },
  {
    id: "pt_backed_borrowing.invariants",
    title: "Put the collateral seam under property tests",
    detail: "Cross-protocol invariants 8 to 12 map to a test each on the fork, with the vault-loss case traced to the borrower's health.",
    step: "security",
    resources: ["canhav.cross-protocol-invariants", "foundry.invariant-testing", "canhav.invariants"],
  },
  {
    id: "pt_backed_borrowing.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to the evidence before the market takes real collateral.",
    step: "review",
    resources: ["canhav.prelaunch-review", "morpho.skill-borrow-review"],
  },
];
