# Option schedule worksheet

The schedule an option vault runs on, written before the first round.

| Decision | What to write | Value |
|----------|---------------|-------|
| Underlying | The asset and its price source. | |
| Side | Calls or puts, written or bought. | |
| Expiry cycle | Weekly, monthly, and the day and hour of expiry. | |
| Strike rule | The formula and its inputs, delta, distance from spot or volatility. | |
| Premium sale | Auction, named buyer or a protocol pool, and where fills are recorded. | |
| Settlement | Where options settle, in what asset and the price source at expiry. | |
| Missing price | What the round does when the settlement price is missing. | |
| Cap and queue | The deposit cap, how deposits join and how withdrawals settle. | |
| Fee | Management and performance, the recipient and the key that changes it. | |

Fill the Value column before the first contract is written. A row left
blank is undecided and should say what would decide it.
