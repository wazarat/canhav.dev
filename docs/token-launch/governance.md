# Governance

Token Launch separates **immutable after launch** from **timelocked admin**.

## TimelockController

| Item | Detail |
|------|--------|
| Address | See [Contract addresses](contract-addresses.md) |
| Owns | TokenFactory (v4) and LaunchAMM admin surfaces; FeeSplitter payee config |
| minDelay (testnet) | 300 seconds. Anything closer to production should use 24h+. |
| Proposer | Deployer EOA (testnet) |
| Executor | Open |
| Admin | None on the timelock itself |

Every sensitive admin change (fees, treasury, implementation bumps, unpause where applicable) waits out the public delay.

## What pause does

- **Factory pause** stops **new** launches.
- Already launched tokens are not paused by factory pause.
- Older factories (v1-v3) are paused permanently after migrations; their tokens stay live and indexed.

## Product UI

The site exposes a governance view under `/launch/governance` for fees, timelock, and fee splitter context while building on testnet.

## Related

- [AMM and fees](amm-and-fees.md)
- [Create a token](create-a-token.md)
- [Contract addresses](contract-addresses.md)
