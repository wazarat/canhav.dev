# Product track

**Available now.** The sections below match the studio Project editor.

The Product track is a design document for what you are building. A product with no token is a legitimate published outcome.

Editor steps: Basics, Architecture, Security, Reality, then one step for each product shape the project is building, then Review.

---

## Sector, subsector, what it does, users and payers, why this chain, current stage

### Asked

| Field | Notes |
|-------|-------|
| Project name | Required |
| Chain | Robinhood testnet or Arbitrum Sepolia. Where the project builds and tests, and the chain a token launched from it goes on. Projects from before the choice existed read as Robinhood testnet. Fixed once a token is linked to the project, by a launch or by a deployed linked token design. The resource pack, the environment block and the testnet notes follow it, and the Robinhood distribution acknowledgement is only asked of a Robinhood project. |
| Sector | Credit and Liquidity. Each is a card with its name ("Credit sector application") and a sentence that starts "I am looking to". Pick every sentence that fits. More sectors are coming soon. |
| Subsector | Asked for each chosen sector that has subsectors, grouped under the sector name when more than one does. Each subsector is a card with its name and a sentence. Credit offers Lending, Leveraged yield and Fixed income; Liquidity offers Vaults and Pools. All five are open. A subsector whose every shape relies on a protocol with no deployment on the project's testnet carries a note such as "Not on Robinhood testnet yet" and can still be picked. Pick one to three per sector. When a project is in more than one sector and a subsector shares product shapes with one under another chosen sector, that one is ticked too and a line under the cards says why; it can be unticked again. |
| What are you building | Asked once a chosen sector has a subsector. Product shapes are grouped by subsector. Lending offers Curated vault, Earn inside your app and Collateral-backed loans; Fixed income offers Fixed-rate yield on your asset, Fixed-rate savings inside your app, Borrow against fixed-rate positions and Leveraged fixed-yield loop; Leveraged yield offers Leveraged fixed-yield loop and Yield-token products; Vaults offers Curated vault and Earn inside your app (the same two shapes reached through Lending), Liquidity allocator and Permissioned vault; Pools offers Basic AMM pool, Concentrated liquidity pool and Pool with custom hooks. Thirteen shapes in all. A shape that spans subsectors is offered whenever one of them is chosen and appears once, and the picker shows subsector headings only when more than one subsector is chosen. Picking a shape also ticks its subsectors under any other chosen sector. Pick as many as apply; the resource pack, build steps and review passes are the union across the chosen shapes. Optional, but the research kit that follows is filtered by it. Each option has a "Why this matters" card with a worked example, and each chosen shape lists two or three things you could build with it. The testnet note: a shape carries a note when a protocol family it relies on has no official or community deployment on the project's testnet (on Robinhood testnet the Pendle and Uniswap shapes, with Morpho's community deployment counting; on Arbitrum Sepolia the Morpho and Pendle shapes, with Uniswap deployed). It can still be picked and published. Its Build section names the missing protocol, and the team or its agent removes the steps that do not fit and adds its own. |
| Starting point | Asked with the shape. From scratch; On top of an existing product (with an optional link or one line about what exists today). |
| What it does | One paragraph |
| Who you sell to | Optional. Businesses (B2B) or Individuals (B2C). The persona table below follows the choice. Switching keeps the other table's rows stored but hidden. |
| Who the user is | Optional. An ideal customer persona table with one to three personas. For a B2B audience each persona has Team size (a number or a range), Geography (city, country, or continent), Industry, Primary contact (a role or title) and Revenue range. For a B2C audience each persona has Age range (a number or a range), Geography, Crypto experience (new, some, active, professional), How they find you and What they hold. Starts with one persona; add up to three. |
| Who pays | Optional. The user pays, or someone else pays (with a line about who) |
| Why this chain specifically | Optional. Free text |
| Current stage | Idea; design doc; prototype; testnet contracts deployed; live elsewhere |

### Computed / warnings

None in this step.

Projects saved under a retired sector (underwriting and risk, oracles and data, agentic trading, stablecoin and payments, portfolio and vaults, DEX and market structure) render as Other with the old label kept as the free text.

---

## Contract architecture and external dependencies

