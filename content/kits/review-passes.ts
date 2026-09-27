import { KIT_CATALOG_IDS } from "@/content/kits/catalog";
import { type ReviewPass, assertReviewPasses } from "@/lib/kits";

const VAULT_SIDE = ["curated_vault", "embedded_earn", "fixed_rate_yield", "embedded_fixed_rate"] as const;
const BORROW_SIDE = ["collateral_loans", "pt_backed_borrowing", "leveraged_fixed_yield"] as const;
/** Holds or sells the variable half for users. Gets the surface passes without the vault ones. */
const YT_SIDE = ["yield_token_exposure"] as const;
/** Every shape that touches a market with a maturity. */
const MATURITY_SIDE = [
  "fixed_rate_yield",
  "embedded_fixed_rate",
  "pt_backed_borrowing",
  "leveraged_fixed_yield",
  "yield_token_exposure",
] as const;
/** Sells or buys a half at the pool's implied rate on behalf of users. */
const IMPLIED_RATE_SIDE = ["fixed_rate_yield", "embedded_fixed_rate", "leveraged_fixed_yield", "yield_token_exposure"] as const;
const PT_COLLATERAL_SIDE = ["pt_backed_borrowing", "leveraged_fixed_yield"] as const;

/**
 * Pre-launch review passes. The vault-side and borrow-side passes follow the
 * shape of the protocol's own review checkers (wording, attribution,
 * disclosure, rate display, conversion, clarity and safety, discoverability,
 * math); the security passes follow the security workflow and this kit's
 * own rules; the maturity, implied rate, collateral feed, loop and decay
 * passes are the fixed income and leveraged yield additions. Each pass
 * names the resources that define it. Our own wording. Ids are immutable.
 */
