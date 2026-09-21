# Markdown export and MCP

**Available now.** Both are free and require only a CanHav account. See [Accounts](../accounts/clerk-accounts.md).

## Markdown export

Every published Product or Token design page (`/p/[slug]` and `/t/[slug]`) has two download buttons. Sign in once and the files download directly.

| Artifact | Purpose |
|----------|---------|
| `canhav-[slug].md` | Markdown export of the published design snapshot, never the draft |
| `AGENTS.md` | Agent-oriented summary of the design for IDE and coding agents. For a token design linked to a project, the project's published snapshot is merged in |

## MCP server

The CanHav MCP server runs at `https://www.canhav.com/mcp` over Streamable HTTP. Public data (published designs and every deployed launch) is readable without signing in. Tools that start with `get_my_` need an OAuth sign-in with your CanHav account, which the client prompts for on first use.

Connect from Claude Code

```bash
claude mcp add --transport http canhav https://www.canhav.com/mcp
```

Other MCP clients (Cursor, ChatGPT connectors, Claude Desktop) take the same URL. Dynamic client registration is enabled, so no manual OAuth app setup is needed.

### Design tools

| Tool | Purpose |
|------|---------|
| `get_my_projects` | List projects you own, drafts and published |
| `get_my_tokens` | List token designs you own, with the deployed address when attached |
| `get_project` | Fetch one published project by slug. Owners also get their draft |
| `get_token` | Fetch one published token design by slug, including derived tokenomics |
| `get_design_constraints` | For one published design, which parts the CanHav contracts enforce on-chain versus what the team merely states, plus deployability and float figures |
| `check_design` | Run the warning rules and deployability classification against a published slug or an inline design document |

### Launch tools

These read the same launch indexer and journey tables as the launch pages, so an agent sees exactly what a visitor sees. All are read only. Nothing signs, submits, or stores.

| Tool | Purpose |
|------|---------|
| `list_launches` | Newest-first tokens launched through the CanHav factory, with a flag for launches that have a sale open right now. Pass `creator` for one wallet |
| `get_launch` | Everything about one deployed token by address. Metadata, verified journey, milestone updates, vesting, escrow tranches, sales, the creator's pool, and the linked design |
| `get_launch_journey` | The journey document with the on-chain hash, the recomputed hash, and whether they match |
| `get_milestone_updates` | Creator-authored progress updates whose stored body matches the anchored hash, grouped by milestone |
| `get_sale_status` | Allocation sales with phase (upcoming, open, closed, reclaimed), amounts, proceeds tranches, and recent purchases |
| `get_pool_status` | The creator's AMM pool with reserves, fees, swap count, volume, and recent swaps |
| `get_launch_governance` | Contract addresses on Robinhood Chain Testnet and the timelock queue gating admin changes |
| `get_my_launches` | Deployed tokens attached to your own token designs, joined with their live launch records |

Every launch tool returns an error result with a retry hint when the indexer is unreachable, and a validation error for a malformed address.

## Status discipline

This page reflects the tools registered in the repository. When a tool is added or its input changes, update the matching table in the same change.

## Related

- [Accounts](../accounts/clerk-accounts.md)
- [The two ideation tracks](../ideation/two-tracks.md)
- [Token Launch overview](../token-launch/overview.md)