### Asked

| Field | Notes |
|-------|-------|
| What contracts exist | “None yet” is an honest answer |
| External dependencies | Protocols your contracts call (for example Uniswap, Morpho, Chainlink) |
| Oracles | Free text |
| Upgradeability | Immutable; upgradeable proxy; partially upgradeable; undecided |

### Computed / warnings

None.

---

## Admin functions

### Asked

| Field | Notes |
|-------|-------|
| Admin functions and why they exist | Free text. Explain every privileged path and why it is needed. |

### Computed / warnings

None.

---

## Worst-case bug impact and security status declarations

### Asked

| Field | Notes |
|-------|-------|
| Worst-case bug impact | Lose user funds; lock funds; misprice; nothing serious |

Security status declarations (same four statuses as elsewhere: already in place; handled by legal/ops; planned before mainnet; not yet):

| Declaration | Covers |
|-------------|--------|
| Audit | External review status |
| Bug bounty | Program status |
| Monitoring | Ops monitoring |
| Incident response | IR readiness |
| Key custody | How keys are held |

Copy pressure scales with the worst-case answer. That is framing only, not validation.

On the public page, “not yet” on high blast-radius answers reads as a live risk the team chose to publish.

---

## Reality

Before publish, the editor requires an explicit acknowledgement from a project on Robinhood testnet (an Arbitrum Sepolia project is not asked):

> Robinhood Chain does not provide distribution to Robinhood brokerage customers. Deploying here puts your app in front of nobody by default. CanHav is an independent project with no affiliation with Robinhood Markets, Inc. Listing here is not a channel to its users either.

### Asked

| Field | Notes |
|-------|-------|
| Myth acknowledgement | Required checkbox |
| Where will your first hundred users come from? | Free text |

### Computed

| Block | Notes |
|-------|-------|
| Where this runs today | Shown under the acknowledgement for a project with a research kit and a product shape. One chip for Robinhood Chain and one for each protocol family the chosen shapes rely on (Morpho, Pendle, Uniswap), with the testnet 46630 and mainnet 4663 status (official deployment, community deployment, manifest only, no deployment), a note and a source, then the recommended path (testnet with mocks, a local fork of mainnet, mainnet staging behind caps) and, for a family with a path of its own such as Uniswap, which a team deploys on testnet itself, a second list, and the date the rows were last checked. The chip's dot follows the testnet status. `get_resource_pack` returns the same rows in `environment`. |

Optional verify signals (wallet, GitHub repo, testnet contract addresses) attach for public credibility checks scoped to the **project**, not to a linked token. Each signal is omitted silently if it fails to load. See [Public pages](public-pages.md).

---

## Build steps, one section per product shape

Between Reality and Review the editor shows one section per product shape the project builds, with a violet Build pill in the step nav so a builder can tell the product from the project record. Each section lists that shape's build steps in order, each with a checkbox, the editor step it informs and the resources that help. A step that is the same work across several chosen shapes (running the review passes, planning the fork and staging, choosing markets, assigning roles, the dead deposit, the scenario walk, the testnet deployment) is listed once under the first shape that has it, with "This step is also part of X and Y"; ticking it ticks the step for every shape, and the studio row, the public page, Review, the exports and `get_build_steps` count it once. A later section ends with how many of its steps are shared and listed above. These steps never block publishing. The list is a starting point. Any step can be removed with the bin beside it (a shared step goes for every shape it serves, and removed catalog steps sit under Removed steps where they can be restored with their tick), and a team can add its own steps at the end of a section with a title and an optional line on what done looks like, up to forty per project. Added steps are ticked and counted like the rest and show a Your step badge. An agent connected to the project's MCP server can tick, add, remove and restore steps through the same proposal flow as every other change.

---

## Review and publish

Publishing snapshots the document and assigns a public slug under `/p/...`. Linking to a token design is optional. See [The two ideation tracks](two-tracks.md).

---

## Related

- [Token track](token-track.md)
- [The two ideation tracks](two-tracks.md)
- [The three answer types](three-answer-types.md)
- [Enforced versus stated](enforced-vs-stated.md)
- [Public pages](public-pages.md)
