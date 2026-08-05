# Token Launch overview

Token Launch is CanHav's testnet launchpad on **Robinhood Chain Testnet**. It is the current product focus before [Agent Launch](../agent-launch/overview.md).

You create a fixed-supply ERC20 from a factory, optionally attach vesting in the same transaction, and commit a journey hash on-chain so the plan can be checked later. Supporting contracts cover milestone escrow, progress updates, allocation sales, and a minimal AMM.

## Status

| Item | Detail |
|------|--------|
| Network | Robinhood Chain Testnet (chain ID `46630`) |
| Factory | TokenFactory **v4** (live). v1-v3 are paused; their tokens remain indexed and browsable. |
| Product UI | Hidden URL track on the product site: `/launch` |
| Audience | Builders and testers. Not a mainnet product. |

{% hint style="warning" %}
Testnet only. Do not treat launches, fees, or liquidity as production or investment advice.
{% endhint %}

## What you can do

1. [Set up the network](network-setup.md) (RPC, faucet, wallet)
2. [Create a token](create-a-token.md) with metadata and journey
3. Use [vesting](vesting.md), [escrow](milestone-escrow.md), [updates](journey-updates.md), [sales](allocation-sales.md), and [AMM](amm-and-fees.md)
4. [Explore](explore-tokens.md) indexed launches and open a token detail page
5. Review [governance](governance.md) and [contract addresses](contract-addresses.md)

## Design principles

- **Pause on factory, not on tokens.** Stopping new launches does not freeze existing tokens.
- **Hashes for credibility.** Journey and description are committed as hashes in launch events.
- **Admin-less where it matters.** Escrow, updates, and sales have no owner.
- **Timelock for admin knobs.** Factory and AMM fee/config changes wait out a public delay.

## Next

Start with [Network setup](network-setup.md).
