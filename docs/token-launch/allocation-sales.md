# Allocation sales

**AllocationSale** is an admin-less singleton for fixed-price token sales on Robinhood Chain Testnet.

## Properties

| Property | Detail |
|----------|--------|
| Address | See [Contract addresses](contract-addresses.md) |
| Platform cut | Zero (fee-free) |
| Proceeds | Claimable only in milestone-dated tranches |
| Ownership | None |

## Design intent

Sales should not depend on an operator to “release” proceeds at will. Milestone-dated lockups align cashflow with the same credibility model as [MilestoneEscrow](milestone-escrow.md).

## Related

- [Milestone escrow](milestone-escrow.md)
- [AMM and fees](amm-and-fees.md)
