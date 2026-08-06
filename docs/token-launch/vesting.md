# Vesting

**Available now.**

Optional vesting can be created in the **same transaction** as the token launch. The factory deploys a vesting wallet clone and funds it with a percent of supply.

## Parameters (UI constraints)

| Parameter | Range |
|-----------|--------|
| Vested percent | 1-100 (integer) |
| Duration | 1-3650 days |
| Cliff | 0 or more days; cannot exceed duration |

`startTimestamp == 0` in the contract path resolves to `block.timestamp`. The **resolved** start is what gets emitted in events.

## How addresses work

Vesting clone salt is derived from the **token address** (`keccak256(abi.encode(token))`), not from the launch user salt alone. That keeps vesting addresses collision-free even when a userSalt is reused across factory versions.

## Ownership and release

- The vesting **beneficiary is the Ownable owner** of the wallet (OpenZeppelin v5 pattern). Ownership can be transferred (including selling unvested positions). Always read live `owner()`, do not freeze the event's beneficiary forever.
- `release(token)` is **permissionless** and always pays the current owner.

## Events

- `TokenLaunched` is the same whether vesting is used or not.
- Vesting details live in a separate `VestingCreated` event.

## Related

- [Create a token](create-a-token.md)
- [Governance](governance.md)
