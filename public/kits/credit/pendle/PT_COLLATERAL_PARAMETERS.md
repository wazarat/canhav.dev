# Fixed half as collateral, parameter template

One copy per lending market that accepts the fixed half of a yield market as
collateral. The fixed half is a bond, not a token like any other. It has a
maturity, it converges to one unit of the underlying, and until then it
trades at a discount that a pool sets and that a lending market must not
trust blindly.

## The position

| Field | Value |
|-------|-------|
| Fixed half | `[address, maturity date, link to the registry entry]` |
| Underlying asset | `[...]` |
| Loan asset | `[usually the underlying itself]` |
| Lending market | `[address once created]` |

## Oracle

| Field | Value | Why |
|-------|-------|-----|
| Feed type | Deterministic discount, converging to par at maturity | A pool price can be moved by one large trade. A discount cannot. |
| Discount rate assumed | `[percent per year]` | Set it above the implied rate the pool usually shows, so the feed sits under the market price in normal times and a borrower cannot borrow against optimism. |
| Underlying feed | `[the underlying asset's own price feed]` | The discount gives the fixed half's value in the underlying. The underlying still needs a price in the loan asset unless they are the same. |
| Timestamp wrapper | `[address]` | Deterministic feeds report no update time. Many lending markets reject that. The wrapper reports a fresh timestamp. |
| Sequencer check | `[how the market behaves when the sequencer is down]` | |
| What happens at maturity | `[the feed reaches par; positions should be closed or rolled, state how]` | |

## Risk parameters

| Field | Value | Why |
|-------|-------|-----|
| Liquidation threshold | `[from the enabled set]` | The discount rate and the threshold work together. A high discount rate with a high threshold cancels out. |
| Maximum term at listing | `[days to maturity]` | The longer the term, the larger the gap between the pool price and par and the more a shock can widen it. |
| Supply cap | `[amount]` | Bounded by how much of the fixed half can be sold into the pool during a liquidation without moving it. |
| Borrow cap | `[amount]` | |
| Exit depth measured | `[amount sellable at a 2 percent move, date]` | Liquidators need to sell the fixed half before maturity. If the pool is thin, they will not bid. |
| Liquidation incentive | `[percent]` | Must cover the discount a liquidator eats when selling into the pool. |

## Scenarios written down

- [ ] The implied rate doubles overnight. What happens to the feed, the
      position health, and the liquidation queue.
- [ ] The underlying vault takes a 5 percent loss. Trace it through the
      wrapper's exchange rate, the fixed half's value, the feed, the
      position.
- [ ] The pool is drained to a tenth of its depth. Can liquidations still
      clear.
- [ ] Maturity arrives with open positions. Who acts and what the borrower
      sees.

## Sign off

| Field | Value |
|-------|-------|
| Asset research file for the fixed half | `[link]` |
| Reviewed by | `[names, date]` |
| Linked justification in the risk framework | `[section]` |
