# Asset registry

One registry per product, in `ASSET_REGISTRY.json`, built from the template
beside this file. Every asset the product touches is an entry, and every
entry points backwards to the thing it is built on. A fixed half points at
its market, the market at its wrapper, the wrapper at the vault, the vault at
the underlying. A researcher, a risk agent or a coding agent can start from
any entry and walk to the base asset without guessing.

## Four layers

| Layer | What goes here | Points back to |
|-------|----------------|----------------|
| `underlying` | Plain assets. Stablecoins, ETH, tokenised stocks. | Nothing. Each has an asset research file. |
| `vaults` | Vault shares that earn on an underlying. | The underlying. |
| `sy` | Wrapped units over a vault share or another yield source. | The vault or the source. |
| `pt` | Fixed halves, one per market and maturity. | The wrapper and the market. |

## Rules

1. Addresses are per network. Every entry carries testnet 46630 and mainnet
   4663 fields, null where nothing is deployed.
2. Every entry names its price source. For a fixed half that is two sources,
   the discount feed and the underlying's feed.
3. Every entry links to its research file. An entry with no research file is
   not approved for anything.
4. A fixed half carries its maturity, and the registry lists the lending
   markets that accept it as collateral.
5. `checkedOn` is the date a human last verified the entry. Agents read it
   before trusting the addresses.

## Using it

- The architecture document's asset table is generated from, or checked
  against, this file.
- The cross-protocol invariant tests read the addresses from here on a fork.
- An agent asked about any asset reads the entry, follows `dependsOn`, and
  reports the chain of dependencies and the oldest `checkedOn` it crossed.
