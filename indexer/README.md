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

## Production (Fly.io)

The previous host was a Render web service plus its own Render Postgres. That
service was deleted on 2026-09-23 and took the indexed data with it, and because
Render had been configured entirely in its dashboard there was nothing in the
repo to redeploy from. Hence `Dockerfile`, `fly.toml` and `.env.example` here.

Two Fly machines, roughly $7/month: `shared-cpu-1x` 512MB for the indexer
($3.32), the same again for Postgres, plus a small volume. Fly's **Managed**
Postgres starts at $38/month, so this uses **Fly Postgres (Unmanaged)**, which
Fly does not support. That is the right trade here and not laziness: see the
replay path below, every row is deterministic from chain data, so losing the
database costs a resync and nothing else.

### First deploy

```sh
cd indexer
fly launch --no-deploy            # or `fly apps create canhav-indexer`
fly postgres create --name canhav-indexer-db --initial-cluster-size 1
fly postgres attach canhav-indexer-db   # sets DATABASE_URL as a secret
fly secrets set PONDER_RPC_URL_46630="https://<your dedicated endpoint>"
fly deploy
```

Then point the site at it and redeploy Vercel:

```sh
# Vercel project settings, Production and Preview
INDEXER_URL=https://canhav-indexer.fly.dev
```

### What is deliberate

- **`auto_stop_machines = false`.** This is a continuous chain sync, not a
  request handler. Scaling to zero stops indexing.
- **The health check hits `/health`, never `/ready`.** `/health` returns 200 as
  soon as the server is up. `/ready` returns 503 until historical indexing
  finishes (`ponder/src/server/index.ts`), and a full backfill takes hours, so a
  check on `/ready` would kill and restart the machine in a loop.
- **A fixed `launchpad` schema**, not one per deploy. Render needed
  `launchpad_<git sha>` because its zero-downtime deploys ran the old and new
  instance side by side, and Ponder's migration check fails when the old
  instance still owns the schema. Fly replaces the single machine instead, so
  there is no overlap, and a fixed schema means the indexed data and the
  `ponder_sync` RPC cache survive a redeploy rather than resyncing every time.
  If you ever switch to a blue-green strategy, set `DATABASE_SCHEMA` per deploy.
- **Postgres is separate from Neon.** The indexer holds a pool of up to 30
  persistent connections, which would keep Neon compute permanently awake.
- **`postcss.config.cjs` stays in the image.** It stops PostCSS config
  resolution walking up to the repo root's Tailwind config, which breaks
  standalone installs.
- **`npx ponder codegen` runs in the Dockerfile.** `generated/` is gitignored,
  and codegen needs devDependencies, so `NODE_ENV=production` is only set
  afterwards.

### First sync takes about an hour

An earlier version of this file said "minutes". That was true in early August
2026, when the chain head was a few hundred thousand blocks past the start
block. Measured on 2026-09-24 from a real cold start, the backfill range is
`[95600880, 123699391]`, about **28.1 million blocks**.

That ran at roughly 1.7% per minute against the **public** RPC endpoint, so a
full cold sync is on the order of **one hour**. A dedicated
`PONDER_RPC_URL_46630` will help and is worth setting, but the public default
turned out not to be a blocker. Redeploys are far cheaper than the first sync:
the `ponder_sync` schema caches RPC responses and is reused across deploys, and
the fixed `launchpad` schema means the indexed rows survive too.

Watch progress:

```sh
curl https://canhav-indexer.fly.dev/status     # per-chain checkpoint
curl https://canhav-indexer.fly.dev/health     # 200 once the server is up
curl https://canhav-indexer.fly.dev/ready      # 503 until the backfill is done
```

The site degrades honestly while this runs. `/explore` says token data is
unavailable and a token page explains that the indexer is unreachable rather
than showing a 404.

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

**Check `.env.local` before the first local run.** Ponder picks Postgres over
PGlite purely on the presence of `DATABASE_PRIVATE_URL` or `DATABASE_URL`
(`ponder/src/build/pre.ts`). A `vercel env pull` in this directory writes the
app's **Neon** connection string into `.env.local`, so `npm run dev` would
silently open a pool of up to 30 connections against production Neon and create
a `launchpad` schema beside the app's own. Strip both variables from that file,
or delete it, before running locally.

## Replay path (schema changes)

The whole pipeline is deterministic from chain data. To fully reindex:

```sh
rm -rf .ponder && npm run dev
```

That's the entire migration story in dev: change `ponder.schema.ts` /
`src/index.ts`, wipe, replay. In production the same rule holds — reindex from
zero, never hand-patch rows. To force it there, set `DATABASE_SCHEMA` to a new
name and redeploy; the old schema can be dropped once the new one is ready
(`DROP SCHEMA <old> CASCADE`).

## Site integration

The Next app reads this API server-side via `lib/indexer.ts` (`INDEXER_URL`
env var, defaults to `http://localhost:42069`). It feeds `/explore`, every
`/launch/t/[address]` page, the governance timelock list, the deploy history on
`/p/[slug]`, the studio's name-collision check, and the eight launch tools on
the MCP server.

Everything degrades rather than failing. `lib/indexer.ts` returns null on any
error, `/explore` says token data is unavailable, and a token page says the
indexer is unreachable instead of returning a 404. `getTokenRead` keeps
"unreachable" apart from "no such token" so those two states read differently.
