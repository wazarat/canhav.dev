# Strategy 3. The leveraged fixed-yield loop

Strategies 1 and 2 combined. Buy the fixed half, post it, borrow the
underlying, buy more of the fixed half, repeat up to a cap.

## The path

1. Buy a fixed half at the current implied rate.
2. Post it as collateral in the market from strategy 2.
3. Borrow the underlying at the market's borrow rate.
4. Buy more of the fixed half with the loan.
5. Repeat until the leverage cap or the liquidation threshold stops it.

## The arithmetic

With leverage L (fixed halves held divided by net equity), fixed rate f,
borrow rate b and fees c, the position earns roughly

    f * L - b * (L - 1) - c

per year on equity. At f 5 percent, b 3 percent and L 3, that is about 9
percent before fees. At b 6 percent the same position earns 5 times 3 minus
6 times 2, or 3 percent, before fees, and is negative after modest fees. The
rate at which the trade turns negative is

    b = (f * L - c) / (L - 1)

Show it on the same screen as the headline.

## What the product must decide

- The leverage cap, enforced in the contract rather than the interface.
- Whether the loop is one transaction (flash loan, then buy, post, borrow,
  repay) or several. One transaction means one simulation and one
  confirmation. Several means the user can be left half way.
- The unwind. How a user, or a liquidator, gets out. Every step of the loop
  runs in reverse, and each sells into the same pool.
- Who watches the borrow rate and what they do when it rises.

## What can go wrong

- The borrow rate rises above the fixed rate. Every turn of the loop now
  loses money, and the loss is multiplied by the leverage.
- The implied rate rises. The pool price of the fixed half falls, the
  position's collateral value falls with the feed only slowly, and the
  unwind sells into a falling pool.
- Both at once, which is the normal shape of a bad week.
- Fees on each turn were rounded away in the headline. Invariant 14 says
  the number shown must be the number computed.

## Evidence to keep

The market and collateral worksheets for the market used, the leverage cap
and the breakeven formula in the architecture document, invariants 13 and
14 under test, and the disclosure text the user sees before the first turn.
