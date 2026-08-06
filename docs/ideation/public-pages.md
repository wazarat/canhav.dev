# Public pages

**Available now.** Project pages live at `/p/[slug]`. Token design pages live at `/t/[slug]`. Explore under `/launch/explore` includes tabs for tokens, projects, and designs.

## Separate entities

Projects and token designs are **separate** public documents.

- A project page describes the product.
- A token page describes the token design (and computed outputs).
- They can be **cross-linked** when the team links them in studio.
- They are **not merged** into a single page. Readers should always know which entity they are looking at.

## Credibility signals stay scoped

Signals that belong to a project stay on the **project** page:

- Deploy history for a verify wallet (tokens created by that address)
- Blockscout verification status for listed testnet contracts
- Wallet transaction count
- GitHub commit activity for a linked repo

Each signal is omitted silently if the lookup fails. Nothing is invented to fill a gap.

Signals that belong to a token design stay on the **token** page:

- Computed float, FDV:float, unlock calendar, warnings
- Enforced versus stated labels
- Attached deploy address when present

Linking the two does not import one entity’s credibility into the other by default.

## Publishing

When you publish:

1. The draft is snapshotted (content-addressed, insert-only).
2. A public slug is assigned (immutable after first publish).
3. The public page renders the snapshot, not the live draft.

Unpublishing flips status back to draft for editors. Snapshots are not deleted.

## Deployed tokens

A published token design may attach a deployed contract address after a design deploy. That attachment is optional. A design that is never deployed remains a legitimate public document.

For tokens launched through the factory without a Projects design, explore and `/launch/t/[address]` remain the Token Launch surface, with a Quick deploy label when applicable. See [Deploy paths](../token-launch/deploy-paths.md).

## Related

- [The two ideation tracks](../ideation/two-tracks.md)
- [Token track](../ideation/token-track.md)
- [Product track](../ideation/product-track.md)
- [Enforced versus stated](enforced-vs-stated.md)
- [Accounts](../accounts/clerk-accounts.md)
