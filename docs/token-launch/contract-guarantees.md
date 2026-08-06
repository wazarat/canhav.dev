# Contract guarantees

**Available now** on Robinhood Chain Testnet for tokens launched through CanHav TokenFactory.

This page states what a CanHav launch token **can and cannot** do. Claims below are about the token implementation cloned by the factory, not about every third-party contract a team may deploy later.

## What the token cannot do

| Guarantee | Meaning |
|-----------|---------|
| No mint after deployment | Supply is fixed at initialize. There is no mint function for later inflation. |
| No pause on the token | The token itself cannot be paused. Factory pause only stops **new** launches. |
| No freeze / blacklist | No account freeze or blacklist on the token. |
| No upgrade | Not a transparent upgradeable proxy on the token. No owner who can swap logic. |
| No owner | The token has no owner role for admin privileges after initialize. |

CanHav takes **zero percent of token supply**. That is enforced by the absence of a mint path for the platform, not by a policy document.

## Source verification

The factory clones a **verified** implementation. New tokens inherit that verified source rather than deploying opaque bytecode.

| Contract | Address |
|----------|---------|
| TokenFactory v4 (live) | [`0x30Db3A828F65B92434c6aDB27AEeD01850277b08`](https://explorer.testnet.chain.robinhood.com/address/0x30Db3A828F65B92434c6aDB27AEeD01850277b08) |
| LaunchToken implementation | [`0x3E8c9be8BB486abEc132B0d1C35266b2336b129B`](https://explorer.testnet.chain.robinhood.com/address/0x3E8c9be8BB486abEc132B0d1C35266b2336b129B) |

Always confirm on the [Robinhood Chain Testnet explorer](https://explorer.testnet.chain.robinhood.com).

## What this does not guarantee

- It does not guarantee that a team’s **other** contracts (vaults, routers, oracles) are immutable or ownerless.
- It does not guarantee vesting, escrow, or sale terms unless those contracts are used.
- It does not make a testnet token a mainnet product or an investment.

## Related

- [Fees and economics](fees-and-economics.md)
- [Governance](governance.md)
- [Contract addresses](contract-addresses.md)
- [Create a token](create-a-token.md)
