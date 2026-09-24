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

## Project-scoped servers

Every project in the studio also has its own MCP server at `https://www.canhav.com/mcp/p/<project id>`. Its tools are bound to that one project, so none of them takes a slug or an address. Open the project in the studio and copy the `claude mcp add` command from the connect card, which names the server after the project so several can be added side by side.

```bash
claude mcp add --transport http canhav-<project> https://www.canhav.com/mcp/p/<project id>
```

Unlike the shared server, a scoped server is owner-only and requires OAuth on every request. The first call returns 401 with a `WWW-Authenticate` header, which is what makes the client open the browser flow.

| Tool | Purpose |
|------|---------|
| `get_project` | The bound project. Current draft, publication status, and the published snapshot when there is one |
| `get_project_status` | What is left before the project can publish and launch, ending in one next action |
| `get_linked_token_design` | The token design linked to this project, with derived tokenomics and the deployed address when it has one |
| `get_design_constraints` | The linked design as testable assertions, enforced-on-chain versus stated-by-team. Reads the published snapshot when there is one, otherwise the draft |
| `check_design` | Warning rules and deployability against the linked design draft, or against an inline document passed as `doc` |
| `check_project` | Validate the project draft against the project rules and report the first problem |
| `get_launch` | The token deployed from this project's design, in the same shape the shared server returns |

Two notes on what the URL is and is not. Clerk issues access tokens for the origin rather than for a path, so a token minted at `/mcp` is accepted at `/mcp/p/<id>` as well. The scoped URL is a tool surface, not a secret and not a capability: ownership is checked on every call against the signed-in account. And because the URL keys on the project id rather than its slug, a brand-new draft is connectable before it is ever published.

## Status discipline

This page reflects the tools registered in the repository. When a tool is added or its input changes, update the matching table in the same change.

## Related

- [Accounts](../accounts/clerk-accounts.md)
- [The two ideation tracks](../ideation/two-tracks.md)
- [Token Launch overview](../token-launch/overview.md)
