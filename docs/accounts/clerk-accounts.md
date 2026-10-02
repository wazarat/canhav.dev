# Accounts (Clerk)

**In development.** CanHav accounts use **Clerk**. Studio is wired for Clerk in the product codebase. Do not assume production keys and sign-in are configured for every environment yet.

## Sign up and log in

Sign-up is open to everyone, with an email or with a wallet. Create an account at [canhav.com/sign-up](https://canhav.com/sign-up), or use the Sign up button in the navigation or on the homepage. Existing accounts log in at `/studio`.

## Wallets and launches

A token belongs to the account that holds its creator wallet as a verified wallet. Sign in with the wallet you launch from, or add it to an email account under Wallets in the studio, and every token that wallet launched appears under Launches, whenever it was launched and whether or not you were signed in at the time. On a token page, the connected creator wallet can also claim the launch with one signature. Verifying a wallet is a signature only. It sends no transaction and costs no gas.

CanHav does not create a wallet for you. An email account still brings its own wallet to launch.

## What requires an account

- Creating and editing Project and Token design drafts in studio (`/studio`)
- Publishing and unpublishing those drafts
- Linking a project to a token design
- Markdown export and the `get_my_` MCP tools for your own designs and launches (see [AI and IDE](../ai/export-and-mcp.md))

## What does not require an account

- Reading research on [canhav.com](https://canhav.com)
- Reading published docs on [docs.canhav.com](https://docs.canhav.com)
- Using Token Launch with a **wallet** on testnet (`/launch`): create, explore, and on-chain actions stay wallet-based
- Reading public project and token pages (`/p/...`, `/t/...`)

Connecting a wallet to trade or launch does not sign you in. Signing in with a wallet is a separate step, described above.

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
