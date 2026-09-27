# Markdown export and MCP

**Available now.** Both are free and require only a CanHav account. See [Accounts](../accounts/clerk-accounts.md).

## Markdown export

Every published Product or Token design page (`/p/[slug]` and `/t/[slug]`) has two download buttons. Sign in once and the files download directly.

| Artifact | Purpose |
|----------|---------|
| `canhav-[slug].md` | Markdown export of the published design snapshot, never the draft. For a Credit project with a product shape it ends with the resource pack and where the protocols run today |
| `AGENTS.md` | Agent-oriented summary of the design for IDE and coding agents. For a token design linked to a project, the project's published snapshot is merged in. Carries the resource pack for a Credit project |

### Exports from a draft

A Credit project's research happens before publishing, so its owner can export from the current draft. The Review step of the project editor offers both files; the route is `/api/export/project/<project id>` and answers only to the signed-in owner, 404 to anyone else.

| Artifact | Purpose |
|----------|---------|
| `?file=resources` | `RESOURCES.md`, the ticked resource pack alone, grouped Core, Recommended and Deep dive, core items numbered in read-first order, then the build steps with their done state, the review passes with their verdicts, and an environment section |
| `?file=agents` | `AGENTS.md` built from the draft plus the linked token design's draft, marked as a draft export in its first paragraph |

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
| `get_resource_catalog` | The public catalog of resources for credit products on Robinhood Chain, with the product shapes each applies to, caveat flags and where each protocol family runs today. Filter by `shape`, `family` or `priority`. No sign-in |

### Launch tools

These read the same launch indexer and journey tables as the launch pages, so an agent sees exactly what a visitor sees. All are read only. Nothing signs, submits, or stores.

| Tool | Purpose |
|------|---------|
| `list_launches` | Newest-first tokens launched through the CanHav factory, with a flag for launches that have a sale open right now. Pass `creator` for one wallet |
| `get_launch` | Everything about one deployed token by address. Metadata, the description text and Telegram handle verified against the on-chain description hash, verified journey, milestone updates, vesting, escrow tranches, sales, the creator's pool, and the linked design |
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
| `get_project_status` | What is left before the project can publish and launch, ending in one next action. For a Credit project with a product shape, a `kit` block with `shape` (the first), `shapes` and `shapeLabels` (every shape the project builds) and build progress (`done` of `total` steps across them) |
| `get_linked_token_design` | The token design linked to this project, with derived tokenomics and the deployed address when it has one |
| `get_design_constraints` | The linked design as testable assertions, enforced-on-chain versus stated-by-team. Reads the published snapshot when there is one, otherwise the draft |
| `check_design` | Warning rules and deployability against the linked design draft, or against an inline document passed as `doc` |
| `check_project` | Validate the project draft against the project rules and report the first problem |
| `get_resource_pack` | The reading list the team ticked for this project's product shapes (the union when it builds several), in read-first order, with fetchable `rawUrl`s, the family each resource comes from, caveat flags and an `environment` block. Pass `includeUnselected` for everything, or narrow with `step`, `priority` or `family` |
| `get_prelaunch_review` | The review passes for this project's product shapes, each once, each with what a reviewer checks, the resources that define it and the team's recorded verdict |
| `get_launch` | The token deployed from this project's design, in the same shape the shared server returns |

The scoped server also registers one prompt, `prelaunch_review`. In Claude Code it appears as a slash command named after the server; it walks the passes against the open repository and reports a verdict with evidence for each. Clients that do not surface prompts get the same content through `get_prelaunch_review`.

### Resource pack fields

`get_resource_pack` and `get_resource_catalog` share one vocabulary. `family` is one of `shared`, `robinhood`, `morpho`, `pendle`, `boros`. `priority` is `core`, `recommended` or `deep_dive`. `steps` names the editor steps a resource informs, `basics`, `architecture`, `security`, `reality`, `review`. `flags` is always an array and may contain `unofficial` (a community artifact to verify before trusting), `mainnet_only` (no testnet deployment exists), `not_on_robinhood` (background reading, the protocol does not run on this chain) and `testnet_only`. A project may build several shapes at once. `shape` and `shapeLabel` stay as the first of them for older readers; `shapes` and `shapeLabels` list all of them in table order, and the resources, environment families, build steps and review passes are the union across them, each once. `environment.families` lists, for Robinhood Chain and each protocol family the shapes rely on, the testnet 46630 and mainnet 4663 status (`official`, `community`, `manifest_only`, `none`), a note, a source and the recommended development path. Rows exist for `robinhood`, `morpho`, `pendle` and `boros`; a shape plan never includes `boros`, which runs on Arbitrum, but `get_resource_catalog` lists all four. `checklist` carries the ordered build steps for the shape with `done` and `total` and, per item, the step it informs, the resource ids that help and whether the team has ticked it. `review` carries the passes for the shape with a progress block (`pass`, `fail`, `na`, `open`, `total`) and, per pass, the detail, the defining resources with URLs and the verdict or `null`. Fields are only ever added, never renamed.

Two notes on what the URL is and is not. Clerk issues access tokens for the origin rather than for a path, so a token minted at `/mcp` is accepted at `/mcp/p/<id>` as well. The scoped URL is a tool surface, not a secret and not a capability: ownership is checked on every call against the signed-in account. And because the URL keys on the project id rather than its slug, a brand-new draft is connectable before it is ever published.

## Kit files

CanHav publishes its own files for credit builders at `https://www.canhav.com/kits/credit/`, served raw so an agent can fetch them and a team can commit them. The index is `README.md`, the agent skill is `SKILL.md`, and the templates are `ARCHITECTURE.md` (one section per product shape, all eight filled), `RISK_FRAMEWORK.md`, `ROLE_MODEL.md`, `INVARIANTS.md`, `CROSS_PROTOCOL_INVARIANTS.md`, `RATE_TRANSPARENCY.md`, `ASSET_REGISTRY.md` with `ASSET_REGISTRY.template.json`, `morpho/COLLATERAL_ASSET_RESEARCH.md`, and under `pendle/` the wrapper checklist, the market parameter worksheet and the collateral parameter template. Four strategy notes live under `strategies/`. Three JSON files are machine-readable copies with their caveats in the first fields: `morpho/robinhood-testnet-46630.manifest.json` (community deployment, unofficial), `pendle/robinhood-mainnet-4663.manifest.json` (copied from the protocol's manifest, unverified on testnet) and `robinhood/chain.master.json` (the chain's endpoints and addresses, dated). `PRELAUNCH_REVIEW.md` mirrors the review passes the studio records verdicts for. The resource pack links each file as a `template`, `checklist` or `addresses` entry, so `get_resource_pack` and `RESOURCES.md` carry their URLs.

## Status discipline

This page reflects the tools registered in the repository. When a tool is added or its input changes, update the matching table in the same change.

## Related

- [Accounts](../accounts/clerk-accounts.md)
- [The two ideation tracks](../ideation/two-tracks.md)
- [Token Launch overview](../token-launch/overview.md)
