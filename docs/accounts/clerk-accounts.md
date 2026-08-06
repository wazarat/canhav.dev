# Accounts (Clerk)

**In development.** CanHav accounts are intended to use **Clerk**. Do not assume sign-in is live on the product site yet.

## What will require an account

Intended once accounts ship:

- Creating and editing Project and Token design drafts in studio
- Publishing and unpublishing those drafts
- Linking a project to a token design
- Markdown export and MCP access for design documents (see [AI and IDE](../ai/export-and-mcp.md))

## What will not require an account

- Reading research on [canhav.com](https://canhav.com)
- Reading published docs on [docs.canhav.com](https://docs.canhav.com)
- Using Token Launch with a **wallet** on testnet (`/launch`): create, explore, and on-chain actions stay wallet-based
- Browsing public project and token pages once they are published (read path)

Wallet connection for Token Launch is separate from Clerk account sign-in.

## What data is stored (intended)

| Data | Purpose |
|------|---------|
| Account identity (via Clerk) | Authenticate studio owners |
| Draft project / token design documents | Autosave and edit |
| Publish snapshots and slugs | Public pages |
| Optional link rows between project and token design | Cross-links |
| Optional attach of deployed token address to a design | Connect design to on-chain launch |

CanHav does not need your private keys for studio. Do not paste seed phrases into any CanHav form.

Exact retention and deletion controls will be documented when Clerk account management ships.

## Cost

Accounts and the studio surfaces described here are **free**. There is no paid tier documented for these features.

## Related

- [Public pages](../ideation/public-pages.md)
- [AI and IDE](../ai/export-and-mcp.md)
- [The two ideation tracks](../ideation/two-tracks.md)
