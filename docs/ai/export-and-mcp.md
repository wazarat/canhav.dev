# Markdown export and MCP

**Available now.** Both are free. Exports, the `get_my_` tools and project servers need a CanHav account; public data over the shared MCP server needs none. See [Accounts](../accounts/clerk-accounts.md).

In short: there are two kinds of MCP server. The **shared server** reads every launch and every published design. A **project server** is bound to one studio project, reads that project and its token, and can write to its draft when the owner allows it. The studio hands you a ready prompt for each, so you rarely type any of this by hand. See [Connecting](#connecting).

## Markdown export

Every published Product or Token design page (`/p/[slug]` and `/t/[slug]`) has two download buttons. Sign in once and the files download directly.

| Artifact | Purpose |
|----------|---------|
| `canhav-[slug].md` | Markdown export of the published design snapshot. For a project with a product shape it carries the resource pack and where the protocols run today. A token design's export takes its build step ticks from the current draft, since those change after publishing |
| `AGENTS.md` | Agent-oriented summary of the design for IDE and coding agents. A linked pair is merged: a token design's file carries its project's published snapshot, and a project's file carries its linked design's. Carries the resource pack for a project with a product shape |

### Exports from a draft

A project's research happens before publishing, so its owner can export from the current draft. The Review step of the project editor offers both files once the project has a product shape; the route is `/api/export/project/<project id>` and answers only to the signed-in owner, 404 to anyone else.

| Artifact | Purpose |
|----------|---------|
| `?file=resources` | `RESOURCES.md`, the ticked resource pack alone, grouped Core, Recommended and Deep dive, core items numbered in read-first order, then the build steps with their done state, the contract templates grouped Accepted, Undecided and Rejected, the review passes with their verdicts, an environment section, and "Your files", the file references you added to the project |
| `?file=agents` | `AGENTS.md` built from the draft plus the linked token design's draft, marked as a draft export in its first paragraph. Opens with the project's chain and includes "Your files" |

## MCP server

The CanHav MCP server runs at `https://www.canhav.com/mcp` over Streamable HTTP. Public data (published designs and every deployed launch) is readable without signing in. Tools that start with `get_my_` need an OAuth sign-in with your CanHav account, which the client prompts for on first use.

Connect from Claude Code

```bash
claude mcp add --transport http canhav https://www.canhav.com/mcp
```

Other MCP clients (Cursor, ChatGPT connectors, Claude Desktop) take the same URL. Dynamic client registration is enabled, so no manual OAuth app setup is needed.

Launches live on two chains, Robinhood Chain Testnet and Arbitrum Sepolia. You never tell a launch tool which chain: it finds the token on either chain from its address, and every token it returns carries `chain` and `chainId`. The one exception is `get_launch_governance`, which takes an optional `chain` because it describes a chain's contracts rather than a token.

### Design tools

| Tool | Purpose |
|------|---------|
| `get_my_projects` | List projects you own, drafts and published, with `sector` (the first), `sectors` and `subsectors` |
| `get_my_tokens` | List token designs you own, with the deployed address when attached |
| `get_project` | Fetch one published project by slug. Owners also get their draft |
| `get_token` | Fetch one published token design by slug, including derived tokenomics |
| `get_design_constraints` | For one published design, which parts the CanHav contracts enforce on-chain versus what the team merely states, plus deployability and float figures |
| `check_design` | Run the warning rules and deployability classification against a published slug or an inline design document. For a slug whose design is linked to a published project, the rationale is also checked against that project's product shapes and the launch venue against that project's chain |
| `get_resource_catalog` | The public catalog of resources for every sector's products, with the product shapes each applies to, the subsectors and sectors each shape belongs to, caveat flags, where each protocol family runs today, `examples` per shape, and per chain a `chains` entry and `runsOnTestnetByChain` saying which shapes have their protocol on that testnet. Nothing is blocked: `testnetGate.blockedShapes` is always empty. Filter by `shape`, `family` or `priority`. No sign-in |
| `get_template_catalog` | The public catalog of contract templates, 126 open-source templates and live protocols a builder can fork, deploy from a factory, integrate or compile in, placed under the sixteen subsectors of the six sectors. Each carries `kind` (`integrate`, `fork`, `factory`, `library`), the license text and `licenseClass` (`permissive`, `copyleft`, `restricted`), `audited`, repo and docs URLs, `chains` with the mainnet status on Robinhood Chain and Arbitrum One (`deployed`, `not_deployed`, `unknown`) and a note, `complexity`, `ponsFit` when the template can sit behind a Pons launch, and `status` (inactive protocols are left out unless `includeInactive`). Pass `chain` to get `onChain` per template, the status read for that project chain's mainnet plus `availability` (`ready`, `self_deploy`, `unknown`, `unavailable`). Filter by `sector`, `subsector` or `shape`, `kind`, `licenseClass`, `availability` and `pons`. The `taxonomy` block lists every sector with its subsectors and whether it is open. Research preview, not an audit or legal advice. No sign-in |

### Launch tools

These read the same launch indexer and journey tables as the launch pages, so an agent sees exactly what a visitor sees. All are read only. Nothing signs, submits, or stores.

| Tool | Purpose |
|------|---------|
| `list_launches` | Newest-first tokens launched through CanHav on both chains (the factory or the bonding-curve launcher), each with its `chain`, a flag for launches that have a sale open right now and, for curve launches, a `curve` block with `state` and `progressPct`. `limit` is 1 to 100, 25 by default. Pass `creator` for one wallet's launches across both chains, which returns a shorter row (address, name, symbol, launch time and URL) |
| `get_launch` | Everything about one deployed token by address. Metadata (with `launchedVia`, `curve` or `factory`, and `launcher`), the description text and Telegram handle verified against the on-chain description hash, the verified commitment (a journey, or a design snapshot with its milestones), milestone updates, vesting, escrow tranches, sales, the launch's pool (the creator's, or the locked one the curve seeded, with `lockedLiquidity`), the bonding `curve` block for a curve launch, the linked design, and the studio `project` the token was launched from (sectors, subsectors and shapes always; id, name, URL and the `mainnet` block, the mainnet contracts, companion contract template and Pons pairing the project records, only when the project is published) |
| `get_launch_journey` | The committed document with the on-chain hash, the recomputed hash and whether they match. `source` is `journey` for the quick launch form or `design` for a launch from a published design, in which case `design` names the snapshot and `milestones` carries the design's milestones |
| `get_milestone_updates` | Creator-authored progress updates whose stored body matches the anchored hash, grouped by milestone. `milestones` comes from the journey or from the committed design snapshot |
| `get_sale_status` | Allocation sales with phase (upcoming, open, closed, reclaimed), amounts, proceeds tranches, and recent purchases |
| `get_pool_status` | The launch's AMM pool with reserves, fees, swap count, volume, and recent swaps. For a curve launch this is the pool the launcher seeded at graduation, flagged `lockedLiquidity` |
| `get_curve_status` | The bonding curve behind a launch made through the curve launcher. Reserves and price, ETH raised against the graduation threshold with `progressPct`, the snipe tax window and the tax held for graduation, trade counts and volume, recent trades (the developer buy flagged), and after graduation the locked pool id and what was seeded. `curve` is null for a factory launch |
| `get_launch_governance` | Contract addresses and the timelock queue gating admin changes. Each chain has its own deployment and timelock. Takes an optional `chain` (`robinhood_testnet` or `arbitrum_sepolia`), Robinhood when left out. `liveChains` lists the chains with a deployment |
| `get_my_launches` | Your own launches, the launches recorded to your account plus tokens attached to your token designs, each with its `chain`, its live launch record and the studio `project` it is linked to |

