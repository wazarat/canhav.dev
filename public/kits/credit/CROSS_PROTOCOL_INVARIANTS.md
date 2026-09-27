# Cross-protocol invariants

`INVARIANTS.md` states what must hold inside a vault and inside a market.
These statements hold across the seam, where a vault share becomes a wrapped
unit, a wrapped unit becomes a fixed half and a variable half, and a fixed
half becomes collateral. Testing each protocol alone misses every one of
them. Each is phrased once in words and once as a property sketch.

## Wrapper over a vault

1. What the wrapper previews is what it delivers. previewDeposit on the
   wrapper matches the wrapped units actually received, within one unit of
   rounding, rounding against the depositor.
   `previewDeposit(x) - 1 <= deposit(x) <= previewDeposit(x)`

2. The wrapper's exchange rate moves with the vault's accounting and with
   nothing else. Over any block, the change in exchange rate equals the
   change in the vault's share price, net of the wrapper's stated fee.
   `delta(exchangeRate) == delta(vault.convertToAssets(1 share)) - fee`

3. A vault loss reaches the wrapper in the same block it is recognised. After
   a market the vault allocates to records bad debt, the wrapper's exchange
   rate in that block is lower.
   `vaultLoss(block) implies exchangeRate(block) < exchangeRate(block - 1)`

## The two halves

4. The two halves together are worth the wrapped unit, before maturity.
   Holding one fixed half and one variable half of the same market entitles
   the holder to exactly one wrapped unit, and redeeming the pair returns it.
   `redeemPair(1 PT, 1 YT) == 1 SY unit`

5. Redemption at maturity is bounded by what exists. The sum of underlying
   paid to fixed-half holders at maturity never exceeds the underlying the
   wrapper holds for that market.
   `sum(redeemed underlying) <= wrapper underlying attributable to the market`

6. The variable half's accrued yield equals the yield the wrapped units
   earned. Over any period, the yield distributed to variable-half holders
   equals the change in exchange rate times the units backing the market.
   `sum(YT yield) == (exchangeRate(t1) - exchangeRate(t0)) * unitsBacking`

7. The index that converts between wrapped units and halves never decreases.
   `pyIndex(t1) >= pyIndex(t0)`

## The fixed half as collateral

8. Collateral value never exceeds the deterministic feed. The lending market
   values the fixed half at or below the discount feed's price, never at the
   pool price.
   `collateralValue(PT) <= discountFeed(PT) * underlyingPrice`

9. The feed never exceeds par. Before and at maturity, the discount feed
   reports at most one unit of the underlying.
   `discountFeed(PT, t) <= 1 for all t`

10. The feed is monotone in time. With the discount rate fixed, the feed's
    price rises toward par and never falls.
    `discountFeed(t1) >= discountFeed(t0) for t1 > t0`

11. An expired fixed half is valued at par, never at a pre-expiry
    assumption. After maturity, the feed reports par and the market either
    accepts redemption or rejects new borrowing.
    `t >= maturity implies discountFeed == 1`

12. A vault loss propagates to the collateral. A loss in the underlying vault
    lowers the wrapper's exchange rate, which lowers the value of the fixed
    half in the underlying, which lowers the borrower's health in the same
    block.
    `vaultLoss(block) implies health(position, block) < health(position, block - 1)`

## The loop

13. Leverage stays under the cap. The ratio of fixed halves held to net
    equity never exceeds the configured maximum, over any sequence of
    borrow-and-buy steps.
    `PT held * price / equity <= maxLeverage`

14. The spread is what is shown. The rate the product reports for a looped
    position equals fixed rate times leverage minus borrow rate times
    (leverage minus one) minus fees, with the same inputs the screen names.

## Writing the tests

- Run them on a fork of mainnet 4663 against the real wrapper, market and
  feed contracts, with your own mocks only where the pack says nothing is
  deployed.
- One handler per seam. A vault handler that can take a loss, a wrapper
  handler, a market handler that trades halves, a lending handler that
  borrows and liquidates. Let the fuzzer interleave them.
- Map each numbered statement to a test in the design document. A
  statement with no test is a promise.
