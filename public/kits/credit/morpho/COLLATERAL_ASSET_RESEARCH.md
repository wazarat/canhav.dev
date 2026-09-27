# Asset research

One copy of this file per asset the product touches, whether as collateral,
loan asset or vault asset. Fill it before the asset is approved for anything.
The token integration checklist from the resource pack runs first and its
result is recorded in the last section.

## Identity

| Field | Value |
|-------|-------|
| Asset | `[symbol, name]` |
| Issuer | `[...]` |
| Contract, testnet 46630 | `[...]` |
| Contract, mainnet 4663 | `[...]` |
| Decimals | `[...]` |
| Upgradeable | `[yes, by whom, with what delay / no]` |
| Transfer restrictions, fees on transfer, rebasing | `[...]` |
| Corporate action handling, if a tokenized security | `[multiplier, splits, dividends]` |

## Price

| Field | Value |
|-------|-------|
| Oracle source | `[...]` |
| Oracle update model | `[push / pull / deterministic]` |
| Heartbeat | `[...]` |
| Staleness threshold used by the product | `[...]` |
| Market hours of the reference market | `[24 hour / exchange hours]` |
| Known gaps | `[...]` |

## Liquidity

| Field | Value |
|-------|-------|
| Venues, on chain | `[...]` |
| Depth to 2% price impact | `[amount, date observed]` |
| 24 hour volume | `[amount, date observed]` |
| Off chain venues, if relevant to the oracle | `[...]` |

## Risk

| Field | Value |
|-------|-------|
| Historical volatility, 30 and 90 day | `[...]` |
| Worst drawdown in one heartbeat | `[...]` |
| Depeg or price gap scenarios considered | `[...]` |
| Correlation with the assets it is paired with | `[...]` |

## Proposed parameters

| Field | Value | Justification (link to RISK_FRAMEWORK section) |
|-------|-------|-----------------------------------------------|
| Liquidation threshold | `[...]` | |
| Liquidation buffer after shock | `[...]` | |
| Supply cap | `[...]` | |
| Borrow cap | `[...]` | |
| Emergency conditions | `[...]` | |

## Integration checklist result

Date, who ran it, tool output, findings and how each was closed. An asset
with an open finding is not approved.
