# indexer-agents

Ponder app indexing the ERC-8004 Identity Registry on **Base Sepolia (84532)**
for the hidden `/agents` track. Deliberately a separate app from `indexer/`
(Robinhood Chain launchpad): one Ponder app = one database schema, and agent
rows must never share tables — or a deploy lifecycle — with launchpad data.

- Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e` (ERC-1967 proxy,
  deploy block 36304145). We own no contracts on this track. The config throws
  if the address doesn't carry the testnet vanity prefix `0x8004A818` —
  mainnet's is `0x8004A169`, and that mixup fails silently otherwise.
- ABI: `abis/IdentityRegistryAbi.ts`, pasted from the verified implementation
  on base-sepolia.blockscout.com (no `contracts/out` here to generate from).
- Local dev: `npm run dev` → PGlite, GraphQL at `http://localhost:42070`
  (**42069 belongs to `indexer/`**). Set `PONDER_RPC_URL_84532` to an
  Alchemy-class endpoint; the public default rate-limits hard.
- Render: same Postgres as the launch indexer, but `npm start` derives
  `DATABASE_SCHEMA=agents_<sha8>` from `RENDER_GIT_COMMIT` (the launch app
  uses `launchpad_<sha8>`) — schema-per-deploy avoids the zero-downtime
  MigrationError, and the prefixes keep the two apps' tables apart. The
  `ponder_sync` RPC-cache schema is shared and chain-id-keyed; that's fine.
- `postcss.config.cjs` is LOAD-BEARING on Render: it stops PostCSS resolution
  from walking up to the repo root's Tailwind config, which can't load in a
  standalone install.
