# The three answer types

**In development** as part of Projects. The model below is what the editors are built around.

Projects does not treat every field the same. There are three answer types.

## 1. Decisions

Choices the team makes: sector, allocation splits, cliff months, sale price, LP treatment, and similar.

These are asked as forms. You own the answers. Readers can disagree with them, but they are not derived by the platform.

## 2. Computed outputs

Numbers and charts the platform derives from your decisions and shows back. Examples:

- Circulating float at launch
- Fully diluted to float ratio
- Unlock calendar
- Team versus investor cliff comparison
- Warning cards when the structure looks risky

You are not asked for these values. Asking would invite inconsistent math. See [Computed outputs](computed-outputs.md).

## 3. Status declarations

Declarations for legal, governance, and security work that often sits outside the product UI.

Typical statuses:

| Status | Meaning |
|--------|---------|
| Already in place | Done, with an optional note |
| Handled by our legal/ops team | Owned outside this document |
| Planned before mainnet | Explicitly deferred |
| Not yet | Honest gap |

### Why status declarations exist

Teams may already have handled audit, counsel, key custody, or treasury process elsewhere. Or they may legitimately not have addressed them before product-market fit. Status declarations record where things stand without forcing a fake “complete” checkbox.

They are **stated by the team**, not enforced by the token contract. Contract guarantees (no mint after deploy, no pause on the token, and so on) are separate. See [Contract guarantees](../token-launch/contract-guarantees.md).
