# Dune queries for Reachable wallets (M168)

Register each file as a saved query on Dune (one per chain, the file names
say which) and set its id in the environment:

| File | Env var |
|---|---|
| `subsector_users.robinhood.sql` | `DUNE_QUERY_subsector_users_4663` |
| `asset_holders.robinhood.sql` | `DUNE_QUERY_asset_holders_4663` |
| `overlap.robinhood.sql` | `DUNE_QUERY_overlap_4663` |
| `subsector_users.arbitrum.sql` | `DUNE_QUERY_subsector_users_42161` |
| `asset_holders.arbitrum.sql` | `DUNE_QUERY_asset_holders_42161` |
| `overlap.arbitrum.sql` | `DUNE_QUERY_overlap_42161` |

Parameters (text): `protocol_addresses` and `asset_addresses` are comma
separated lowercase hex addresses, `min_balance` is a raw token amount
(default 0). The app executes a query with its parameters, waits for the
result and caches it per project, profile, chain and month in
`launchpad.reach_snapshots`; a team may refresh by hand ten times a month.
The API needs a paid Dune plan; without `DUNE_API_KEY` the block says so.
