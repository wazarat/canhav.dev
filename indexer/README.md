# Launchpad Indexer

[Ponder](https://ponder.sh) app indexing the `TokenFactory` on Robinhood Chain
Testnet (chain ID 46630) into Postgres. Source of truth is the on-chain event
log: `TokenLaunched` → `token` table, `ImplementationSet` → `implementation`
table (the version registry mirror; `version` column everywhere from day one).

Factory: `0x1dAaa8294806d216Df36dc07B3803ED26584c909`, start block `95600880`
(deployment block, from `contracts/broadcast/Deploy.s.sol/46630/run-latest.json`).

## Run

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
