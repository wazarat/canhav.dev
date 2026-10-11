import type { FeatureLists } from "@/lib/kits";

/**
 * Features of the five liquidity shapes (M64). Same rules as the credit
 * list. No colons, no em dashes.
 */
export const LIQUIDITY_FEATURES: FeatureLists = {
  liquidity_allocator: [
    {
      id: "liquidity_allocator.f.public-allocator",
      title: "Public allocator",
      detail: "Anyone may move liquidity between markets inside the caps, so the caps are the product's risk policy.",
      templates: ["morpho-vault-v2"],
    },
    {
      id: "liquidity_allocator.f.cross-protocol",
      title: "Allocates across protocols",
      detail: "Adapters reach more than one lending protocol, so each adapter is a dependency with its own review.",
      templates: ["morpho-vault-v2", "euler-earn", "yearn-v3", "lazy-summer-protocol"],
    },
    {
      id: "liquidity_allocator.f.async-redemptions",
      title: "Async redemptions",
      detail: "Withdrawals settle on a cadence against a published value, so the queue and its timing are part of the surface.",
      templates: ["lagoon-v0", "erc7540-reference"],
    },
  ],
  permissioned_vault: [
    {
      id: "permissioned_vault.f.identity-gate",
      title: "Identity gate",
      detail: "Deposits need an on-chain identity check, so the gate maintainer and the exit rights are written before the first deposit.",
      templates: ["lagoon-v0", "erc3643-t-rex"],
    },
    {
      id: "permissioned_vault.f.permissioned-collateral",
      title: "Permissioned collateral",
      detail: "The vault holds assets with transfer restrictions, so the vault itself must be allow listed by the issuer.",
      templates: ["morpho-vault-v2", "robinhood-stock-tokens"],
    },
    {
      id: "permissioned_vault.f.custodian-nav",
      title: "Custodian reported value",
      detail: "The share price comes from a custodian's report rather than on-chain prices, so the oracle is a person with a key.",
      templates: ["lagoon-v0"],
    },
  ],
  basic_amm_pool: [
    {
      id: "basic_amm_pool.f.native-pair",
      title: "Paired with the native currency",
      detail: "One side is ETH, so the wrapped native and the router's unwrap path are part of the stack. Adds the wrapping step.",
      templates: ["uniswap-v2"],
    },
    {
      id: "basic_amm_pool.f.lp-staking",
      title: "LP token staking",
      detail: "Fungible LP tokens are staked in a rewards contract funded by fees or a treasury.",
      templates: ["uniswap-v2", "synthetix-multirewards"],
    },
    {
      id: "basic_amm_pool.f.pegged-pair",
      title: "Pegged pair",
      detail: "Both sides track the same value, so a stableswap curve fits better than constant product.",
      templates: ["curve-stableswap-ng", "balancer-v3-pools"],
    },
  ],
  concentrated_liquidity_pool: [
    {
      id: "concentrated_liquidity_pool.f.managed-ranges",
      title: "Managed ranges",
      detail: "A vault rebalances positions for depositors, so the strategy and its fee are the product.",
      templates: ["arrakis-v2", "gamma-hypervisor", "arcadia-lp-automation"],
    },
    {
      id: "concentrated_liquidity_pool.f.v4-singleton",
      title: "Built on the v4 singleton",
      detail: "The pool lives in the PoolManager with a pool key and flash accounting rather than its own contract.",
      templates: ["uniswap-v4-pools", "pancakeswap-infinity"],
    },
    {
      id: "concentrated_liquidity_pool.f.bin-liquidity",
      title: "Bin based liquidity",
      detail: "Discrete price bins instead of ticks, with fungible shares per bin.",
      templates: ["lfj-liquidity-book"],
    },
  ],
  hook_pool: [
    {
      id: "hook_pool.f.dynamic-fee",
      title: "Dynamic fee",
      detail: "The swap fee moves with a schedule you write, so the schedule is reviewed as a product decision.",
      templates: ["openzeppelin-uniswap-hooks", "uniswap-v4-hooks-public"],
    },
    {
      id: "hook_pool.f.permissioned-swaps",
      title: "Permissioned swaps",
      detail: "The hook gates who may swap or provide, so the allowlist and its maintainer are part of the design.",
      templates: ["openzeppelin-uniswap-hooks"],
    },
    {
      id: "hook_pool.f.fee-routing",
      title: "Routes fees to a companion contract",
      detail: "A share of swap fees goes to a treasury, a vault or a creator fee recipient, so the recipient and its keys are locked.",
      templates: ["openzeppelin-uniswap-hooks", "uniswap-v4-pools"],
    },
    {
      id: "hook_pool.f.custom-curve",
      title: "Custom curve",
      detail: "The hook replaces the pricing curve, so the accounting deltas and the invariants are yours to prove.",
      templates: ["openzeppelin-uniswap-hooks", "uniswap-v4-hook-template"],
    },
  ],
};
