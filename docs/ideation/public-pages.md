# Public pages

**In development.** Project pages (`/p/[slug]`) and token design pages (`/t/[slug]`) are being built. Treat this as the intended behaviour, not a claim that they are live for every visitor today.

## Separate entities

Projects and token designs are **separate** public documents.

- A project page describes the product.
- A token page describes the token design (and computed outputs).
- They can be **cross-linked** when the team links them in studio.
- They are **not merged** into a single page. Readers should always know which entity they are looking at.

## Credibility signals stay scoped

Signals that belong to a project (wallet activity, GitHub, testnet contract verification) stay on the **project** page.

Signals that belong to a token design (computed float, unlock calendar, attached deploy address when present) stay on the **token** page.

Linking the two does not import one entity’s credibility into the other by default.

## Publishing

When you publish:

1. The draft is snapshotted (content-addressed).
2. A public slug is assigned.
3. The public page renders the snapshot, not a silent live edit of an unpublished draft.

Unpublishing returns the entity to draft for editors; public behaviour for previously shared URLs depends on the ship state of that flow.

## Deployed tokens

A published token design may later attach a deployed contract address. That attachment is optional. A design that is never deployed remains a legitimate public document.

For tokens launched through the factory without a Projects design, explore pages under `/launch` remain the Token Launch surface. See [Explore tokens](../token-launch/explore-tokens.md).

## Related

- [The two ideation tracks](../ideation/two-tracks.md)
- [Token track](../ideation/token-track.md)
- [Product track](../ideation/product-track.md)
- [Accounts](../accounts/clerk-accounts.md)
