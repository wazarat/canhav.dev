# Strategy 1. Vault yield to a fixed rate

A depositor holds a floating rate through a vault. The product turns that
into a rate known on the day of deposit.

## The path

Underlying asset, then vault share, then wrapped unit, then a fixed half and
a variable half, then the fixed half held to maturity.

1. The user deposits the underlying into a vault and receives shares.
2. The shares go into the common wrapper for vault shares and come out as
   wrapped units. One number carries through, the wrapper's exchange rate.
3. The wrapped units are split into a fixed half and a variable half of a
   market with a maturity.
4. The product sells the variable half into the pool and keeps the fixed
   half, or buys more fixed halves with the proceeds. The discount at which
   the fixed half was bought is the user's fixed rate.
5. At maturity the fixed half redeems for one wrapped unit each, which
   unwraps to vault shares, which redeem to the underlying.

## What the product must decide

- Whether the user holds the fixed half or the product does. Non-custodial
  means each user's wallet holds it. Pooled means the product holds one
  position and owes users a claim.
- What happens at maturity. Auto-roll into the next market, redeem to the
  underlying, or ask.
- How early exit is priced. Selling the fixed half before maturity gets the
  pool's price that day, not the fixed rate.

## What can go wrong

- The vault takes a loss. The wrapper's exchange rate falls, the fixed half
  is still one wrapped unit at maturity, but a wrapped unit is now worth
  less underlying. The fixed rate was fixed in wrapped units, not in the
  underlying. Say this before the first deposit.
- The pool is thin at exit. A user who leaves early moves the price against
  themselves.
- The rate shown was the implied rate at a moment. It is the user's fixed
  rate only if the purchase executes at it. Quote from a simulation, not
  from the display.

## Evidence to keep

The market parameter worksheet for the market used, the registry entries for
the vault, the wrapper and the fixed half, the rate labels in use, and the
cross-protocol invariants 1 to 5 under test.
