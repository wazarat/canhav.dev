# Explore tokens

**Available now.**

Launches are indexed by a dedicated Ponder indexer so you can browse without scanning the explorer manually.

## Surfaces

| Path | Purpose |
|------|---------|
| `/explore` | Indexed list of launched tokens, with price and pool depth when a pool exists, or the curve price and graduation progress while a token is on its curve. The Explore tab in the nav |
| `/launch/t/[address]` | Token detail: the bonding curve or the pool, vesting, escrow, sales, journey updates |

`/explore` is the Explore tab in the nav. `/launch/t/[address]` is reached from a card there or from a launch. `/projects` and the old `/launch/explore` both redirect to `/explore`.

## What the indexer sees

- Launch events from the curve launcher and every factory version (including paused v1-v3 tokens)
- Curve creation, buys, sells and graduation
- Vesting creation
- Related escrow, updates, sale, and AMM activity as implemented

If the indexer is offline, explore pages degrade gracefully. On-chain truth remains on the [explorer](https://explorer.testnet.chain.robinhood.com).

## Related

- [Bonding curve](bonding-curve.md)
- [Journey updates](journey-updates.md)
- [Contract addresses](contract-addresses.md)
- [FAQ](faq.md)
