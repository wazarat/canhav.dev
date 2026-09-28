import type { ChecklistItem } from "@/lib/kits";

/**
 * Build steps for the two liquidity vault shapes, in the order a small team
 * should take them. Each step names the editor step it informs and the
 * catalog resources that help. Ids are immutable. Our own wording.
 */

export const LIQUIDITY_ALLOCATOR_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "liquidity_allocator.thesis",
    title: "Write the market thesis and name the loan asset and its source",
    detail: "Who supplies, who borrows, what yield and disclosure they accept, and whether the asset is raised, held or both. One page with an owner.",
    step: "basics",
    resources: ["canhav.release-gates", "canhav.asset-research-template"],
  },
  {
    id: "liquidity_allocator.markets",
    title: "Approve the markets and cap each one from measured depth",
    detail: "Every cap has a written shock assumption and a depth observation at a size, on a date, on a venue you can use.",
    step: "architecture",
    resources: ["morpho.blue-concepts", "canhav.vault-specification", "llamarisk.debt-ceiling"],
  },
  {
    id: "liquidity_allocator.routing",
    title: "Decide how inventory moves and who may trigger it",
    detail: "By hand, by a bot, through the public allocator, or all three, with the flow caps, the fee and the reallocation budget written down.",
    step: "architecture",
    resources: ["morpho.public-allocator", "morpho.public-allocator-tutorial", "morpho.vault-v2-adapters"],
  },
  {
    id: "liquidity_allocator.buffer",
    title: "Set the cash buffer and the rule that refills it",
    detail: "What stays idle for withdrawals, what triggers a refill, and the disclosure that says how withdrawals work when the buffer is gone.",
    step: "architecture",
    resources: ["canhav.vault-specification", "morpho.vault-mechanics"],
  },
  {
    id: "liquidity_allocator.roles",
    title: "Assign the roles and the keys behind them",
    detail: "Owner, curator, allocator and sentinel each map to a multisig or a scoped key. No role on a single wallet.",
    step: "security",
    resources: ["morpho.vault-v2-roles-tutorial", "canhav.role-model", "safe.docs"],
  },
  {
    id: "liquidity_allocator.dead-deposit",
    title: "Make the dead deposit before the vault is announced",
    detail: "Shares minted to a burn address on the empty vault, with the transaction hash in the specification and a test that the price cannot be inflated.",
    step: "security",
    resources: ["morpho.vault-v2-dead-deposit", "oz.erc-4626"],
  },
  {
    id: "liquidity_allocator.scenarios",
    title: "Walk the six liquidity scenarios on a fork",
    detail: "Weekend gap, oracle pause, sequencer outage, thin market, lender run and depeg, each with the numbers from the model and the cap that held.",
    step: "security",
    resources: ["canhav.liquidity-scenarios", "morpho.liquidation-concept"],
  },
  {
    id: "liquidity_allocator.testnet",
    title: "Deploy through the factory on testnet and note what is mocked",
    detail: "The community fixture gives you markets and a rate model. Oracle and vault factory are yours to supply or mock, and the manifest says which.",
    step: "reality",
    resources: ["morpho.vault-v2-create", "morpho.testnet-community-deployment", "canhav.testnet-manifest"],
  },
  {
    id: "liquidity_allocator.unwind",
    title: "Rehearse the emergency procedures and the unwind",
    detail: "Soft and hard deprecation of a market, a compromised role, and a full unwind with an illiquid adapter, each run on a fork with the evidence kept.",
    step: "reality",
    resources: ["morpho.vault-v2-emergency", "morpho.vault-v2-unwind"],
  },
  {
    id: "liquidity_allocator.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to where the evidence lives. Fail is an honest answer; open is not a launch.",
    step: "review",
    resources: ["canhav.liquidity-prelaunch-review", "canhav.release-gates"],
  },
];

export const PERMISSIONED_VAULT_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "permissioned_vault.eligibility",
    title: "Write the eligibility file before any gate is switched on",
    detail: "Who may deposit, borrow and hold shares, as categories, with the jurisdictions in and out and the onboarding check for each.",
    step: "basics",
    resources: ["canhav.gates-and-eligibility"],
  },
  {
    id: "permissioned_vault.collateral",
    title: "Research the collateral, its issuer, custodian and transfer rules",
    detail: "One research file for the asset, plus the protocol contracts the issuer has allowlisted so it can be supplied, borrowed, bundled and liquidated.",
    step: "architecture",
    resources: ["canhav.asset-research-template", "morpho.permissioned-assets", "robinhood.stock-tokens"],
  },
  {
    id: "permissioned_vault.allowlist",
    title: "Design the allowlist and who maintains it",
    detail: "The contract or service each gate asks, who adds and removes a party, the delay on removal and the audit trail.",
    step: "architecture",
    resources: ["morpho.vault-gates", "canhav.gates-and-eligibility"],
  },
  {
    id: "permissioned_vault.exit-rights",
    title: "Write the exit rights and make the contract enforce them",
    detail: "What a depositor can always do whatever a gate says, including after removal from the list and if the operator disappears.",
    step: "security",
    resources: ["morpho.vault-gates", "canhav.vault-specification"],
  },
  {
    id: "permissioned_vault.price",
    title: "Choose the institutional price source and the adapter that feeds the market",
    detail: "Source, heartbeat, staleness rule, market hours, and what the vault does when the source is closed or paused. New borrowing stops, repayment continues.",
    step: "architecture",
    resources: ["morpho.oracle-concept", "robinhood.oracles-and-price-feeds", "pyth.best-practices"],
  },
  {
    id: "permissioned_vault.multiplier",
    title: "Apply the split multiplier once and never to the feed",
    detail: "For a tokenised stock the on-chain feed is already adjusted. A unit test around a multiplier change proves the collateral is never counted twice.",
    step: "security",
    resources: ["eip.erc-8056", "robinhood.building-with-stock-tokens", "canhav.liquidity-scenarios"],
  },
  {
    id: "permissioned_vault.roles",
    title: "Assign the roles and the keys behind them",
    detail: "Owner, curator, allocator and sentinel each map to a multisig or a scoped key, and the gate maintainer is a role too.",
    step: "security",
    resources: ["morpho.vault-v2-roles-tutorial", "canhav.role-model", "safe.docs"],
  },
  {
    id: "permissioned_vault.dead-deposit",
    title: "Make the dead deposit before the first listed party deposits",
    detail: "Shares minted to a burn address on the empty vault, with the transaction hash in the specification.",
    step: "security",
    resources: ["morpho.vault-v2-dead-deposit"],
  },
  {
    id: "permissioned_vault.scenarios",
    title: "Walk the six scenarios, the oracle pause above all",
    detail: "A paused or closed institutional source is the normal case for this collateral, not the edge case. The test forces it and repayment still works.",
    step: "security",
    resources: ["canhav.liquidity-scenarios"],
  },
  {
    id: "permissioned_vault.testnet",
    title: "Deploy through the factory on testnet with the gates on",
    detail: "A listed and an unlisted party each try every flow. The unlisted one can still withdraw what it holds.",
    step: "reality",
    resources: ["morpho.vault-v2-create", "morpho.testnet-community-deployment", "canhav.vault-specification"],
  },
  {
    id: "permissioned_vault.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to where the evidence lives, the gates pass included.",
    step: "review",
    resources: ["canhav.liquidity-prelaunch-review", "canhav.release-gates"],
  },
];
