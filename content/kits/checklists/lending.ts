import type { ChecklistItem } from "@/lib/kits";

/**
 * Build steps for the three lending shapes, in the order a small team should
 * take them. Each step names the editor step it informs and the catalog
 * resources that help. Ids are immutable. Our own wording throughout.
 */

export const CURATED_VAULT_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "curated_vault.asset",
    title: "Name the vault asset and pass the token integration checklist",
    detail: "One research file for the asset, checklist result recorded, before anything else is designed around it.",
    step: "architecture",
    resources: ["canhav.asset-research-template", "tob.token-integration"],
  },
  {
    id: "curated_vault.markets",
    title: "Choose the markets the vault may allocate to and cap each",
    detail: "Every cap has a written shock assumption and a liquidity observation with a date.",
    step: "architecture",
    resources: ["morpho.vault-v2-adapters", "canhav.risk-framework", "llamarisk.debt-ceiling"],
  },
  {
    id: "curated_vault.roles",
    title: "Decide the roles and the keys behind them",
    detail: "Owner, curator, allocator and sentinel each map to a multisig or a scoped key. No role on a single wallet.",
    step: "security",
    resources: ["morpho.vault-v2-roles", "canhav.role-model", "safe.starter-kit"],
  },
  {
    id: "curated_vault.timelock",
    title: "Set the timelock and what depositors can do while a change is queued",
    detail: "Long enough for a depositor to read the change and leave.",
    step: "security",
    resources: ["morpho.vault-v2-concepts", "oz.access-control"],
  },
  {
    id: "curated_vault.fee",
    title: "Choose the fee and its recipient",
    detail: "Management, performance or none, with the ceiling written down and the recipient behind the timelock.",
    step: "architecture",
    resources: ["morpho.vault-v2-create"],
  },
  {
    id: "curated_vault.first-deposit",
    title: "Plan first-deposit protection",
    detail: "A dead deposit or equivalent so the first real depositor cannot be front-run into a worthless share.",
    step: "security",
    resources: ["oz.erc-4626", "morpho.vault-v2-checklist"],
  },
  {
    id: "curated_vault.testnet",
    title: "Deploy through the factory on testnet and note what is mocked",
    detail: "The community fixture gives you markets and a rate model. Oracle and vault factory are yours to supply or mock.",
    step: "reality",
    resources: ["morpho.vault-v2-create", "morpho.testnet-community-deployment", "canhav.testnet-manifest"],
  },
  {
    id: "curated_vault.monitoring",
    title: "Set up monitoring and reallocation",
    detail: "Who or what rebalances, how often, and what it may not do.",
    step: "reality",
    resources: ["morpho.vault-v2-checklist", "morpho.public-allocator"],
  },
  {
    id: "curated_vault.invariants",
    title: "Write the invariants and property tests",
    detail: "Every numbered invariant in the kit maps to a test or to a written reason it does not apply.",
    step: "security",
    resources: ["canhav.invariants", "foundry.invariant-testing", "crytic.medusa-agents"],
  },
  {
    id: "curated_vault.review",
    title: "Walk the configuration checklist and the review passes",
    detail: "Evidence per pass, recorded before the first real deposit.",
    step: "review",
    resources: ["morpho.vault-v2-checklist", "morpho.skill-earn-review", "tob.secure-workflow-skill"],
  },
];

