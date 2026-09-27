# Invariants

Statements that must hold after every operation. Property tests over these
are worth more than line coverage. Each one is phrased once in words and once
as a sketch for a property test. Adapt names to the code under test.

## Vaults (ERC-4626 style)

1. Total assets never fall below what is redeemable by all shareholders.
   `totalAssets() >= sum over holders of convertToAssets(balanceOf(holder))`

2. A round trip cannot create value. Deposit then redeem returns at most what
   went in, net of stated fees.
   `redeem(deposit(x)) <= x`

3. Previews are honest. What previewDeposit says is what deposit does, within
   one unit of rounding, and rounding always favours the vault.

4. Exposure stays inside caps.
   `for each market m: allocated(m) <= cap(m)`

5. A withdrawal never returns more than the caller owns.
   `withdrawn <= convertToAssets(sharesBurned)`

6. Share price does not move on a deposit or a withdrawal alone. Only yield,
   loss and fees move it.

7. The first depositor cannot be front-run into a worthless share. Test a
   donation to the vault before the first deposit.

## Markets (isolated lending)

8. Recorded debt matches the sum of borrower positions.
   `sum(borrowShares) converted == totalBorrowAssets`

9. A position is either healthy or liquidatable, never both.
   `health(p) > 1 || liquidatable(p)`

10. A liquidation cannot seize more collateral than the position holds and
    cannot repay more debt than it owes.

11. The liquidation threshold of a market never changes after creation.

12. Interest accrual is monotone. Debt never decreases without a repayment.

13. Oracle staleness blocks new borrowing. With a stale price, `borrow`
    reverts and `repay` still succeeds.

## Cross-component

14. Rounding cannot mint assets. Over a long random sequence of deposits,
    withdrawals, borrows and repays, the sum of all balances plus protocol
    holdings equals the initial supply plus real yield.

15. A loss in an underlying market propagates to the vault's share price in
    the same block it is recognised.

## Writing the tests

- Foundry. One handler contract per component with bounded random inputs,
  invariant functions for each statement above, run with a high depth.
- Medusa. The same handlers with assertion mode for statements 2, 5 and 10
  and property mode for the rest. Its agent guide in the resource pack
  explains the configuration.
- Keep a table in the design document mapping each numbered invariant to the
  test that covers it. An invariant with no test is a promise.
