# Hedge band worksheet

The band a delta neutral vault keeps its two legs inside, and what it costs to stay there.

| Decision | What to write | Value |
|----------|---------------|-------|
| Long leg | The asset held and its yield, if any. | |\n| Short leg | The perpetual, the venue and the account. | |\n| Band | The maximum net delta as a share of the long leg. | |\n| Rebalance rule | Who rebalances, on what trigger and the maximum size per move. | |\n| Rebalance cost | Fees and slippage per rebalance, as a number from the venue. | |\n| Funding history | The series on the venue, the share of negative weeks and the worst month. | |\n| Negative weeks | What the vault does when funding is negative. | |\n| Venue failure | Halt, delisting and loss of funds, each with its unwind. | |\n| NAV cadence | How often the value per share is posted and requests settle. | |

Fill the Value column before the first contract is written. A row left
blank is undecided and should say what would decide it.
