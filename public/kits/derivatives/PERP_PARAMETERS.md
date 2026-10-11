# Perp parameters worksheet

The numbers a perpetuals venue runs on, each a product decision a reviewer can check against the contracts.

| Decision | What to write | Value |
|----------|---------------|-------|
| Margin asset | The token that backs positions and its decimals. | |\n| Initial margin | The margin needed to open, per market. | |\n| Maintenance margin | The margin below which a position is closed. | |\n| Liquidation line | The health value where liquidation starts and the liquidator's reward. | |\n| Maximum leverage | Per market, with the reason for the number. | |\n| Open interest cap | Per market and per side, as a number and as a share of the pool. | |\n| Funding formula | Every input named, the interval and the cap. | |\n| Mark price source | The feed, the staleness bound and the fallback. | |\n| Market hours | For stock token markets, when opens halt and what the mark does while closed. | |\n| Fees | Taker, maker, liquidation, and where each goes. | |

Fill the Value column before the first contract is written. A row left
blank is undecided and should say what would decide it.
