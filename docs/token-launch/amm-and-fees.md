# AMM and fees

**LaunchAMM** is a minimal AMM for token/ETH pools on Robinhood Chain Testnet. Protocol fee configuration is owned by the timelock.

## Pool mechanics

| Item | Detail |
|------|--------|
| Pair | Launch token and ETH |
| LP fee | 0.30% |
| Protocol fee | Optional, opt-in. Default 20 bps. Hard-capped at `MAX_PROTOCOL_FEE_BPS = 50`. |
| Protocol split | 70% project / 30% platform (`PROJECT_SHARE_BPS = 7000`), enforced in bytecode |
| Fee destination | [FeeSplitter](contract-addresses.md) (never an EOA as the platform sink) |

## FeeSplitter

| Item | Detail |
|------|--------|
| Ownership | Timelock |
| Role | Platform fee destination; payees set via timelock; permissionless audited distributions |

## What you can change (with delay)

AMM “knobs” such as the default protocol fee sit behind the [TimelockController](governance.md). There is no instant admin switch on production-bound parameters.

## Related

- [Governance](governance.md)
- [Contract addresses](contract-addresses.md)
