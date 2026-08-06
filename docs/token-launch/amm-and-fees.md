# AMM and fees

**Available now.**

**LaunchAMM** is a minimal AMM for token/ETH pools on Robinhood Chain Testnet. Protocol fee configuration is owned by the timelock.

For the full fee table (launch fee, caps, freeze-at-creation, zero supply take), see [Fees and economics](fees-and-economics.md).

## Pool mechanics

| Item | Detail |
|------|--------|
| Pair | Launch token and ETH |
| LP fee | 0.30% |
| Protocol fee | Optional, opt-in. Default 20 bps. Hard-capped at `MAX_PROTOCOL_FEE_BPS = 50`. |
| Protocol split | 70% project / 30% platform (`PROJECT_SHARE_BPS = 7000`), enforced in bytecode |
| Fee destination | [FeeSplitter](contract-addresses.md) (never an EOA as the platform sink) |
| Existing pools | Protocol fee rate **frozen at pool creation**; changing the default does not rewrite old pools |

## FeeSplitter

| Item | Detail |
|------|--------|
| Ownership | Timelock |
| Role | Platform fee destination; payees set via timelock; permissionless audited distributions |

## What you can change (with delay)

AMM knobs such as the default protocol fee sit behind the [TimelockController](governance.md). There is no instant admin switch on production-bound parameters. Testnet `minDelay` is 300 seconds.

## Related

- [Fees and economics](fees-and-economics.md)
- [Contract guarantees](contract-guarantees.md)
- [Governance](governance.md)
- [Contract addresses](contract-addresses.md)
