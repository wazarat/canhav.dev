import type { ShapeOption } from "@/content/kits/copy";

/**
 * The five liquidity shapes with CanHav's own wording. The two other shapes
 * a Vaults project can build, Curated vault and Earn inside your app, are
 * credit shapes that span both sectors and live in content/kits/credit.ts.
 * Which ones a builder sees is decided by shapesFor(). No em dashes, no
 * colons in UI strings.
 */
export const LIQUIDITY_SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = [
  {
    value: "liquidity_allocator",
    label: "Liquidity allocator",
    blurb:
      "You hold or raise a pool of the loan asset and route it among markets you " +
      "have approved, moving inventory to where borrowers are and pulling it back " +
      "under stress. The product is depth, not a headline rate.",
  },
  {
    value: "permissioned_vault",
    label: "Permissioned vault",
    blurb:
      "Deposits and borrowing are limited to an allowlist. Institutions post " +
      "tokenised or real-world collateral with a custodian and an institutional " +
      "price behind it, and exit rights are written down before the first deposit.",
  },
  {
    value: "basic_amm_pool",
    label: "Basic AMM pool",
    blurb:
      "Two tokens in one pair priced by a constant product. Anyone can swap, " +
      "liquidity providers hold fungible shares of the pair, and the fee on every " +
      "trade accrues to them.",
  },
  {
    value: "concentrated_liquidity_pool",
    label: "Concentrated liquidity pool",
    blurb:
      "Liquidity providers choose a price range instead of the whole curve, so the " +
      "same capital makes a deeper market near the price. Pools live in one " +
      "singleton contract and the first liquidity goes in with the initialisation.",
  },
  {
    value: "hook_pool",
    label: "Pool with custom hooks",
    blurb:
      "A concentrated pool plus a contract of your own that runs around swaps and " +
      "liquidity changes. Fees that move with conditions, custom accounting, gating " +
      "and custom curves, with the permissions encoded in the hook's address.",
  },
];
