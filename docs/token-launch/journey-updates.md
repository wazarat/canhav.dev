# Journey updates

**Available now.**

**JourneyUpdates** is an admin-less singleton, deployed once on each chain, that anchors **content-addressed** progress updates for a launched token.

Updates are posted against a milestone, so only a token launched with a [commitment](journey-and-credibility.md) has them. The page shows an update only when it was posted by the token's creator and its stored text re-hashes to the anchored value.

## Properties

| Property | Detail |
|----------|--------|
| Address | See [Contract addresses](contract-addresses.md) |
| Ownership | None |
| Role | On-chain anchor for off-chain update payloads |

Updates do not rewrite `journeyHash` from launch. They add a verifiable trail of later documents (or blobs) whose hashes appear on-chain.

## Product surface

Token detail pages load update hashes from the indexer and resolve stored documents where available. If a document is missing off-chain, the hash on-chain still proves that a specific payload was committed.

## Related

- [Journey and credibility](journey-and-credibility.md)
- [The token page](token-page.md)

## Design launches

A token launched from a published design commits the design's snapshot hash instead of a journey. The milestones in the design's Post-launch section are the launch's milestones, verified the same way (the snapshot re-hashes to the on-chain value), so everything on this page that references the journey's milestones applies to them by index. A design published without milestones gives the launch nothing to schedule against.
