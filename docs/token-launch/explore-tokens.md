# Explore tokens

Launches are indexed by a dedicated Ponder indexer so you can browse without scanning the explorer manually.

## Surfaces

| Path | Purpose |
|------|---------|
| `/launch/explore` | Indexed list of launched tokens |
| `/launch/t/[address]` | Token detail: vesting, escrow, sales, AMM, journey updates |

These routes are URL-only on the product site (not linked from main marketing nav). Docs are the public entry path.

## What the indexer sees

- Factory launch events across factory versions (including paused v1-v3 tokens)
- Vesting creation
- Related escrow, updates, sale, and AMM activity as implemented

If the indexer is offline, explore pages degrade gracefully. On-chain truth remains on the [explorer](https://explorer.testnet.chain.robinhood.com).

## Related

- [Journey updates](journey-updates.md)
- [Contract addresses](contract-addresses.md)
- [FAQ](faq.md)
