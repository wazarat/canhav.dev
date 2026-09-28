# Liquidity scenarios

The hardest failure of a lender-facing product is a position that looks
solvent and cannot be liquidated into the loan asset at the displayed price,
or a vault that owes withdrawals it cannot pay. These six scenarios are
walked on a fork before there is a depositor to protect, and again before
every cap increase. For each, keep the numbers in the model below.

## The six

| Scenario | Test to run | Control to have | Evidence to keep |
|----------|-------------|-----------------|------------------|
| Weekend gap | Freeze the reference feed at Friday's close, shock Monday's price by the largest move the asset has had in a decade, run liquidations | A borrow guard around the close, a buffer in the threshold, caps raised in stages | The run, the losses, the cap that would have held |
| Oracle pause or corporate action | Set the pause flag while the feed still returns a value, then try to borrow, repay and withdraw | New risk rejected, safe repayment and withdrawal still work | A test that forces both |
| Sequencer outage and recovery | Stop the sequencer, let the feed go stale, restart, replay the queued transactions | A grace period on feed age and a recovery order for liquidations | The timeline and the order |
| Thin collateral market | Liquidate at increasing size and record the slippage at each | A cap and a threshold derived from executable depth, not from the quoted price | The depth table with a date |
| Lender run | Withdraw in waves while borrowers keep their loans | A cash buffer, an exit queue and a disclosure that says how withdrawals work | The waves, the buffer that ran out, the disclosure |
| Stablecoin depeg or bridge delay | Stress the loan asset's price and delay cross-chain replenishment | Inventory held on the chain and a bridge contingency | The inventory plan |

## The model

For every scenario estimate, and write down with a date, the following.

- Collateral value after the haircut.
- Debt with accrued interest.
- Oracle lag.
- Liquidator gas.
- Swap price impact at the liquidation size.
- Fee or incentive paid.
- Available loan-asset inventory.
- Vault utilisation.
- Exit liquidity for depositors.
- Residual bad debt and who absorbs it.

Never infer that a position can be liquidated from the total value locked.
Depth is a number you measured at a size, on a date, on a venue you can use.

## Robinhood Chain specifics

- Tokenised stocks trade around the hours of the underlying market. A loan
  can persist through a night or a weekend when no fresh price exists. The
  weekend gap scenario is not optional for that collateral.
- The on-chain price feed for a tokenised stock is already adjusted for the
  split multiplier. The REST price is the raw underlying. Apply the
  multiplier once, when reconciling the two, never to the feed. Applying
  it twice overvalues the collateral.
- Primary mint and burn of a tokenised stock is limited to authorised
  participants. A liquidation plan uses the venue your keeper can actually
  reach, not an assumed redemption path.
- The chain's own status page and the sequencer feed are inputs to the
  outage scenario. Subscribe to both.

## Passing

A scenario passes when the control holds at the cap you intend to ship
with, and the evidence is in the repository. If a control fails, the cap
comes down to the size where it holds, and that becomes the cap.
