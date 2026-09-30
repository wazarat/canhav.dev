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
    examples: [
      "A USDC vault for a payroll app's idle balances, lent only to markets you approve",
      "A conservative stablecoin strategy for a DAO treasury with published caps and a timelock",
      "A yield product for a regional exchange that wants a rate it can explain to its customers",
    ],
  },
  {
    value: "embedded_earn",
    label: "Earn inside your app",
    blurb:
      "Your app already has users and balances. Their idle stablecoins or crypto " +
      "flow into existing on-chain vaults and come back as a savings feature you " +
      "never had to underwrite.",
    examples: [
      "A savings tab in a neobank that routes idle USDC into curated vaults",
      "An earn toggle in a creator payout app so balances grow between withdrawals",
      "Interest on merchant float in a point of sale app, one isolated position per merchant",
    ],
  },
  {
    value: "collateral_loans",
    label: "Collateral-backed loans",
    blurb:
      "Your users post an asset and borrow against it. You open your own lending " +
      "markets and choose the collateral, the loan asset, the price feed and the " +
      "liquidation line.",
    examples: [
      "Borrowing against tokenised stock balances without selling them",
      "A margin line for a trading app's users with a liquidation line you set",
      "Stablecoin loans against a partner token that no large venue lists",
    ],
  },
  {
    value: "fixed_rate_yield",
    label: "Fixed-rate yield on your asset",
    blurb:
      "You hold or issue something that earns yield. Wrap it, split it into a " +
      "fixed half and a variable half, and open a market where each half trades " +
      "until a maturity date.",
    examples: [
      "A fixed rate on your vault's shares, sold as a term deposit with a maturity date",
      "A fixed half and a variable half of a staked asset your community already holds",
      "A rate market on a tokenised treasury fund so buyers can lock in the yield",
    ],
  },
  {
    value: "embedded_fixed_rate",
    label: "Fixed-rate savings inside your app",
    blurb:
      "Your app offers a rate that is known on the day of deposit and paid at " +
      "maturity, by buying the fixed half of an existing yield market on behalf of " +
      "your users.",
    examples: [
      "Lock 1,000 USDC for 90 days inside a wallet and show the maturity amount on day one",
      "A term savings tier in a neobank that rolls into the next maturity",
      "A fixed-rate option beside the variable one in an existing earn tab",
    ],
  },
  {
    value: "pt_backed_borrowing",
    label: "Borrow against fixed-rate positions",
    blurb:
      "Holders of a fixed-yield position post it as collateral and borrow the " +
      "underlying. You open the lending market and pick a price feed that " +
      "converges to par at maturity.",
    examples: [
      "Let holders of a fixed-rate position borrow stablecoins against it until maturity",
      "A lending market for a partner's fixed-yield token with a price feed that converges to par",
      "Cash for term depositors who need liquidity before the maturity date",
    ],
  },
  {
    value: "leveraged_fixed_yield",
    label: "Leveraged fixed-yield loop",
    blurb:
      "Buy the fixed half, post it as collateral, borrow, buy more. The product " +
      "lives or dies on the spread between the fixed rate and the borrow rate " +
      "after fees.",
    examples: [
      "A one-click loop with the turns capped in the contract and the breakeven rate on screen",
      "A leveraged fixed-rate strategy inside a curated vault for depositors who opt in",
      "A desk tool that opens, monitors and unwinds loops",
    ],
  },
  {
    value: "yield_token_exposure",
    label: "Yield-token products",
    blurb:
      "Products built on the variable half, which pays the yield of many units of " +
      "the asset for the price of one and decays to zero at maturity.",
    examples: [
      "A structured note that pays more when the rate runs above what the market implies",
      "A points and airdrop farming product built on the variable half",
      "A rate speculation market for traders with the decay curve shown up front",
    ],
  },
];
