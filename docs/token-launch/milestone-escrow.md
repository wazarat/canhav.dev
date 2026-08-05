# Milestone escrow

**MilestoneEscrow** is an admin-less singleton on Robinhood Chain Testnet. It holds token lockups that unlock on milestone dates.

## Properties

| Property | Detail |
|----------|--------|
| Address | See [Contract addresses](contract-addresses.md) |
| Ownership | None. No owner, no attester, no pause. |
| Role | Milestone-dated lockups for launch credibility |

Because there is no admin, unlock schedules cannot be silently rewritten by a CanHav operator key. Rules are whatever the contract encodes at deposit time.

## How it fits the journey

Escrow pairs with [journey hashes](journey-and-credibility.md) and [journey updates](journey-updates.md):

- Journey commits the plan
- Escrow locks tokens to dates or milestones in that plan
- Updates publish progress against the plan without needing a privileged attester

## Related

- [Allocation sales](allocation-sales.md) (proceeds also use milestone-dated unlocks)
- [Contract addresses](contract-addresses.md)