`get_sale_status`, `get_pool_status` and `get_curve_status` take an optional `recentLimit`, 1 to 50, 10 by default, for how many recent purchases, swaps or trades to return.

Every launch tool returns an error result with a retry hint when the indexer is unreachable, and a validation error for a malformed address.

## Connecting

You do not have to assemble commands yourself. The site gives you one prompt to paste into Claude Code, the Claude desktop app or another AI IDE that speaks MCP. The prompt tells the agent to add the server, sign in where needed, read, and report back.

### The launch prompt

It adds the shared server, reads the launch by address (curve, pool, sales, and the commitment when there is one) and reports where the token stands. When the launch is linked to one of your projects, the same prompt also adds that project's server and reads the project.

| Where | What you see |
|-------|--------------|
| Launch success screen | The prompt in a copy block, right after launching |
| Studio, Launches list | An **Agent prompt** button on each launch row |
| Token page | An **Agent prompt** button across from the name, for the account the launch is recorded to. Other visitors do not see it |
| Studio, project page | An **Agent prompt** button beside each launch in the Token launch panel |

Reading a launch needs no sign-in. The prompt only asks you to authenticate if you want your own launches through `get_my_launches`.

A launch is linked to a project on the launch form or afterwards in the studio, where the link can be changed or removed. See [Projects and launches](../token-launch/projects-and-launches.md). An agent cannot link or unlink a launch.

