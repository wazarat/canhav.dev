import type { ChecklistItem } from "@/lib/kits";

/**
 * Build steps for the three pool shapes, in the order a small team should
 * take them. Every list starts on testnet 46630 with the stack the team
 * deploys itself and the manifest that records it. Ids are immutable. Our
 * own wording.
 */

export const BASIC_AMM_POOL_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "basic_amm_pool.pair",
    title: "Name both tokens and pass the token integration checklist",
    detail: "Decimals, transfer behaviour and any fee on transfer, written down for each, before a pair is created around them.",
    step: "architecture",
    resources: ["tob.token-integration", "canhav.pool-parameters"],
  },
  {
    id: "basic_amm_pool.stack",
    title: "Deploy the wrapped native, the factory and the router on testnet 46630",
    detail: "In that order, from pinned commits, with the fee setter on a role-model key. The protocol has nothing on testnet, so this is yours.",
    step: "reality",
    resources: ["canhav.uniswap-deploy-runbook", "uniswap.v2-core", "uniswap.v2-periphery"],
  },
  {
    id: "basic_amm_pool.manifest",
    title: "Fill the testnet manifest as you deploy",
    detail: "Address, commit, compiler, runtime code hash, transaction and verification for every contract. The code reads this file and nothing else.",
    step: "reality",
    resources: ["canhav.uniswap-testnet-manifest-template", "canhav.uniswap-mainnet-manifest"],
  },
  {
    id: "basic_amm_pool.seed",
    title: "Compute the opening ratio and seed through the router",
    detail: "The two amounts from the worksheet at the reference price, sent through the router with minimum amounts and a deadline, never to the pair directly.",
    step: "architecture",
    resources: ["canhav.pool-parameters", "uniswap.v2-providing-liquidity"],
  },
  {
    id: "basic_amm_pool.swaps",
    title: "Build the swap surface with a quote, a slippage bound and a deadline",
    detail: "Exact input and exact output through the router, the quote shown before the send, a warning at the price impact you chose.",
    step: "architecture",
    resources: ["uniswap.v2-swapping", "uniswap.skill-swap-integration"],
  },
  {
    id: "basic_amm_pool.disclosure",
    title: "Disclose divergence loss where a provider commits",
    detail: "The gap between holding and providing when the price moves, on the screen where liquidity is added, with fee income shown against it.",
    step: "security",
    resources: ["uniswap.v2-understanding-returns", "canhav.pool-parameters"],
  },
  {
    id: "basic_amm_pool.fee-switch",
    title: "Decide the protocol fee switch and the key behind it",
    detail: "Off, or on with the recipient behind a multisig from the role model, and the decision written where providers can read it.",
    step: "security",
    resources: ["uniswap.v2-factory-source", "canhav.role-model"],
  },
  {
    id: "basic_amm_pool.invariants",
    title: "Turn the pair invariants into property tests",
    detail: "Statements one to five from the pool invariants file, each a passing Foundry property against the testnet stack with the traces kept.",
    step: "security",
    resources: ["canhav.pool-invariants", "foundry.invariant-testing"],
  },
  {
    id: "basic_amm_pool.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to where the evidence lives.",
    step: "review",
    resources: ["canhav.liquidity-prelaunch-review", "uniswap.v2-audits"],
  },
];

export const CONCENTRATED_LIQUIDITY_POOL_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "concentrated_liquidity_pool.pair",
    title: "Name both currencies and pass the token integration checklist",
    detail: "Decimals, transfer behaviour and whether one side is native currency, written down before a pool key is built around them.",
    step: "architecture",
    resources: ["tob.token-integration", "canhav.pool-parameters"],
  },
  {
    id: "concentrated_liquidity_pool.stack",
    title: "Deploy the pool manager, position manager, quoter, state view, Permit2 and the router on testnet 46630",
    detail: "In that order, from pinned commits, with the protocol fee owner on a role-model key. The singleton is yours on testnet.",
    step: "reality",
    resources: ["canhav.uniswap-deploy-runbook", "uniswap.v4-core", "uniswap.v4-periphery"],
  },
  {
    id: "concentrated_liquidity_pool.manifest",
    title: "Fill the testnet manifest as you deploy",
    detail: "Every contract with its commit, compiler, code hash, transaction and verification. No mainnet address in it, ever.",
    step: "reality",
    resources: ["canhav.uniswap-testnet-manifest-template", "canhav.uniswap-mainnet-manifest"],
  },
  {
    id: "concentrated_liquidity_pool.pool-key",
    title: "Choose the fee tier, the tick spacing and the starting price",
    detail: "Each with a reason in the worksheet, the price converted to its square-root form with the tool named, and the pool id written down once it exists.",
    step: "architecture",
    resources: ["canhav.pool-parameters", "uniswap.v4-poolmanager-concept", "uniswap.v4-tickmath"],
  },
  {
    id: "concentrated_liquidity_pool.first-position",
    title: "Initialise the pool and mint the first position in one transaction",
    detail: "Lower tick, upper tick, liquidity and the two maximum amounts through the position manager, so the pool never exists without depth.",
    step: "architecture",
    resources: ["uniswap.v4-create-pool", "uniswap.v4-sdk-create-pool", "uniswap.v4-liquidity-amounts"],
  },
  {
    id: "concentrated_liquidity_pool.ranges",
    title: "Decide the range policy and how an out-of-range position is shown",
    detail: "The ranges the product suggests, and a position that has left its range shown as one token earning nothing, not as a loss hidden in a total.",
    step: "architecture",
    resources: ["uniswap.v4-concentrated-liquidity", "uniswap.v4-mint-position"],
  },
  {
    id: "concentrated_liquidity_pool.swaps",
    title: "Quote before every send and route through the Universal Router",
    detail: "The quoter from a read, never in a transaction, then the router with a slippage bound and a deadline.",
    step: "architecture",
    resources: ["uniswap.v4-sdk-quoting", "uniswap.v4-routing", "uniswap.universal-router"],
  },
  {
    id: "concentrated_liquidity_pool.reads",
    title: "Read state through the lens and index the events",
    detail: "Price, liquidity and fee growth from the state view, and the events into a table or a subgraph, because nobody indexes testnet for you.",
    step: "architecture",
    resources: ["uniswap.v4-state-view-guide", "uniswap.v4-subgraph"],
  },
  {
    id: "concentrated_liquidity_pool.invariants",
    title: "Turn the pool invariants into property tests",
    detail: "Statements six to ten from the pool invariants file, each a passing Foundry property against the testnet stack with the traces kept.",
    step: "security",
    resources: ["canhav.pool-invariants", "uniswap.v4-security", "foundry.invariant-testing"],
  },
  {
    id: "concentrated_liquidity_pool.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to where the evidence lives.",
    step: "review",
    resources: ["canhav.liquidity-prelaunch-review", "uniswap.v4-security"],
  },
];

