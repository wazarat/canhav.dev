# canhav.dev

Marketing site plus the CanHav launchpad: token launches on Robinhood Chain
testnet (`/launch`), the two-track ideation studio (`/studio` → public pages
at `/p/[slug]` and `/t/[slug]`), markdown export, and a remote MCP server
(`/mcp`) exposing a user's own designs to Claude Code, Cursor, and other MCP
clients.

## Develop

```bash
npm install
npm run dev
```

## Environment

The marketing pages run with zero configuration. Each subsystem degrades
gracefully when its variables are unset (config chips / 503s, never crashes).
All variables are documented inline in `.env.example`; locally, pull the
Vercel values with `npx vercel env pull .env.local --environment=preview`.

| Variable | Powers |
| --- | --- |
| `DATABASE_URL` | Neon Postgres — journeys + ideation records (`launchpad` schema only; one-time setup `node --env-file=.env.local scripts/db-setup.mjs`) |
| `INDEXER_URL` | Launch indexer (Ponder, `indexer/`; deploy config in `indexer/fly.toml`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk accounts for `/studio`, export downloads, and the MCP server |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token images |
| `DUNE_API_KEY` | Landing-page protocol analytics |
| `AGENTS_INDEXER_URL`, `AGENTS_RPC_URL`, `NEXT_PUBLIC_AGENTS_*` | Hidden `/agents` track (Base Sepolia) |

### Clerk setup

Auth lives in Clerk; all data stays in Neon (`owner_id` columns store the
Clerk user id — no FK, no user data mirrored). One-time dashboard steps:

1. Create an application at clerk.com with email sign-in enabled.
2. Copy the publishable + secret keys into `.env.local` and Vercel (all
   environments).
3. For the MCP server: **OAuth applications → enable "Dynamic client
   registration"** so MCP clients can self-register.
4. Optional: add a session-token custom claim
   `{"email": "{{user.primary_email_address}}"}` — saves a Backend API call
   on every authenticated request.

## Edit the content

- **Copy that appears in more than one place + summary stats**: `content/site.ts`
- **Product-line cards** (title, description, tags, badge, graphic): `content/product-lines.ts`
- **Hero headline & subline**: `app/page.tsx`
- **Section copy**: `components/home/ProductLines.tsx`, `components/home/BuiltForBuilders.tsx`
- **Launchpad + ideation copy/limits**: `content/launch.ts`, `content/ideation.ts` (limits live in `lib/journey.ts` / `lib/ideation.ts`)
- **Contact form**: `components/home/ContactModal.tsx`, posts to `/api/leads` (Neon + Resend)
- **Sign up and log in copy**: `content/auth.ts`. Sign-up lives at `/sign-up`, log in at `/studio`

## Deploy

Push to a Git repo and import into Vercel, or run `vercel` from this
directory. The site builds and runs with no environment variables — features
light up as their variables are added.

## Arbitrum Open House Singapore Buildathon Work

CanHav is entered in the Arbitrum Open House Singapore online buildathon (event start
Sept 14, 2026). An earlier version of this repo placed second at the Arbitrum Open House
London founder house. This section separates pre-event work from work done during the
event window so judges can verify it.

- The baseline is tagged `pre-buildathon`, the last pre-event commit (3fa1183, Aug 30, 2026).
- All buildathon work lives on the `singapore-buildathon` branch. Nothing is merged to
  `main` until the event ends.
- Judges can see exactly what was built during the event at
  https://github.com/wazarat/canhav.dev/compare/pre-buildathon...singapore-buildathon

### What existed before the event

- The deployed Foundry contract suite on Robinhood Chain Testnet (chain 46630), with
  deployment records under `contracts/broadcast`. TokenFactory v1 to v4, LaunchToken,
  LaunchVestingWallet, MilestoneEscrow, JourneyUpdates, AllocationSale, LaunchAMM,
  FeeSplitter and TimelockController.
- The Next.js app (marketing site, launchpad, ideation studio, MCP server), the Ponder
  indexer, and the work shown at the London founder house.

### Built during the buildathon

- Sept 17, 2026 (22e2294). Lead gen and tracking updates. A public `/api/leads` endpoint
  that stores leads in Neon and notifies by Resend email, the For Teams and waitlist
  forms wired to it, and Vercel Web Analytics with a `lead_submitted` event.
- Sept 21, 2026. Launch MCP tools. Eight read-only tools on the `/mcp` server that
  expose every deployed launch to agents, including `get_launch`, the hash-verified
  journey, milestone updates, sale and pool status, governance, and the signed-in
  user's own launches. Shared `lib/journey-db.ts` so the launch page and the tools
  use one verification rule. Docs and the Tokens page copy updated to match.
- Sept 23, 2026. Launch tab. The token launch flow is now the first tab in the
  nav instead of a hidden URL, with the required fields first and the optional
  details folded away. No launch questions were added or removed.
- Sept 23, 2026. MCP connection card. Every token page and the launch success
  screen now show the exact commands to connect Claude Code to the CanHav MCP
  server and a ready-made prompt that reads that launch.
- Sept 23, 2026. Optional commitment. The launch form is two steps. The journey
  commitment is an opt-in box on the first step, and launches without one record
  a zero hash that the token page and the MCP tools report honestly.
- Sept 23, 2026. Own launches over MCP. Launching while signed in records the
  token against your account, so the `get_my_launches` tool lists it for your
  agent alongside any design-attached deploys.
- Sept 23, 2026. Recent launches and My launches. A Recent launches page lists
  every factory launch, and the signed-in studio lists your own launches with a
  link to each token page.
- Sept 23, 2026. Waitlist. Sign-up moves to admin approval. A waitlist form
  (modal from the nav, hero and sign-in page, plus `/waitlist`) stores requests
  beside For Teams leads and mirrors them into Clerk's waitlist for one-click
  invitations.
- Sept 24, 2026. Launch parameters card. The form no longer asks for vesting or a
  total supply, and the card beside it lists the supply, the live launch fee, the
  paired asset and the trade fee, with launch window, graduation and liquidity
  marked soon because no contract backs them yet.
- Sept 24, 2026. Projects in the studio. The Projects track card creates a draft
  and opens its editor, the same way Token Design already did, and every studio
  row now shows what it is linked to and whether a token has been deployed.
- Sept 24, 2026. A separate MCP server per project. Every project in the studio
  has its own endpoint at /mcp/p/<project id> whose seven tools are bound to
  that project and take no slug or address, with the connect command on the
  project's own page.
- Sept 24, 2026. Explore tab. The launch board moves from an unlinked URL to the
  Explore tab, replacing Projects in the nav. Cards gain price and pool depth in
  ETH, and the two audience callouts from the old Projects page close the page.
- Sept 24, 2026. Honest launch states. A token page no longer shows a bare 404
  when the indexer is unreachable or has not caught up yet. It explains which of
  the two happened, keeps the nav, and offers the explorer. The chain name is
  gone from beside the connected wallet.
- Sept 24, 2026. Indexer deploy config in the repo. The Ponder indexer ships
  with a Dockerfile, a fly.toml and a documented env contract, so the host can
  be rebuilt from the repository instead of from a dashboard.
- Sept 26, 2026. Launchpad-style launch form. Description and image are
  required, X, Telegram and website sit flat beneath them, and an optional
  developer buy seeds the creator's pool with ETH and 80% of the supply right
  after launch, three more confirmations counted on screen. The description
  text and Telegram handle are stored off-chain and the token page shows the
  description only when it re-hashes to the on-chain commitment. The three
  Soon rows on the parameters card now say what the contracts actually do, and
  every launch write carries a gas limit estimated on CanHav's own RPC so the
  wallet no longer has to.
- Sept 27, 2026. Sector and subsector in the project editor. The sector list is
  six entries with only Credit open, the rest marked Coming soon. Credit asks
  for one to three subsectors, Lending open today, as the first step of a
  guided research workflow for lending products. Projects saved under a
  retired sector keep their old label under Other.
- Sept 27, 2026. Lending product shape. A Lending project says what it is
  building, a curated vault, earn inside an existing app, or collateral-backed
  loans, and whether it starts from scratch or on top of a product that
  exists, each shape with a worked example. The answer travels to the public
  page and both markdown exports and will drive the research kit.
- Sept 27, 2026. Resource pack rail. A Credit project's editor gains a right
  rail with the reading list for its product shape, filtered to the step in
  view, grouped Core, Recommended and Deep dive, each row a checkbox with the
  source family, the kind, any caveat such as Unofficial or Mainnet only, and
  one line on why it matters. Core items are ticked by default and every tick
  is saved with the project. Sixty-odd entries cover Morpho, shared standards,
  oracle and risk methodology, security tooling and Robinhood Chain, with
  Pendle to follow.
- Sept 27, 2026. The pack travels to the IDE. A project's own MCP server gains
  get_resource_pack, which returns the ticked reading list in read-first
  order with fetchable URLs, caveat flags and where each protocol runs on
  Robinhood Chain today, and the shared server gains a public
  get_resource_catalog. The Review step offers RESOURCES.md and AGENTS.md
  downloads built from the current draft, and the connect card gains a
  ready-made prompt that makes an agent load the pack before writing code.
  The rail also gains Select all and Core only.
- Sept 27, 2026. Kit files. CanHav's own files for credit builders live at
  canhav.com/kits/credit, served raw for agents and teams alike. A one-page
  index, an agent skill, templates for the architecture document, the risk
  framework, the role model, the invariants and per-asset research, and a
  machine-readable copy of the community Morpho testnet deployment marked
  unofficial in its first field. The resource pack links each one.
- Sept 27, 2026. Build steps. The resource pack rail gains a second tab with
  the ordered steps for the chosen product shape, ten to eleven per shape,
  each naming the editor step it informs and the resources that help. Ticks
  are saved with the project, the studio row and the public page show
  "Build 4 of 11", the project status tool reports the same numbers, and
  RESOURCES.md and AGENTS.md list the steps with their done state. Exports
  also gain display names for the environment rows and "Not set" for empty
  answers.
- Sept 27, 2026. Pre-launch review passes. The Security step lists the
  review passes for the chosen product shape, fifteen in all with the
  vault-side and borrow-side ones filtered by shape, each with what counts
  as evidence and a pass, fail or not applicable verdict that is saved with
  the project. A project's MCP server gains get_prelaunch_review and its
  first prompt, prelaunch_review, which walks the passes against an open
  repository. PRELAUNCH_REVIEW.md mirrors the list in the kit, and both
  exports carry the verdicts.
- Sept 27, 2026. Fixed income and Leveraged yield open. Both Credit
  subsectors lose Coming soon and five more product shapes join the three
  lending ones, Fixed-rate yield on your asset, Fixed-rate savings inside
  your app, Borrow against fixed-rate positions, Leveraged fixed-yield loop
  and Yield-token products, each with a teaching card in CanHav's own words.
  The picker groups shapes under subsector headings when more than one
  subsector is chosen, a shape that spans subsectors appears once, and the
  intro card now walks the whole stack from markets and vaults to splitting a
  yield source and borrowing against the fixed half.
- Sept 27, 2026. Several shapes per project. A Credit project can tick more
  than one product shape, and its resource pack, build steps, review passes
  and where-it-runs families become the union across them, each item once.
  Exports and the project's MCP tools list every shape while keeping the
  first one where older readers expect it. Unselected chips across the
  editors are brighter.
- Sept 27, 2026. Pendle, Boros and Robinhood Chain in the catalog. The
  resource catalog behind the Fixed income and Leveraged yield shapes is
  filled, 51 Pendle entries from the agent skills and hosted tooling to
  the yield wrapper, the two halves, the market and the fixed half as
  collateral, 32 Boros entries as flagged background reading because Boros
  runs elsewhere, 17 more Robinhood Chain pages from endpoints to stock
  token APIs, and two more standards. Every link was fetched before it was
  written.
- Sept 27, 2026. Where it runs. The Reality step of a Credit project shows,
  for Robinhood Chain and each protocol the chosen shapes rely on, whether
  testnet 46630 and mainnet 4663 have an official deployment, a community
  one, a manifest only or nothing, with a note, a source and the
  recommended path from testnet with mocks to a local fork to capped
  mainnet staging. Pendle is manifest only on mainnet and absent on
  testnet; Boros runs elsewhere. The exports and the project's MCP server
  say the same.
- Sept 27, 2026. Delete drafts. Draft projects and draft token designs can
  be removed from the studio list with a two-click control. Published
  records still go through unpublish first.
- Sept 27, 2026. Kit content for the fixed income and leveraged yield
  shapes. The credit kit gains a rate transparency file naming the nine
  rates a credit product carries, fourteen cross-protocol invariants, an
  asset registry template where every entry points back to what it is
  built on, four strategy notes, a wrapper checklist, a market parameter
  worksheet and a collateral parameter template for the yield side, a copy
  of the yield protocol's mainnet manifest marked unverified on testnet, a
  chain master file with every endpoint and address the chain publishes,
  and an architecture template that now covers all eight shapes.
- Sept 27, 2026. Build steps and review passes for every shape. The five
  fixed income and leveraged yield shapes get their ordered build steps,
  from the wrapper checklist and the market worksheet to the leverage cap
  and the decay disclosure, and seven review passes of their own, so every
  one of the eight shapes now has a guided list, a review, and an agent
  prompt that walks it.
- Sept 28, 2026. Liquidity opens and a project can be in more than one
  sector. The sector field is a set of chips, Credit and Liquidity open,
  each chosen sector asks for its own subsectors, and Liquidity offers
  Vaults today with Pools marked soon. A Vaults project builds a curated
  vault or an earn feature with the same research kit a Lending project
  gets, and when a project is in both sectors a subsector that shares
  product shapes with one under the other sector is ticked automatically,
  with a line that says why. Exports, the public page and the MCP tools
  list every sector and every kit a project opens.
- Sept 28, 2026. Five liquidity shapes. Pools opens beside Vaults, and a
  Liquidity project can say it is building a liquidity allocator, a
  permissioned vault, a basic AMM pool, a concentrated liquidity pool or a
  pool with custom hooks, each with a teaching card in CanHav's own words
  and the intro card rewritten to walk both sectors. The catalog gains a
  Uniswap family and a self-deploy flag for contracts a team puts on
  testnet itself, and the credit kit's own files and review passes are
  scoped to the credit and vault shapes so a pools project starts from the
  shared and Robinhood Chain resources.
- Sept 28, 2026. Vaults catalog and the overlap map. The Morpho family now
  serves the Liquidity sector, with the earn skills, SDK and API pages, the
  Vault V2 group, the public allocator and the testnet fixture widened to
  the allocator and permissioned vault shapes, and nine pages added for the
  operations a lender-facing vault needs, the dead deposit, gates, roles,
  emergency procedures, unwind, permissioned tokens, bundles, the market
  concepts and the lender's view of liquidation. The shared layer gains the
  scaled-balance standard for tokenised stocks and the Safe documentation,
  and Robinhood Chain gains its own status page and the chain terms of
  service. Every link was fetched before it was written, and the docs say
  which entries both sectors share.
- Sept 28, 2026. Pools catalog. A Uniswap family of 95 entries behind the
  three pool shapes, from the protocol's agent skills and its docs index
  for agents to the v2 pair and router, the v4 singleton, position manager,
  quoter and state view, hooks, dynamic fees, custom accounting, the hook
  template, the public hook implementations with their audits, the
  Universal Router and the v4 subgraph. Contract repositories a team
  deploys on testnet itself are flagged Self-deploy on testnet, and the
  canonical mainnet address record is flagged Mainnet only, because Uniswap
  has no deployment on testnet 46630. Every link was fetched before it was
  written.
- Sept 28, 2026. Where it runs for Liquidity, and the liquidity kit files.
  A pools project's Reality step now says that Uniswap has no deployment on
  testnet 46630 and shows the path that starts with deploying the stack
  yourself. CanHav's files for liquidity builders live at
  canhav.com/kits/liquidity, a one-page index, an agent skill, an
  architecture template for the five shapes, and for vaults a vault
  specification, the six liquidity scenarios, seven release gates and a
  gates and eligibility file, and for pools a testnet deployment runbook, a
  manifest template with every contract as a blank, a copy of the canonical
  mainnet addresses marked reference only, a pool parameters worksheet, a
  hook design file and twelve pool invariants. The resource pack links each
  one.
- Sept 28, 2026. Build steps and review passes for the liquidity shapes.
  The five liquidity shapes get their ordered build steps, from the market
  thesis and the eligibility file to the self-deployed stack, the manifest,
  the first position and the mined hook address, 51 steps, and fifteen
  review passes of their own, the dead deposit, gates with exit rights, the
  unwind rehearsal, the lender run, allocator failure and release gates on
  the vault side, and the atomic seed, the manifest with provenance, hook
  permissions, fee bounds, custom accounting, adversarial simulations, the
  pool invariants, the deployment target and the provider disclosure on the
  pool side. A liquidity pre-launch review file mirrors them, so every one
  of the thirteen shapes across both sectors now has a guided list, a
  review, and an agent prompt that walks it.

- Sept 28, 2026. Platform copy cleanup. Every user-facing string on the site
  reads as short declarative sentences with no em dashes or colons, label and
  value rows show the label muted instead of punctuated, and
  `npm run check:copy` fails when either comes back.

- Sept 28, 2026. Bonding-curve launcher contract. `CurveLauncher` puts a
  token's supply on a constant-product curve with virtual reserves, taxes buys
  in the first minute and holds the tax for graduation, takes the developer's
  first buy inside the launch transaction, and at 0.1 ETH raised seeds a
  LaunchAMM pool whose shares it keeps forever, so that liquidity can never be
  withdrawn. 51 tests including seven fuzz invariants; deploy script ready.

- Sept 29, 2026. Curve launcher deployed and indexed. `CurveLauncher` is live
  on Robinhood Chain Testnet, the indexer reads its launches through the same
  event as the factory plus two curve tables, every launch surface resolves a
  graduated pool by id, and agents get `get_curve_status` plus curve blocks on
  `get_launch`, `list_launches` and `get_project_status`.

- Sept 29, 2026. Launch on the curve. The launch form is one transaction on
  the curve launcher with the developer's first buy inside it and a live
  opening price, the parameters card says what the contract does (a 60 second
  snipe window, graduation at 0.1 ETH, liquidity locked forever), the token
  page shows the curve with a buy and sell form and then the locked pool, and
  Explore shows curve progress. A new Bonding curve page in the docs.

- Sept 29, 2026. Launch from a project. A studio project has a Launch a token
  card, the launch records the project, the token page shows the project's
  sectors and shapes, the studio and the public project page show the token,
  and agents get a `project` block on `get_launch` and `get_my_launches` plus
  `launchedToken` on `get_project_status`.

- Sept 29, 2026. Project basics and open sign-up. Sector and subsector choices
  are sentence cards under the sector name, who the user is became an ideal
  customer persona table with up to three personas, and who pays and why this
  chain are optional. The waitlist is gone, anyone can sign up at `/sign-up`
  and log in at `/studio`, and `/waitlist` redirects to sign-up.

- Sept 29, 2026. Agent writes. A project's MCP server can change the project
  draft, tick build steps and change the linked token design. The owner picks
  per project whether changes are proposed for review or written directly, in
  a new Agent changes panel on the project page. Agents never publish.
- Sept 29, 2026. Linked drafts open beside the project. Starting a token
  design from a project creates and links the draft without leaving the page.
- Sept 30, 2026. One prompt for the agent. A project's MCP card and its full
  guide lead with one prompt to paste into Claude that connects, signs in,
  reads the project and reports what is left, with a last step that follows
  the project's agent write setting. The Launch a token card leaves the
  project page, and signed-out visitors see one Log in or sign up button.
- Sept 30, 2026. Shape examples and the testnet gate. Every product shape
  lists three things you could build with it, and shapes whose protocol has
  no deployment on Robinhood Chain testnet (the Pendle and Uniswap shapes
  today, with Morpho's community deployment counting as launched) are shown
  greyed in Basics, cannot be picked, block publishing when an older project
  still holds one, and are flagged on the resource catalog tool.
- Sept 30, 2026. Who you sell to. A project says whether it sells to
  businesses or individuals, and the persona table follows. B2B keeps team
  size, geography, industry, primary contact and revenue range; B2C asks for
  age range, geography, crypto experience, how they find you and what they
  hold. Both reach the public page, the exports and the agent tools, and
  older projects are unchanged.
- Sept 30, 2026. Build steps as product sections. The build steps leave the
  resource pack rail and become their own sections in the project editor,
  one violet pill per product shape between Reality and Review. A step that
  is the same work across several shapes is listed once with a note, ticked
  once and counted once everywhere, from the studio row to the exports and
  the agent tools.
- Sept 30, 2026. Agent proposals decided line by line. Each line of a
  proposal has its own checkbox and, for a plain value, an inline editor,
  so the owner accepts some lines, edits others and drops the rest. What
  was applied is recorded beside the proposal and shown in the history and
  on the agent's own changes tool.
- Sept 30, 2026. The linked token over the project server. A project's MCP
  server answers for its own token with the curve, pool, sale, journey and
  milestone update tools, no address needed, and the status and design
  tools carry the design's warnings, deployability and tokenomics summary.

This list grows as work lands on the branch.
