# Launchpad Indexer

[Ponder](https://ponder.sh) app indexing the `TokenFactory` deployments on
Robinhood Chain Testnet (chain ID 46630) into Postgres. Source of truth is the
on-chain event log: `TokenLaunched` → `token`, `ImplementationSet` →
`implementation` (composite PK `(factory, version)` — every factory deployment
starts its own registry at version 1), `VestingCreated` → `vesting` (schedule
params with the resolved start; `beneficiary` is historical — the wallet's
Ownable owner is transferable, so live consumers read `owner()` on-chain).

Both factories are watched with the v2 ABI from start block `95600880`:
- v1 `0x1dAaa8294806d216Df36dc07B3803ED26584c909` (paused; never emits VestingCreated)
- v2 `0x10F33eE0f6a72D7Cc1f41196B4EF80B28C909Bc0` (vesting-capable, block 95922560)

## Production (Render)

Hosted at **https://canhav-indexer.onrender.com** (web service
`canhav-indexer`, starter plan, Virginia) with its own Render Postgres
(`canhav-indexer-db`, basic-256mb) — deliberately NOT Neon, so the indexer's
persistent connections don't keep Neon compute awake. Env:
`DATABASE_URL` (internal Render Postgres), `DATABASE_SCHEMA=launchpad`
(required by `ponder start`), `PONDER_RPC_URL_46630`, `NODE_VERSION=22`.
Auto-deploys on push to `main`; each deploy resyncs from the start block
(minutes). `postcss.config.cjs` here is load-bearing: it stops PostCSS config
resolution from walking up to the repo root's Tailwind config, which breaks
standalone installs. The site reads it via `INDEXER_URL` on Vercel.

## Local dev

```sh
npm install
npm run dev        # sync + realtime indexing + API on :42069
```

- GraphQL: `http://localhost:42069/graphql`
- SQL over HTTP: `http://localhost:42069/sql/*`
- Sync status: `http://localhost:42069/status`

Uses embedded PGlite locally — no Postgres server needed. RPC defaults to the
public endpoint; override with `PONDER_RPC_URL_46630` in `.env.local`.

## Replay path (schema changes)

The whole pipeline is deterministic from chain data. To fully reindex:

```sh
rm -rf .ponder && npm run dev
```

That's the entire migration story in dev: change `ponder.schema.ts` /
`src/index.ts`, wipe, replay. In production (`ponder start` against real
Postgres) each deployment indexes into its own schema — reindex-from-zero is
the default lifecycle, never hand-patch rows.

## Site integration

The Next app reads this API server-side via `lib/indexer.ts` (`INDEXER_URL`
env var, defaults to `http://localhost:42069`) and renders the hidden pages
`/launch/explore` and `/launch/t/[address]`. Both degrade to an
"indexer offline" state when this process isn't running.
