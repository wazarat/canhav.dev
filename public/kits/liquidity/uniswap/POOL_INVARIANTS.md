# Pool invariants

Twelve statements that must always hold, phrased so each becomes a
property test. Run them with Foundry's invariant runner against the
self-deployed stack on testnet 46630 and against a fork of mainnet 4663 for
the canonical contracts. A statement marked with an asterisk is one a hook
can break, and it is tested again with every hook.

## The pair (v2)

1. After any swap, the product of the reserves is at least the product
   before the swap, net of the fee kept in the reserves.
2. The liquidity token supply changes only on mint and burn, and the first
   thousand units stay burned forever.
3. A mint at the current ratio gives shares in proportion to the reserves,
   and a mint at any other ratio gives no more than the smaller side would.
4. A burn returns each token in proportion to the shares burned and the
   reserves, never more.
5. The cumulative price accumulators only increase, and increase by the
   last price times elapsed time.

## The concentrated pool (v4)

6. Liquidity in range equals the sum of every position whose range contains
   the current tick, after any sequence of mints, burns and swaps.
7. A swap moves the price monotonically in the direction of the trade and
   never past the next initialised tick without crossing it.
8. Fee growth per unit of liquidity never decreases, and fees collected by
   a position never exceed the growth over its range while it was in
   range.
9. Every unlock ends with every currency delta at zero, or the transaction
   reverts.
10. A pool cannot be initialised twice, and its first liquidity is added in
    the transaction that initialised it.

## The hook

11. A callback the hook did not declare is never invoked, and a call to it
    reverts.
12. The fee a hook sets is never above the bound it declares, and a hook's
    returned deltas never move more value than the swap or the liquidity
    change it wrapped.

Marked for hooks. Statements 6, 7, 8, 9 and 10 are tested again with the
hook attached, because a hook can break any of them.

## How to write them

- One handler contract that calls swap, mint, burn, collect and, with a
  hook, every enabled callback path, with random actors and amounts.
- One invariant function per statement, reading the pool manager or the
  pair and comparing against a shadow model kept in the handler.
- Failing traces saved to the repository with the statement number.
- The run recorded in the release evidence with the commit and the seed.
