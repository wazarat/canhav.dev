# Accounts (Clerk)

**In development.** CanHav accounts use **Clerk**. Studio is wired for Clerk in the product codebase. Do not assume production keys and sign-in are configured for every environment yet.

## What requires an account

- Creating and editing Project and Token design drafts in studio (`/studio`)
- Publishing and unpublishing those drafts
- Linking a project to a token design
- Markdown export and MCP access for design documents, once those ship (see [AI and IDE](../ai/export-and-mcp.md))

## What does not require an account

- Reading research on [canhav.com](https://canhav.com)
- Reading published docs on [docs.canhav.com](https://docs.canhav.com)
- Using Token Launch with a **wallet** on testnet (`/launch`): create, explore, and on-chain actions stay wallet-based
- Reading public project and token pages (`/p/...`, `/t/...`)

Wallet connection for Token Launch is separate from Clerk account sign-in.

## What data is stored

| Data | Purpose |
|------|---------|
| Account identity (via Clerk) | Authenticate studio owners (`owner_id` on drafts) |
| Draft project / token design documents | Autosave and edit |
| Publish snapshots and slugs | Public pages (insert-only snapshots) |
| Optional link rows between project and token design | Cross-links |
| Optional attach of deployed token address to a design | Connect design to on-chain launch |

CanHav does not need your private keys for studio. Do not paste seed phrases into any CanHav form.

Exact retention and deletion controls will be documented when account management is production-ready.

## Cost

Accounts and the studio surfaces described here are **free**. There is no paid tier documented for these features.

## Related

- [Public pages](../ideation/public-pages.md)
- [AI and IDE](../ai/export-and-mcp.md)
- [The two ideation tracks](../ideation/two-tracks.md)