export const HOOK_POOL_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: "hook_pool.concentrated-first",
    title: "Take the concentrated pool steps first",
    detail: "The stack, the manifest, the pool key and the first position are the same. This list adds the hook and assumes those are done.",
    step: "basics",
    resources: ["uniswap.skill-hook-generator", "canhav.hook-design"],
  },
  {
    id: "hook_pool.design",
    title: "Fill the hook design file before writing the hook",
    detail: "What it does in one sentence, which pools, and why a hook rather than a separate contract or an off-chain rule.",
    step: "architecture",
    resources: ["canhav.hook-design", "uniswap.v4-hooks-concept"],
  },
  {
    id: "hook_pool.permissions",
    title: "Declare the permissions and mine the address",
    detail: "Only the callbacks the hook implements, the salt from the miner recorded, and the bits checked on the address after deployment.",
    step: "architecture",
    resources: ["uniswap.v4-hook-deployment", "uniswap.hookminer-source", "uniswap.hooks-library-source"],
  },
  {
    id: "hook_pool.template",
    title: "Start from the template and the base hook",
    detail: "The Foundry project with core, periphery and test routers already wired, and the base hook whose callbacks you override.",
    step: "architecture",
    resources: ["uniswap.v4-template", "uniswap.basehook-source", "uniswap.v4-your-first-hook"],
  },
  {
    id: "hook_pool.fee-schedule",
    title: "Write the fee schedule with its bounds and who can change it",
    detail: "Inputs, levels, a maximum enforced in the contract, the delay on changes, and how the current fee is shown on the swap screen.",
    step: "architecture",
    resources: ["uniswap.v4-dynamic-fees", "uniswap.lpfee-library-source", "uniswap.stable-pair-dynamic-fees"],
  },
  {
    id: "hook_pool.accounting",
    title: "Reconcile every delta the hook returns",
    detail: "Which deltas on which callbacks, where the tokens come from and go to, and a test that every unlock settles to zero with the hook attached.",
    step: "security",
    resources: ["uniswap.v4-custom-accounting", "uniswap.v4-unlock-deltas", "canhav.pool-invariants"],
  },
  {
    id: "hook_pool.dependencies",
    title: "List every external input and what stale means",
    detail: "Oracle, market hours, a registry, each with the callback that reads it and what the hook does when it is stale or down.",
    step: "security",
    resources: ["canhav.hook-design", "robinhood.oracles-and-price-feeds"],
  },
  {
    id: "hook_pool.adversarial",
    title: "Simulate sandwiches, just-in-time liquidity and oracle manipulation",
    detail: "Against the hook on a fork, with the results recorded, and the security foundations skill run over the code.",
    step: "security",
    resources: ["uniswap.v4-security", "uniswap.skill-security-foundations"],
  },
  {
    id: "hook_pool.testnet",
    title: "Deploy the hook on testnet, initialise its pool with liquidity and exercise every callback",
    detail: "Address, salt, commit and transaction in the manifest, and a script that hits every enabled callback with the hashes kept.",
    step: "reality",
    resources: ["canhav.uniswap-deploy-runbook", "canhav.uniswap-testnet-manifest-template"],
  },
  {
    id: "hook_pool.invariants",
    title: "Turn the pool and hook invariants into property tests",
    detail: "Statements eleven and twelve, and six to ten again with the hook attached, each a passing Foundry property with the traces kept.",
    step: "security",
    resources: ["canhav.pool-invariants", "foundry.invariant-testing"],
  },
  {
    id: "hook_pool.review",
    title: "Run the review passes and record the evidence",
    detail: "Every pass on the Security step has a verdict and a pointer to where the evidence lives, the hook passes included.",
    step: "review",
    resources: ["canhav.liquidity-prelaunch-review", "uniswap.v4-security", "uniswap.stable-pair-audit"],
  },
];
