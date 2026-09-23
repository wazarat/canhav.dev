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
| `INDEXER_URL` | Launch indexer (Ponder, `indexer/`; hosted at canhav-indexer.onrender.com) |
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
- **Modals** (waitlist / contact): `components/home/WaitlistModal.tsx`, `components/home/ContactModal.tsx` — submissions are stubbed (`// TODO: wire to backend`)

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

This list grows as work lands on the branch.
