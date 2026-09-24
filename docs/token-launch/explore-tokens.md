# Explore tokens

**Available now.**

Launches are indexed by a dedicated Ponder indexer so you can browse without scanning the explorer manually.

## Surfaces

| Path | Purpose |
|------|---------|
| `/explore` | Indexed list of launched tokens, with price and pool depth when a pool exists. The Explore tab in the nav |
| `/launch/t/[address]` | Token detail: vesting, escrow, sales, AMM, journey updates |

`/explore` is the Explore tab in the nav. `/launch/t/[address]` is reached from a card there or from a launch. `/projects` and the old `/launch/explore` both redirect to `/explore`.

## What the indexer sees

- Factory launch events across factory versions (including paused v1-v3 tokens)
- Vesting creation
- Related escrow, updates, sale, and AMM activity as implemented

If the indexer is offline, explore pages degrade gracefully. On-chain truth remains on the [explorer](https://explorer.testnet.chain.robinhood.com).

## Related

- [Journey updates](journey-updates.md)
- [Contract addresses](contract-addresses.md)
- [FAQ](faq.md)
