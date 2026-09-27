# Rate transparency

A credit product built across a lending protocol and a yield market carries
at least nine different rates. A user shown one number called "yield" has
been shown none of them. This file lists the rates, what each one is, where
it comes from, and the label to use. Every rate on a screen, in a document
or in an agent's answer carries its label and its source.

## The nine rates

| Label | What it is | Where it comes from | Moves when |
|-------|-----------|---------------------|------------|
| Underlying lending rate | What borrowers pay in the isolated market the deposit ends up in | The market's rate model, read on chain | Utilisation changes |
| Vault rate | What a vault share earns after the vault's allocation and its fee | The vault's share price over time | Allocations, market rates, fees change |
| Yield source rate | What the wrapper's asset earns, the rate the yield market splits | The wrapper's exchange rate over time | The source's own economics |
| Implied rate | The rate the pool is currently pricing the fixed half at | The pool, read on chain or from the hosted API | Every trade |
| Fixed rate | What a buyer of the fixed half locks in if held to maturity | The discount at the moment of purchase | Only at purchase; fixed after |
| Variable half return | What a holder of the variable half has earned so far, annualised | Yield collected divided by price paid, over time held | Every yield distribution |
| Borrow rate | What a borrower pays against the fixed half as collateral | The lending market's rate model | Utilisation changes |
| Rewards rate | Incentive tokens on top of any of the above, valued at a price | An incentive program, a token price | The program and the token price |
| Fees | Swap fees, protocol shares, management and performance fees | The protocol's fee pages and your own fee schedule | Configuration |

## Rules

1. Never add two of these into one number without saying which two and how.
   "Fixed rate 5.2 percent, before a 0.3 percent swap fee" is one line. A
   "net rate" is allowed only with its formula beside it.
2. Name the source and the time. A rate read from a pool is a snapshot; say
   when. A rate read from a feed has a heartbeat; say it.
3. Past is past. The variable half's return so far is not its return to
   maturity. The vault's rate over the last month is not next month's.
4. Rewards are a separate line, valued at a stated price, and never inside
   the headline.
5. A fixed rate is fixed for a holder to maturity and for nobody else. An
   early exit sells into the pool at the implied rate of that day. Say so
   wherever the fixed rate is shown.
6. A leveraged position shows the spread, the leverage and the rate at which
   the spread turns negative, on the same screen as the headline.
7. The variable half reaches zero at maturity. Its screen shows the date and
   the decay, not only the yield.
8. Agents follow the same rules. An agent that reports a rate names the
   label and the source, and an agent that cannot says it cannot.

## The checkers

The review passes in the studio cover wording, attribution, disclosure,
rates, conversion, math and clarity. This file is the vocabulary those passes
test against. When a pass fails on a rate, the fix is a label from the table
above and a source beside it.
