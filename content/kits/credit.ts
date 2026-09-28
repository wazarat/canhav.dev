import type { ShapeOption } from "@/content/kits/copy";

/**
 * The eight credit shapes with CanHav's own wording. Which ones a builder
 * sees is decided by shapesFor(), not by this list. Sector-neutral kit copy
 * lives in content/kits/copy.ts, the liquidity shapes in
 * content/kits/liquidity.ts. No em dashes, no colons in UI strings.
 */
export const CREDIT_SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = [
  {
    value: "curated_vault",
    label: "Curated vault",
    blurb:
      "You run a yield strategy on-chain. Depositors hand you their assets, you " +
      "decide where they are lent and under what limits, and you can charge for it.",
  },
  {
    value: "embedded_earn",
    label: "Earn inside your app",
    blurb:
      "Your app already has users and balances. Their idle stablecoins or crypto " +
      "flow into existing on-chain vaults and come back as a savings feature you " +
      "never had to underwrite.",
  },
  {
    value: "collateral_loans",
    label: "Collateral-backed loans",
    blurb:
      "Your users post an asset and borrow against it. You open your own lending " +
      "markets and choose the collateral, the loan asset, the price feed and the " +
      "liquidation line.",
  },
  {
    value: "fixed_rate_yield",
    label: "Fixed-rate yield on your asset",
    blurb:
      "You hold or issue something that earns yield. Wrap it, split it into a " +
      "fixed half and a variable half, and open a market where each half trades " +
      "until a maturity date.",
  },
  {
    value: "embedded_fixed_rate",
    label: "Fixed-rate savings inside your app",
    blurb:
      "Your app offers a rate that is known on the day of deposit and paid at " +
      "maturity, by buying the fixed half of an existing yield market on behalf of " +
      "your users.",
  },
  {
    value: "pt_backed_borrowing",
    label: "Borrow against fixed-rate positions",
    blurb:
      "Holders of a fixed-yield position post it as collateral and borrow the " +
      "underlying. You open the lending market and pick a price feed that " +
      "converges to par at maturity.",
  },
  {
    value: "leveraged_fixed_yield",
    label: "Leveraged fixed-yield loop",
    blurb:
      "Buy the fixed half, post it as collateral, borrow, buy more. The product " +
      "lives or dies on the spread between the fixed rate and the borrow rate " +
      "after fees.",
  },
  {
    value: "yield_token_exposure",
    label: "Yield-token products",
    blurb:
      "Products built on the variable half, which pays the yield of many units of " +
      "the asset for the price of one and decays to zero at maturity.",
  },
];
