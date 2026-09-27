# Risk framework

A repeatable way to choose the numbers a credit product depends on, and to
write down why. It borrows the shape of published parameter methodologies
(agent-based simulation for thresholds and incentives, price shock to
liquidatable collateral to available liquidity for caps) without depending on
any one vendor. The resource pack links the originals.

Every parameter below gets a paragraph in the product's design document that
names its inputs, the date they were observed, and who signed off.

## 1. Oracle policy

For every price the product reads.

| Question | Answer |
|----------|--------|
| Source feed and wrapper contract | `[...]` |
| Update model (push, pull, deterministic) | `[...]` |
| Heartbeat and expected update interval | `[...]` |
| Staleness threshold, and what happens past it | `[...]` |
| Confidence or deviation bound, if the source provides one | `[...]` |
| Sequencer down behaviour | `[...]` |
| Market hours of the underlying, if it is not a 24 hour asset | `[...]` |
| Known gaps (weekends, halts, corporate actions) | `[...]` |

A product that lends against an asset whose reference market closes at night
must decide what its price means at 3 a.m. Write that decision here.

## 2. Liquidation threshold

The loan to value at which a position may be liquidated is fixed per market.
Choose it from the enabled set (the testnet manifest lists 0%, 38.5%, 62.5%,
77%, 86%, 91.5%, 94.5%, 96.5% and 98%) using, at minimum

- historical volatility of the collateral against the loan asset over the
  longest window available, and the worst observed drawdown in one oracle
  heartbeat
- the liquidation incentive at that threshold and whether it still covers
  price impact after a shock
- correlation between collateral and loan asset (a stablecoin against a
  stablecoin is not the same risk as a volatile asset against a stablecoin)

Record the shock you assumed and the buffer that remains after it.

## 3. Exposure caps

Supply caps for vault allocations and borrow caps for markets follow the same
chain of reasoning.

1. Assume a price shock. State the size and why.
2. Compute the collateral that becomes liquidatable under it.
3. Measure the liquidity available to absorb that collateral on chain, with
   price impact, at the time of writing.
4. Find the largest exposure at which a rational liquidator still profits.
5. Set the cap below that number with a stated margin.

Repeat when liquidity changes materially. Write the date of the liquidity
observation next to the cap.

## 4. Vault exposure

For a curated vault, per market and per adapter

- maximum share of total assets allowed in one market
- maximum share in one collateral type across markets
- minimum idle liquidity kept for withdrawals
- reallocation rules, who may move capital and how far in one action

## 5. Rate display

Not a risk parameter, but a risk. Every rate shown to a user carries a name
(native supply rate, borrow rate, incentive rate, fee, net), a source and a
refresh time. One blended number without those three things fails review.

## 6. Bad debt

Write down what happens if a market ends up with debt that collateral cannot
cover. Who absorbs it, in what order, and what the user is told.

## 7. Emergency conditions

The observable conditions under which the product pauses, and who can act.
Oracle stale beyond `[...]`, sequencer down for `[...]`, utilisation above
`[...]`, a governance change queued on a dependency. For each, the action and
the role that takes it (see `ROLE_MODEL.md`).

## 8. Review cadence

Parameters are revisited on a schedule, not only after incidents. State the
interval and what triggers an unscheduled review.
