import { PRODUCT_SHAPE_VALUES, type SharedStep } from "@/lib/kits";

/**
 * Build steps that are the same work across shapes (M43). A slug is listed
 * here only when ticking it for one shape means the work is also done for
 * the others, one artifact per project rather than one per shape, and every
 * member carries the same editor step. The step is listed once, under the
 * first chosen shape that has it, ticking it ticks every member id, and it
 * counts once in every progress number. Storage and the MCP tools keep the
 * per-shape ids. Optional title and detail read across the shapes; without
 * them the leading item's wording is used. No colons, no em dashes.
 *
 * Kept separate on purpose. invariants (each shape names different
 * numbered statements), rates, market, asset, liquidity, rollover,
 * disclosure, fee, thesis, stack, swaps, health and exit.
 */
export const SHARED_STEPS: readonly SharedStep[] = [
  {
    slug: "review",
    shapes: PRODUCT_SHAPE_VALUES,
    title: "Run the review passes and record the evidence",
    detail:
      "Every pass on the Security step for the shapes you build, with a verdict and the evidence behind it. One review for the whole product.",
  },
  {
    slug: "environment",
    shapes: ["fixed_rate_yield", "embedded_fixed_rate", "pt_backed_borrowing", "yield_token_exposure"],
  },
  {
    slug: "testnet",
    shapes: ["curated_vault", "liquidity_allocator"],
  },
  {
    slug: "markets",
    shapes: ["curated_vault", "liquidity_allocator"],
  },
  {
    slug: "roles",
    shapes: ["curated_vault", "liquidity_allocator", "permissioned_vault"],
    detail:
      "Owner, curator, allocator, sentinel and, for a permissioned vault, the gate maintainer. Name the key behind each and how it is held.",
  },
  {
    slug: "dead-deposit",
    shapes: ["liquidity_allocator", "permissioned_vault"],
  },
  {
    slug: "scenarios",
    shapes: ["liquidity_allocator", "permissioned_vault"],
  },
  {
    slug: "custody",
    shapes: ["fixed_rate_yield", "embedded_fixed_rate"],
  },
  {
    slug: "revenue",
    shapes: ["embedded_earn", "embedded_fixed_rate"],
  },
  {
    slug: "pair",
    shapes: ["basic_amm_pool", "concentrated_liquidity_pool"],
  },
  {
    slug: "manifest",
    shapes: ["basic_amm_pool", "concentrated_liquidity_pool"],
  },
];
