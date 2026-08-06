# Markdown export and MCP

**In development.** Markdown export and the CanHav MCP server are not finished products yet. Do not describe them as live. Both are intended to be **free** and to require only a CanHav account once accounts ship. See [Accounts](../accounts/clerk-accounts.md).

## Markdown export (intended)

| Artifact | Purpose |
|----------|---------|
| `canhav-[slug].md` | Markdown export of the published Product or Token design |
| `AGENTS.md` | Agent-oriented summary of the design for IDE / coding agents |

Exact download UX will be documented when the export endpoints ship.

## MCP server (intended)

A CanHav MCP server will expose tools so an IDE agent can read your designs (and eventually help check them). Intended tools:

| Tool | Purpose |
|------|---------|
| `get_my_projects` | List projects you own |
| `get_my_tokens` | List token designs you own |
| `get_project` | Fetch one project by id or slug |
| `get_token` | Fetch one token design by id or slug |
| `get_design_constraints` | Return limits and option sets the editors enforce |
| `check_design` | Run validation / warning checks against a design payload |

Until this lands in the repository, treat the tool list as the target surface, not a live API.

## Status discipline

Re-check this page before writing tutorials that assume export or MCP work today. Prefer future tense until status flips to Available now.

## Related

- [Accounts](../accounts/clerk-accounts.md)
- [The two ideation tracks](../ideation/two-tracks.md)