export const EMBEDDED_EARN_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "embedded_earn.vaults",
    title: "Pick the vaults deposits route to, and the rule for choosing them",
    detail: "Which curators, which assets, and what would make you remove one.",
    step: "architecture",
    resources: ["morpho.api-vaults", "morpho.earn-get-started"],
  },
  {
    id: "embedded_earn.custody",
    title: "Decide the custody model",
    detail: "Each user holds their own shares, or the app holds one position. Write down which and why.",
    step: "architecture",
    resources: ["morpho.earn-get-started", "eip.erc-1271"],
  },
  {
    id: "embedded_earn.deposit",
    title: "Design the deposit flow",
    detail: "Approval method, simulation before send, slippage bounds on the share conversion.",
    step: "architecture",
    resources: ["eip.eip-2612", "uniswap.permit2", "viem.simulate-contract", "eip.erc-5143"],
  },
  {
    id: "embedded_earn.withdraw",
    title: "Design the withdrawal flow, including the illiquid case",
    detail: "What the user sees when the vault cannot pay out at once.",
    step: "architecture",
    resources: ["morpho.vault-mechanics"],
  },
  {
    id: "embedded_earn.rates",
    title: "Show every rate on its own line with a source and a refresh time",
    detail: "Native yield, incentives and fees never collapse into one number.",
    step: "security",
    resources: ["morpho.earn-rewards", "morpho.earn-ux"],
  },
  {
    id: "embedded_earn.disclosures",
    title: "Write the disclosures shown before the first deposit",
    detail: "Risk, custody, exit terms and who the curator is.",
    step: "security",
    resources: ["morpho.earn-ux", "morpho.risks"],
  },
  {
    id: "embedded_earn.revenue",
    title: "Decide how the app earns",
    detail: "Fee wrapper, referral or nothing, and where it shows up for the user.",
    step: "basics",
    resources: ["morpho.earn-revenue"],
  },
  {
    id: "embedded_earn.environment",
    title: "Build against a testnet vault or a mainnet fork, and note which",
    detail: "No curated vault exists on testnet by default. Deploy one against the community fixture or fork mainnet.",
    step: "reality",
    resources: ["morpho.testnet-community-deployment", "canhav.testnet-manifest"],
  },
  {
    id: "embedded_earn.review",
    title: "Run the earn review passes and checkers",
    detail: "Evidence per pass, recorded before the feature is visible to users.",
    step: "review",
    resources: ["morpho.skill-earn-review", "morpho.skill-earn-checkers"],
  },
];

export const COLLATERAL_LOANS_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "collateral_loans.assets",
    title: "Choose the loan asset and the collateral, one research file each",
    detail: "The token integration checklist runs before either is approved.",
    step: "architecture",
    resources: ["canhav.asset-research-template", "tob.token-integration"],
  },
  {
    id: "collateral_loans.oracle",
    title: "Choose and deploy the oracle with a staleness rule and a sequencer check",
    detail: "Source feed, wrapper, heartbeat, what happens past the staleness threshold.",
    step: "architecture",
    resources: ["morpho.oracle-concept", "pyth.morpho-guide", "morpho.oracle-deploy", "robinhood.oracles-and-price-feeds"],
  },
  {
    id: "collateral_loans.threshold",
    title: "Pick the liquidation threshold from the enabled set",
    detail: "With the shock you assumed and the buffer that remains after it.",
    step: "security",
    resources: ["morpho.ltv-health", "canhav.risk-framework", "chaoslabs.aave-v3-methodology"],
  },
  {
    id: "collateral_loans.rate-model",
    title: "Choose the rate model",
    detail: "Understand how utilisation moves the borrow rate your users pay.",
    step: "architecture",
    resources: ["morpho.interest-rates"],
  },
  {
    id: "collateral_loans.market",
    title: "Create the market on testnet against the community fixture",
    detail: "Collateral, loan asset, oracle, rate model and threshold are fixed at creation. Check them twice.",
    step: "reality",
    resources: ["morpho.create-market", "morpho.testnet-community-deployment", "canhav.testnet-manifest"],
  },
  {
    id: "collateral_loans.liquidity",
    title: "Source liquidity and decide whether the public allocator is used",
    detail: "Which vaults supply the market and whether shared liquidity can be pulled on demand.",
    step: "architecture",
    resources: ["morpho.public-allocator", "morpho.public-allocator-tutorial"],
  },
  {
    id: "collateral_loans.flows",
    title: "Build the borrow, repay, add and withdraw collateral flows",
    detail: "Simulate, explain, confirm, execute on every one.",
    step: "architecture",
    resources: ["morpho.borrow-assets-flow", "viem.simulate-contract"],
  },
  {
    id: "collateral_loans.health",
    title: "Build the position health surface and warnings",
    detail: "What the borrower sees, when they are warned, and what a liquidation looks like to them.",
    step: "security",
    resources: ["morpho.ltv-health", "morpho.liquidation"],
  },
  {
    id: "collateral_loans.fee",
    title: "Decide the origination or interface fee",
    detail: "And disclose it next to the borrow rate, not in a footer.",
    step: "basics",
    resources: ["morpho.monetize-borrow"],
  },
  {
    id: "collateral_loans.invariants",
    title: "Write the invariants and property tests",
    detail: "Debt accounting, health versus liquidatable, stale oracle blocks borrowing.",
    step: "security",
    resources: ["canhav.invariants", "euler.vault-kit-whitepaper", "foundry.invariant-testing"],
  },
  {
    id: "collateral_loans.review",
    title: "Run the borrow review passes",
    detail: "Evidence per pass, recorded before real collateral is posted.",
    step: "review",
    resources: ["morpho.skill-borrow-review", "tob.secure-workflow-skill"],
  },
];
