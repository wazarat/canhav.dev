# Market parameter worksheet

The deploy helper for a new market takes a handful of numbers. They look like
software parameters. They are product decisions, and each one changes what
your users can be promised. Fill one copy per market, keep it in the
repository, and link it from the architecture document.

Where a value is still open, write "undecided" and what would decide it.

## The market

| Field | Value |
|-------|-------|
| Wrapper | `[address on mainnet 4663, link to the registry entry]` |
| Underlying asset | `[...]` |
| Yield source | `[vault, staking, other]` |
| Purpose of the market | `[fixed rate for depositors / collateral for a lending market / both]` |

## Expiry

| Field | Value | Why |
|-------|-------|-----|
| Maturity date | `[...]` | |
| Term length | `[days]` | Shorter terms track the floating rate closely and roll often. Longer terms give users a rate they can plan on and give you a rollover problem later. |
| Rollover plan | `[what happens the week before maturity, who does it, what users see]` | A market always expires. The product does not have to. |
| Alignment with other markets | `[same maturity as an existing market or not]` | Shared maturities pool liquidity and make the fixed half easier to value as collateral. |

## Rate band

| Field | Value | Why |
|-------|-------|-----|
| Minimum rate | `[...]` | The pool cannot price the fixed half above par by more than this implies. Set it near the lowest rate the yield source has paid over the last year. |
| Maximum rate | `[...]` | The ceiling on the discount. Set it near the highest rate the source has paid, plus room for stress. |
| Initial implied rate | `[...]` | Where the pool opens. Close to the current underlying rate, or the first traders are paid to correct you. |
| Evidence | `[rate history of the yield source, dates, source]` | |

## Fee

| Field | Value | Why |
|-------|-------|-----|
| Swap fee | `[...]` | Paid by anyone trading a half. Higher fees pay liquidity providers more and widen the spread users see. |
| Protocol share | `[from the protocol's fee page]` | Not yours to set, but part of the net rate. |
| Rate your users see after fees | `[...]` | The number that goes on the screen, with its label from the rate transparency file. |

## Liquidity

| Field | Value | Why |
|-------|-------|-----|
| Seed liquidity | `[amount, source of funds]` | Thin pools move on small trades and make the fixed half a poor collateral. |
| Who provides it | `[team, partners, incentives]` | |
| Target depth to a 1 percent move | `[amount]` | |
| Exit plan for the seed | `[when and how it is withdrawn]` | |

## After deployment

- [ ] Market address, fixed half address, variable half address in the asset
      registry, each pointing back to the wrapper.
- [ ] Implied rate, underlying rate and the pool's depth monitored, with an
      alert when the implied rate leaves the band you expected.
- [ ] The rollover plan has an owner and a date.
