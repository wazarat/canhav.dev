# Journey updates

**Available now.**

**JourneyUpdates** is an admin-less singleton that anchors **content-addressed** progress updates for a launched token.

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
- [Explore tokens](explore-tokens.md)