export const REVIEW_PASSES: readonly ReviewPass[] = [
  {
    id: "review.wording",
    title: "Wording matches what the contracts do",
    detail: "Every user-facing term (deposit, shares, borrow, collateral, liquidation, maturity) means what the protocol means by it. Evidence is a glossary diff against the docs.",
    shapes: [...VAULT_SIDE, ...BORROW_SIDE, ...YT_SIDE],
    resources: ["morpho.skill-earn-checkers", "morpho.skill-borrow-review"],
  },
  {
    id: "review.attribution",
    title: "The protocol and the curator are named where the user decides",
    detail: "A depositor or borrower can see whose contracts and whose risk decisions they are trusting, on the screen where they commit, not in a footer.",
    shapes: [...VAULT_SIDE, ...BORROW_SIDE, ...YT_SIDE],
    resources: ["morpho.skill-earn-checkers", "morpho.earn-ux"],
  },
  {
    id: "review.disclosure",
    title: "Risks are disclosed before the first commit",
    detail: "Smart contract, oracle, liquidity and curator risks are stated in plain words before the first deposit or borrow, and the user has to pass them to continue.",
    shapes: [...VAULT_SIDE, ...BORROW_SIDE, ...YT_SIDE],
    resources: ["morpho.earn-ux", "morpho.risks", "morpho.skill-earn-review"],
  },
  {
    id: "review.rates",
    title: "Every rate is named, sourced and dated",
    detail: "No single number called yield or APY. Native rate, incentives, fees and net each on their own line with the source and the refresh time. Evidence is a screenshot per surface.",
    shapes: [...VAULT_SIDE, ...BORROW_SIDE, ...YT_SIDE],
    resources: ["morpho.earn-rewards", "morpho.skill-earn-checkers", "canhav.risk-framework"],
  },
  {
    id: "review.conversion",
    title: "Asset and share conversions are shown and bounded",
    detail: "Previews match what the transaction does, rounding favours the vault, and slippage bounds protect the user on every deposit and withdrawal.",
    shapes: VAULT_SIDE,
    resources: ["morpho.vault-mechanics", "eip.erc-5143", "oz.erc-4626"],
  },
  {
    id: "review.math",
    title: "Displayed numbers reproduce from on-chain state",
    detail: "Balances, health, rates and totals shown to a user can be recomputed from contract reads with the same result. Evidence is a script that does it.",
    shapes: [...VAULT_SIDE, ...BORROW_SIDE, ...YT_SIDE],
    resources: ["morpho.skill-earn-checkers", "morpho.market-mechanics", "morpho.ltv-health"],
  },
  {
    id: "review.clarity",
    title: "Irreversible actions are clear and confirmed",
    detail: "Withdrawals, borrows, collateral moves and admin calls show what will happen, in the user's terms, and wait for a confirmation. Simulate, explain, confirm, execute.",
    shapes: "all",
    resources: ["viem.simulate-contract", "canhav.kit-skill"],
  },
  {
    id: "review.discoverability",
    title: "Positions, history and exits are findable",
    detail: "A user can find their position, what it earned or owes, and how to leave, without support. Illiquid or delayed exits are explained where they happen.",
    shapes: [...VAULT_SIDE, ...BORROW_SIDE, ...YT_SIDE],
    resources: ["morpho.skill-earn-checkers", "morpho.vault-mechanics"],
  },
  {
    id: "review.health",
    title: "Position health and liquidation are surfaced before they bite",
    detail: "Borrowers see health, the price that liquidates them, and a warning path. Liquidation copy explains what was taken and why.",
    shapes: BORROW_SIDE,
    resources: ["morpho.ltv-health", "morpho.liquidation", "morpho.skill-borrow-review"],
  },
  {
    id: "review.oracle",
    title: "Stale or missing prices fail safe",
    detail: "Past the staleness threshold, or with the sequencer down, new borrowing stops and repayment still works. Evidence is a test that forces both.",
    shapes: BORROW_SIDE,
    resources: ["pyth.best-practices", "robinhood.oracles-and-price-feeds", "canhav.invariants"],
  },
  {
    id: "review.tokens",
    title: "Every asset passed the token integration checklist",
    detail: "Vault asset, loan asset and collateral each have a research file with a checklist result and no open finding.",
    shapes: "all",
    resources: ["tob.token-integration", "canhav.asset-research-template"],
  },
  {
    id: "review.static",
    title: "Static analysis and standard conformance ran clean",
    detail: "Slither or equivalent over every contract you wrote, ERC conformance checks on anything that claims a standard, findings closed or justified in writing.",
    shapes: "all",
    resources: ["tob.secure-workflow-skill", "tob.workflow"],
  },
  {
    id: "review.invariants",
    title: "Invariants are under property tests",
    detail: "Each numbered invariant in the kit maps to a passing Foundry or Medusa property, or to a written reason it does not apply.",
    shapes: "all",
    resources: ["canhav.invariants", "foundry.invariant-testing", "crytic.medusa-agents"],
  },
  {
    id: "review.keys",
    title: "No admin role sits on a single wallet",
    detail: "Every role in the role model maps to a multisig or a scoped key, timelocked changes are announced where users can see them, and the sentinel holds the least power.",
    shapes: "all",
    resources: ["canhav.role-model", "safe.starter-kit", "oz.access-control"],
  },
  {
    id: "review.environment",
    title: "The deployment target matches what is actually deployed",
    detail: "Nothing assumes a contract exists on testnet that only exists on mainnet, and unofficial addresses were re-verified on the explorer on a recorded date.",
    shapes: "all",
    resources: ["morpho.addresses", "canhav.testnet-manifest", "robinhood.deploy-smart-contracts"],
  },
  {
    id: "review.sy-conformance",
    title: "The wrapper passed the conformance suite and reads the underlying accounting",
    detail: "The protocol's wrapper tests are green in CI on a fork, the exchange rate comes from the vault's accounting and not from a pool, and a loss in the vault lowers it in the same block. Evidence is the CI run and the loss test.",
    shapes: ["fixed_rate_yield"],
    resources: ["canhav.sy-wrapper-checklist", "pendle.sy-tests", "canhav.cross-protocol-invariants"],
  },
  {
    id: "review.maturity",
    title: "Maturity and rollover are disclosed before the first commit",
    detail: "The user sees the maturity date, what happens on the day, and what an early exit costs, on the screen where they commit. Evidence is that screen and the rollover plan with an owner.",
    shapes: MATURITY_SIDE,
    resources: ["canhav.market-parameters", "pendle.pt-concept", "canhav.rate-transparency"],
  },
  {
    id: "review.implied-rate",
    title: "The fixed rate is shown as fixed to maturity and quoted from a simulation",
    detail: "The rate on the screen is the one the purchase executes at, from a simulated quote, labelled as fixed to maturity and for nobody who exits early. Today's implied rate is a separate line. Evidence is a purchase where the quote and the fill match.",
    shapes: IMPLIED_RATE_SIDE,
    resources: ["canhav.rate-transparency", "pendle.hosted-sdk", "pendle.glossary"],
  },
  {
    id: "review.pt-oracle",
    title: "The fixed half is valued by a deterministic discount feed with a fresh timestamp",
    detail: "The lending market reads the discount feed through the timestamp wrapper, never the pool price, the discount rate is written down with its reasoning, and the feed reports par at maturity. Evidence is the market's oracle address, the parameter template and a test at maturity.",
    shapes: PT_COLLATERAL_SIDE,
    resources: ["pendle.linear-discount-oracle", "pendle.oracle-integration", "canhav.pt-collateral-parameters"],
  },
  {
    id: "review.loop-caps",
    title: "Leverage is capped in the contract and the breakeven rate is on the screen",
    detail: "A turn beyond the cap reverts, the breakeven borrow rate is computed from the same inputs the screen shows, and the unwind has been run on a fork under a rate shock. Evidence is the revert test, the screen and the shock run.",
    shapes: ["leveraged_fixed_yield"],
    resources: ["canhav.strategy-leveraged-loop", "canhav.cross-protocol-invariants", "canhav.rate-transparency"],
  },
  {
    id: "review.yt-decay",
    title: "The decay to zero and the breakeven rate are disclosed",
    detail: "Every screen that shows the variable half shows its maturity date, its path to zero and the rate the source must earn to break even, and past yield is never shown as expected yield. Evidence is the screens and the breakeven calculation.",
    shapes: YT_SIDE,
    resources: ["pendle.yt-concept", "canhav.rate-transparency", "pendle.yt-contract"],
  },
  {
    id: "review.cross-protocol",
    title: "Cross-protocol invariants are under property tests on a fork",
    detail: "Each numbered statement in the cross-protocol file that applies to the shape maps to a passing property on a fork of mainnet 4663, with the vault-loss case traced through every seam. Evidence is the mapping table and the test run.",
    shapes: MATURITY_SIDE,
    resources: ["canhav.cross-protocol-invariants", "foundry.invariant-testing", "canhav.pendle-mainnet-manifest"],
  },
];

assertReviewPasses(REVIEW_PASSES, KIT_CATALOG_IDS);