### The project prompt

Open a project in the studio. The **Agent prompt** button across from the project's name, and the connect card at the bottom of the page, open the guide for that project's server. It leads with one prompt to paste, and its last step follows the write mode you pick at the top of the guide. Under "Read the steps yourself" the guide also has every step by hand: the add command, signing in with `/mcp`, checking with `claude mcp list`, example prompts, the server address for other apps, troubleshooting and the command to remove the server.

## Project-scoped servers

Every project in the studio also has its own MCP server at `https://www.canhav.com/mcp/p/<project id>`. Its tools are bound to that one project, so none of them takes a slug or an address. The guide described under [Connecting](#connecting) gives you the prompt and the exact command. The server is named after the project so several can be added side by side: `canhav-` plus the project name in lowercase with dashes (up to 24 characters), or `canhav-` plus the first eight characters of the project id while the project has no name.

```bash
claude mcp add --transport http canhav-<project> https://www.canhav.com/mcp/p/<project id>
```

Unlike the shared server, a scoped server is owner-only and requires OAuth on every request. The first call returns 401 with a `WWW-Authenticate` header, which is what makes the client open the browser flow. The browser flow goes through the studio sign-in page: Clerk sends the visitor to `/studio?redirect_url=` with the consent screen on the Account Portal as the target, the sign-in card follows it after a sign-in, and a signed-in account is sent on by the page itself.

| Tool | Purpose |
|------|---------|
| `get_project` | The bound project. Current draft, publication status, and the published snapshot when there is one |
| `get_project_status` | What is left before the project can publish and launch, ending in one next action. The `project` block carries the project's `chain` and `chainId`, and `mainnet` (the mainnet contracts with explorer URLs, the companion contract template and the Pons pairing the project records, null until recorded). For a project with a product shape, a `kit` block with `kits` (the research kits its sectors open), `shape` (the first), `shapes` and `shapeLabels` (every shape the project builds) and build progress (`done` of `total` steps across them). The `tokenDesign` block carries a `derived` summary (`floatAtLaunchPct`, `fdvToFloat`, `treasuryPct`), the `warnings` codes and `launchTarget` (the venue the design ideates for, `canhav_curve`, `pons` or `pools_xyz`, with its `label` and `fit` on the project's chain, `any`, `fits` or `off_chain`; null until chosen). When a token exists (deployed from the linked design, or a launch linked to the project), `deployedToken` carries its `launchUrl` and, for a curve launch, the curve `state` and `progressPct`; `launchedToken` carries the newest launch linked to the project, whether it was linked at launch or afterwards, with the same `curve` block |
| `get_linked_token_design` | The token design linked to this project, with `launchTarget` (the venue it ideates for and its fit on the project's chain, null until chosen), derived tokenomics, `warnings` (code, title, body, including `launch_target_off_chain` when the venue runs on a mainnet the project's chain does not stand in for), `deployability` (what the CanHav contracts can deploy of it), `build` (token build step progress), `advice` (per product shape, whether a token fits, which reasons fit or to avoid, what to lock) and the deployed address when it has one |
| `get_design_constraints` | The linked design as testable assertions, enforced-on-chain versus stated-by-team. Reads the published snapshot when there is one, otherwise the draft |
| `check_design` | Warning rules and deployability against the linked design draft, or against an inline document passed as `doc`, including whether the rationale fits this project's product shapes and whether the launch venue runs on this project's chain |
| `check_project` | Validate the project draft against the project rules and report the first problem |
| `get_resource_pack` | The reading list the team ticked for this project's product shapes (the union when it builds several), in read-first order, with fetchable `rawUrl`s, the family each resource comes from, caveat flags, an `environment` block, a `templates` block (the contract templates for the shapes with the team's decisions, see `get_templates`) and a `launchTarget` block (the venue the linked design ideates for with its `fit` on this chain, a `note` and `ponsFitTemplates`, the project's templates whose catalog entry says how they can sit behind a Pons launch, accepted first; null without a design or a venue). Pass `includeUnselected` for everything, or narrow with `step`, `priority` or `family` |
| `get_prelaunch_review` | The review passes for this project's product shapes, each once, each with what a reviewer checks, the resources that define it and the team's recorded verdict |
| `get_launch` | The project's token (the one deployed from its linked design, otherwise the newest launch linked to the project), in the same shape the shared server returns, including the `curve` block and the full `project` block with its `mainnet` record (the scoped server is owner-only, so the name and id are always present) |
| `get_curve_status` | The shared tool bound to this project's token. No address. The curve with progress, the tax window, trade counts and recent trades |
| `get_pool_status` | The shared tool bound to this project's token. No address. The pool with reserves, LP shares, swap count, volume and recent swaps |
| `get_sale_status` | The shared tool bound to this project's token. No address. Allocation sales with phase, amounts, tranches and recent purchases |
| `get_launch_journey` | The shared tool bound to this project's token. No arguments. The committed document with the on-chain and recomputed hashes |
| `get_milestone_updates` | The shared tool bound to this project's token. No arguments. Creator updates grouped by milestone |

The token tools answer with an error until a token is linked to the project, by a launch or through its deployed linked design. Their names match the shared server's on purpose, so a prompt written for `canhav` reads the same on `canhav-<project>`; Claude Code keeps the two apart by server name.

The scoped server also registers one prompt, `prelaunch_review`. In Claude Code it appears as a slash command named after the server; it walks the passes against the open repository and reports a verdict with evidence for each. Clients that do not surface prompts get the same content through `get_prelaunch_review`.

### Writing to a draft

An agent on a project's server can change that project's draft, tick build steps, and change the linked token design's draft. The owner decides how, either at the top of the project's agent guide or on the project page under Agent changes. A proposal is decided line by line there: the owner can drop a line, edit a value before accepting it, or accept and reject the whole change. Only the lines the owner kept reach the draft, and `get_agent_changes` shows them as `appliedPatch` beside the original `patch`.

| Mode | What happens to a change |
|------|--------------------------|
| Propose changes | It waits in the studio. The draft is unchanged until the owner accepts it. This is the default. |
| Write directly | It lands in the draft at once and is listed in the studio. |
| Off | The agent reads only. Write tools return an error that says so. |

| Tool | What it does |
|------|--------------|
| `update_project` | Change fields of the project draft. Basics (name, what it does, audience b2b or b2c, personas for B2B, consumerPersonas for B2C, who pays, why this chain, stage), architecture, security, reality and the verification fields, the project's file `references`, its `chain` (refused once a token is linked, since the chain is then fixed), and its `mainnet` record (`contracts` as label and address rows that replace the stored list, `companionTemplate`, a template accepted on the project with a Pons fit line, and `pons` with the paired launch's `tokenAddress` and creator `feeRecipient`, Robinhood Chain projects only; `null` clears a part or the whole record; the chain id is always the mainnet the project's chain stands in for). Also what the project is classed as, `sectors`, `sectorOther`, `subsectors` and under `kit` the product `shapes`, `startingPoint`, `existingProduct`, `resources` (`tick` and `untick` lists of resource ids), `review` (pass and verdict pairs, `open` clears one), `templates` (template id to `accepted`, `rejected` or `open`, the same record `set_template_decisions` sends), `features` (feature id to `true` or `false`, the same record `set_features` sends) and `ideas` (what the team could build, a list of `shape`, `text` and optional `from` lines that replaces the stored list, the same list `set_ideas` sends; keep every line the team ticked and add to it). A sector marked Coming soon is refused. A subsector must belong to a chosen sector and a shape must be offered under the chosen subsectors, changing sectors or subsectors drops the shapes they no longer offer, and a subsector that offers exactly one shape adds it to `kit.shapes` on its own. Send only the fields being changed. Lists replace the stored list |
| `get_build_steps` | The build steps for the project's product shapes with their ids, their shape, whether each is ticked, `sharedWith`, the ids of the same step under the project's other shapes, `templates`, the contract template ids that fit the step, and `feature` when a ticked feature gates the step. The `features` block lists what the product can include with `on` per feature, and `gated` the steps whose feature is not ticked. Progress counts a shared step once, so tick every id in `sharedWith` together. Steps the team added carry `custom: true` and no editor step, removed catalog steps are listed under `removed` and left out of progress |
| `get_templates` | The contract templates that fit the project's product shapes, grouped by the build step that lists them (`steps`, each with the step's id, title, shape and its templates) with the rest under `unplaced`. Each template carries `kind`, `license` and `licenseClass`, `audited`, repo and docs URLs, `onChain` (the mainnet status for the project's chain and a note), `availability` (`ready`, `self_deploy`, `unknown`, `unavailable`), `complexity`, `ponsFit` when it can sit behind a Pons launch, and `decision` (`accepted`, `rejected` or `open`). `counts` totals the decisions. Inactive protocols are left out |
| `set_ideas` | Replace the "What you could build" lines, one per product shape, after reading the `ideas` block of `get_resource_pack`. A catalog example is ticked by its exact text, any other text is the team's own line, and an edited example carries `from`, the original, which steps aside until the line is removed. The same list `update_project` takes under `kit.ideas` |
| `set_features` | Tick or untick what the product includes. `tick` and `untick` take feature ids from the `features` block of `get_build_steps`. A ticked feature lists the build steps it gates and ranks the templates it suggests first; unticking hides those steps again without losing their ticks |
| `set_template_decisions` | Record the team's decision on contract templates. `decisions` maps a template id from `get_templates` to `accepted`, `rejected` or `open` (`open` clears one). One decision per template per project, shown on every build step that lists it. The owner decides each template of a proposal on its own. Never fork a template whose `licenseClass` is `restricted` |
| `set_build_steps` | Tick or untick build steps by id (`done`, `undone`), add steps under one of the project's product shapes (`add` with `shape`, `title` and an optional `detail`), remove steps (`remove`, a step shared between shapes goes for all of them, a step the team added is deleted) and bring removed catalog steps back (`restore`). The owner decides each entry of a proposal on its own |
| `get_token_build_steps` | The linked design's token build steps, eight design steps and eight launch stages, each with its id, phase, state and whether it is computed from the platform (publish, link, launch, the snipe window, graduation). Rows that do not apply leave the progress count |
| `set_token_build_steps` | Tick or untick the linked design's manual token build steps by id. Computed ids are refused. Rides the same proposal flow as the design's fields |
| `update_linked_token_design` | Change fields of the linked token design draft, including `market.launchTarget` (`canhav_curve`, `pons` or `pools_xyz`), which the AgentChangesPanel shows as one line, Market, launch venue |
| `get_agent_changes` | The owner's mode and the recent agent changes with their status (proposed, applied, accepted, rejected). An accepted row carries `appliedPatch`, the part of the proposal the owner let through, possibly edited line by line |

Every write tool takes an optional `note` for the owner and answers with `outcome`, either `proposed` or `applied`.

What an agent cannot do. Publish or unpublish. Tick the distribution acknowledgement. Link or unlink a token design or a launch. Change the chain of a project that already has a token. These stay with a person in the studio.

If an agent writes while the editor is open, the editor takes the new draft when nothing is unsaved. If there is unsaved typing, saving pauses and the editor asks for a reload, so neither side overwrites the other without anyone seeing it.

### Resource pack fields

`get_resource_pack` and `get_resource_catalog` share one vocabulary. A project is in one or more sectors; `sector` stays as the first of them for older readers and `sectors` lists all of them. A research kit opens for each sector that has one (`credit` for Credit, `liquidity` for Liquidity) once a subsector of that sector is chosen; `kit` is the first and `kits` lists all of them, and a catalog entry that belongs to one kit's own files carries `kits`. A product shape can be reached from subsectors of different sectors (Curated vault and Earn inside your app from both Lending and Vaults) and carries the same resources, build steps and review passes either way, minus the other kit's own files. `family` is one of `shared`, `robinhood`, `arbitrum`, `morpho`, `pendle`, `uniswap`, `boros`. `priority` is `core`, `recommended` or `deep_dive`. `steps` names the editor steps a resource informs, `basics`, `architecture`, `security`, `reality`, `review`. `flags` is always an array and may contain `unofficial` (a community artifact to verify before trusting), `mainnet_only` (no testnet deployment exists), `not_on_robinhood` (background reading, the protocol does not run on this chain), `testnet_only` and `self_deploy` (the protocol has no deployment on testnet 46630, so the team deploys these contracts itself and records them in its own manifest). A project may build several shapes at once. `shape` and `shapeLabel` stay as the first of them for older readers; `shapes` and `shapeLabels` list all of them in table order, and the resources, environment families, build steps and review passes are the union across them, each once. `environment.families` lists, for Robinhood Chain and each protocol family the shapes rely on, the testnet 46630 and mainnet 4663 status (`official`, `community`, `manifest_only`, `none`), a note, a source and the recommended development path. On Robinhood Chain rows exist for `robinhood`, `morpho`, `pendle`, `uniswap` and `boros` (an Arbitrum Sepolia project gets an `arbitrum` row in place of `robinhood`), each with its own `devPath` (Uniswap's starts with a self-deploy on testnet); a shape plan never includes `boros`, which runs on Arbitrum, but `get_resource_catalog` lists every row. A project builds on one chain, `robinhood_testnet` or `arbitrum_sepolia`. `get_resource_pack` carries `chain` (key, name and the testnet and mainnet chain ids) and `shapesMissingTestnet`, the chosen shapes whose protocol has no deployment on that testnet with the missing families; the environment rows, the chain family (`robinhood` or `arbitrum`) and the flags follow the chain. The catalog carries `chains`, one entry per chain with its environment rows and `shapesMissingTestnet`, and `runsOnTestnetByChain` per shape; `runsOnTestnet` and the top level `environments` describe Robinhood Chain for older readers. Nothing is blocked. `testnetGate.blockedShapes` stays as an empty list, and a shape whose protocol is missing can be picked, with build steps the team or its agent writes through `set_build_steps`. A catalog entry written for one chain carries `chains`. Every token view carries `chain` beside `chainId`, the chain the token lives on. `checklist` carries the build steps. `done` and `total` count a step shared between shapes once. `items` stays one entry per id (134 across the thirteen shapes) with the step it informs, the resource ids that help, whether the team has ticked it, its `shape` and `sharedWith`, the other ids of the same work. `groups` is what the studio shows, one entry per step in section order with its `shape`, the `shapes` it serves, its `ids` and whether every id is ticked; eleven steps are shared (the review passes across every shape, the fork and staging plan across the Pendle shapes, and the markets, roles, testnet deployment, dead deposit and scenario walks across the vault shapes). `review` carries the passes for the shape with a progress block (`pass`, `fail`, `na`, `open`, `total`) and, per pass, the detail, the defining resources with URLs and the verdict or `null`. `features` (M64) carries `on`, `total` and `items`, every feature of the shapes with `on`, the step ids it gates and the template ids it suggests; a template item's `suggestedBy` names the ticked features that suggest it, and `checklist.groups[].feature` names the feature that gates a step. `ideas` carries what the team could build with each shape, every catalog example with `on` and the team's own lines with `own` (and `from` when the line was edited from a catalog example, which is then left out), and `count`. `templateGaps` lists the shapes with no contract template live on this chain's mainnet, each with `liveOnOther` (how many run on the other mainnet) and a `plan` line (accept those and iterate for this chain, or move the project to the other chain). `templates` (M63) carries, for a project with a shape, `counts` (`accepted`, `rejected`, `open`, `total`) and `items`, every active contract template placed under the shapes' subsectors with its `decision`, `availability` and `onChain` for the project's chain, and `steps`, the build step group keys that list it; `checklist.groups[].templates` names the template ids per step. `launchTarget` (M69) carries, when the linked token design has chosen a venue, its `target`, `label`, `fit` for the project's chain, a `note` and `ponsFitTemplates`. Fields are only ever added, never renamed.

Two notes on what the URL is and is not. Clerk issues access tokens for the origin rather than for a path, so a token minted at `/mcp` is accepted at `/mcp/p/<id>` as well. The scoped URL is a tool surface, not a secret and not a capability: ownership is checked on every call against the signed-in account. And because the URL keys on the project id rather than its slug, a brand-new draft is connectable before it is ever published.

### Shared across sectors

The Morpho family serves both sectors. A curated vault or an earn feature reached through Liquidity carries the same Morpho, shared and Robinhood Chain entries as one reached through Credit, and the two liquidity vault shapes, Liquidity allocator and Permissioned vault, reuse the earn skills, the SDK and API pages, the whole Vault V2 group, the public allocator, the risk, audit and address pages and the community testnet fixture. Where the liquidity side diverges it is in vault operations rather than protocol integration: the dead deposit, gates, emergency procedures, unwind, permissioned token integration, bundles and the lender's view of liquidation, plus ERC-8056 for tokenised stock balances and the Safe documentation for the keys behind every role. The Pendle family stays with Credit and the Uniswap family stays with Liquidity, where it serves the three pool shapes with the protocol's agent skills, the docs index for agents, the contracts monorepo and the canonical Robinhood Chain 4663 record (mainnet only), the v2 pair and router, the v4 singleton with its position manager, quoter, state view, hooks, dynamic fees and custom accounting, the hook template and the public hook implementations, the Universal Router and Permit2, and the v4 subgraph. Contracts a team deploys on testnet 46630 itself carry `self_deploy`. `get_resource_catalog` shows the overlap directly: each entry lists its `shapes` and each shape its `sectors`.

## Kit files

CanHav publishes its own files for credit builders at `https://www.canhav.com/kits/credit/`, served raw so an agent can fetch them and a team can commit them. The index is `README.md`, the agent skill is `SKILL.md`, and the templates are `ARCHITECTURE.md` (one section per product shape, all eight filled), `RISK_FRAMEWORK.md`, `ROLE_MODEL.md`, `INVARIANTS.md`, `CROSS_PROTOCOL_INVARIANTS.md`, `RATE_TRANSPARENCY.md`, `ASSET_REGISTRY.md` with `ASSET_REGISTRY.template.json`, `morpho/COLLATERAL_ASSET_RESEARCH.md`, and under `pendle/` the wrapper checklist, the market parameter worksheet and the collateral parameter template. Four strategy notes live under `strategies/`. Three JSON files are machine-readable copies with their caveats in the first fields: `morpho/robinhood-testnet-46630.manifest.json` (community deployment, unofficial), `pendle/robinhood-mainnet-4663.manifest.json` (copied from the protocol's manifest, unverified on testnet) and `robinhood/chain.master.json` (the chain's endpoints and addresses, dated). `PRELAUNCH_REVIEW.md` mirrors the review passes the studio records verdicts for. The resource pack links each file as a `template`, `checklist` or `addresses` entry, so `get_resource_pack` and `RESOURCES.md` carry their URLs. The derivatives, staking, RWA and cover and governance kits live beside it at `/kits/derivatives/`, `/kits/staking/`, `/kits/rwa/` and `/kits/other/`, each with a `README.md`, a `SKILL.md` that also covers contract template decisions and features, an `ARCHITECTURE.md` with one section per shape, a `PRELAUNCH_REVIEW.md` and the worksheets the build steps cite (perp parameters, option schedule, hedge band, exit queue, slashing disclosure, transfer rules, reserve attestation, credit waterfall, policy terms, claims path, governance parameters).

The liquidity kit lives at `https://www.canhav.com/kits/liquidity/` with the same shape. `README.md`, `SKILL.md` and `ARCHITECTURE.md` (one section per liquidity shape, the two spanning shapes pointing at the credit kit's sections), then under `morpho/` the vault specification, the liquidity scenarios, the release gates and the gates and eligibility file for a permissioned vault, and under `uniswap/` the testnet deployment runbook, `robinhood-testnet-46630.manifest.template.json` (every contract a null until the team deploys it), `robinhood-mainnet-4663.manifest.json` (copied from the protocol's deployment record, reference only), the pool parameters worksheet, the hook design file and the pool invariants. `PRELAUNCH_REVIEW.md` mirrors the twenty-eight passes that apply to the liquidity shapes. The kit's own four files carry `kits: ["liquidity"]`; the rest are scoped by shape.

## Status discipline

This page reflects the tools registered in the repository. When a tool is added or its input changes, update the matching table in the same change.

## Related

- [Accounts](../accounts/clerk-accounts.md)
- [Studio](../ideation/studio.md)
- [Projects and launches](../token-launch/projects-and-launches.md)
- [The two ideation tracks](../ideation/two-tracks.md)
- [Token Launch overview](../token-launch/overview.md)
