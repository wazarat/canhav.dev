# Strategy 2. Borrow against the fixed half

The opposite direction. A holder of a fixed half posts it as collateral in
an isolated lending market and borrows the underlying.

## The path

Yield-bearing asset, then wrapped unit, then fixed half, then collateral in
a lending market, then a loan in the underlying.

1. The user holds a fixed half, bought or minted as in strategy 1.
2. The product has created an isolated market whose collateral is that fixed
   half and whose loan asset is the underlying.
3. The market's price feed is the deterministic discount feed for the fixed
   half, wrapped so the market sees a fresh timestamp, multiplied by the
   underlying's own feed when the loan asset differs.
4. The user posts the fixed half and borrows up to the liquidation threshold
   times the feed value.
5. At maturity the fixed half is worth par. The position is either closed,
   rolled into a new market, or repaid.

## What the product must decide

- The discount rate the feed assumes, and therefore how far below the pool
  price the feed sits in normal times.
- The liquidation threshold from the enabled set, and the maximum days to
  maturity at listing.
- Caps, from the depth of the pool a liquidator would sell into.
- What the borrower sees as maturity approaches and what happens on the
  day.

## What can go wrong

- The implied rate jumps. The pool price of the fixed half falls, the feed
  does not, and a liquidator who seizes the collateral must sell it below
  the feed value. The liquidation incentive has to cover that gap or nobody
  liquidates.
- The underlying vault takes a loss. It propagates through the wrapper to
  the fixed half and to the position's health in the same block. Invariant
  12 tests exactly this.
- The sequencer is down and the feed's timestamp wrapper keeps reporting
  fresh. Decide what the market does before it happens.

## Evidence to keep

The collateral parameter template for this market, the registry entry for
the fixed half with the lending market listed under `collateralIn`, the four
scenarios written down, and invariants 8 to 12 under test.
