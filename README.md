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
