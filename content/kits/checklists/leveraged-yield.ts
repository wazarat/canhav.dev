import type { ChecklistItem } from "@/lib/kits";

/**
 * Build steps for the two leveraged yield shapes. The loop assumes the
 * fixed income and collateral steps have been taken, so its own list is
 * about leverage, the unwind and the arithmetic. Ids are immutable.
 */

export const LEVERAGED_FIXED_YIELD_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "leveraged_fixed_yield.foundations",
    title: "Finish the fixed-rate and collateral steps first",
    detail: "The market worksheet and the collateral parameter template for the pair the loop runs through are filled and reviewed before any leverage is designed.",
    step: "architecture",
    resources: ["canhav.market-parameters", "canhav.pt-collateral-parameters", "canhav.strategy-leveraged-loop"],
  },
  {
    id: "leveraged_fixed_yield.cap",
    title: "Set the leverage cap and enforce it in the contract",
    detail: "A maximum ratio of fixed halves held to net equity, checked on every turn by the contract, not by the interface.",
    step: "security",
    resources: ["canhav.strategy-leveraged-loop", "canhav.cross-protocol-invariants", "canhav.risk-framework"],
  },
  {
    id: "leveraged_fixed_yield.arithmetic",
    title: "Publish the spread arithmetic and the breakeven borrow rate",
    detail: "Fixed rate times leverage minus borrow rate times leverage minus one minus fees, with the current inputs, on the same screen as the headline.",
    step: "security",
    resources: ["canhav.strategy-leveraged-loop", "canhav.rate-transparency", "pendle.pt-as-collateral"],
  },
  {
    id: "leveraged_fixed_yield.execution",
    title: "Decide how a turn executes and how the unwind runs",
    detail: "One transaction or several, and the reverse path for a user and for a liquidator, each selling into the same pool.",
    step: "architecture",
    resources: ["pendle.router-integration", "pendle.hosted-sdk", "morpho.borrow-assets-flow"],
  },
  {
    id: "leveraged_fixed_yield.rates",
    title: "Label the fixed rate, the borrow rate, the fees and the net on their own lines",
    detail: "From the rate transparency file, with source and time. The multiplier is shown as a multiplier, not folded into a headline.",
    step: "security",
    resources: ["canhav.rate-transparency", "morpho.interest-rates", "pendle.fees"],
  },
  {
    id: "leveraged_fixed_yield.watch",
    title: "Decide who watches the borrow rate and the implied rate",
    detail: "The thresholds, the action at each, and who holds the key that can pause new turns.",
    step: "reality",
    resources: ["pendle.skill-data", "morpho.interest-rates", "canhav.role-model"],
  },
  {
    id: "leveraged_fixed_yield.disclosure",
    title: "Write the disclosure shown before the first turn",
    detail: "The spread can go negative, leverage multiplies the loss, a liquidation before maturity is possible, and the exact rate at which the trade stops paying.",
    step: "security",
    resources: ["canhav.strategy-leveraged-loop", "canhav.rate-transparency"],
  },
  {
    id: "leveraged_fixed_yield.scenarios",
    title: "Run the bad week",
    detail: "Borrow rate up and implied rate up at once, on the fork, with the position at the cap. Record the health path and whether the unwind clears.",
    step: "security",
    resources: ["canhav.strategy-leveraged-loop", "canhav.pt-collateral-parameters", "llamarisk.debt-ceiling"],
  },
  {
    id: "leveraged_fixed_yield.invariants",
    title: "Put the loop under property tests",
    detail: "Cross-protocol invariants 13 and 14, leverage under the cap and the shown rate equal to the computed one, on the fork.",
    step: "security",
    resources: ["canhav.cross-protocol-invariants", "foundry.invariant-testing"],
  },
  {
    id: "leveraged_fixed_yield.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to the evidence before the first real turn.",
    step: "review",
    resources: ["canhav.prelaunch-review"],
  },
];

export const YIELD_TOKEN_EXPOSURE_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "yield_token_exposure.thesis",
    title: "Write the product in one sentence",
    detail: "A view on the rate, a hedge, an incentive capture or a structured payout. If it takes a paragraph it is two products.",
    step: "basics",
    resources: ["pendle.yt-concept", "canhav.architecture-template"],
  },
  {
    id: "yield_token_exposure.market",
    title: "Pick the market and the maturity",
    detail: "Read the markets, the implied rates and the remaining terms from the hosted API, and write down why this one.",
    step: "architecture",
    resources: ["pendle.skill-data", "pendle.api", "canhav.asset-registry"],
  },
  {
    id: "yield_token_exposure.decay",
    title: "Show the decay to zero and the breakeven rate",
    detail: "The variable half is worth nothing on the maturity date. The screen shows the date, the path and the rate the source must earn for the buyer to break even.",
    step: "security",
    resources: ["pendle.yt-concept", "canhav.rate-transparency", "pendle.yt-contract"],
  },
  {
    id: "yield_token_exposure.collection",
    title: "Decide when accrued yield is claimed and by whom",
    detail: "Per user on demand, by the product on a schedule, or at exit, with the gas and the rewards handling written down.",
    step: "architecture",
    resources: ["pendle.yt-contract", "pendle.minting", "pendle.skill-portfolio"],
  },
  {
    id: "yield_token_exposure.rewards",
    title: "Value points and rewards on their own line",
    detail: "At a stated price, with a stated source, never inside the headline, and with a note that they can be zero.",
    step: "security",
    resources: ["canhav.rate-transparency", "pendle.glossary"],
  },
  {
    id: "yield_token_exposure.exit",
    title: "Design the exit before maturity",
    detail: "Selling the variable half sells into the pool at that day's price. The screen shows what it is worth today against what was paid.",
    step: "architecture",
    resources: ["pendle.router", "pendle.skill-swap", "pendle.amm-concept"],
  },
  {
    id: "yield_token_exposure.disclosure",
    title: "Write the disclosure shown before the first purchase",
    detail: "Decay to zero at a date, the breakeven rate, that past yield is not future yield, and who runs the market.",
    step: "security",
    resources: ["canhav.rate-transparency", "pendle.security"],
  },
  {
    id: "yield_token_exposure.environment",
    title: "Plan the fork and the mainnet staging",
    detail: "The variable half exists on mainnet only. Testnet gets a mock; purchases and claims are tested on a fork of mainnet 4663.",
    step: "reality",
    resources: ["canhav.pendle-mainnet-manifest", "canhav.chain-master"],
  },
  {
    id: "yield_token_exposure.invariants",
    title: "Put the two halves under property tests",
    detail: "Cross-protocol invariants 4, 6 and 7, the pair redeems to one unit, the yield distributed equals the yield earned, the index never falls.",
    step: "security",
    resources: ["canhav.cross-protocol-invariants", "pendle.py-index", "foundry.invariant-testing"],
  },
  {
    id: "yield_token_exposure.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to the evidence before the first real purchase.",
    step: "review",
    resources: ["canhav.prelaunch-review"],
  },
];
