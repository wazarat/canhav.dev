# Architecture

A design document template for a liquidity product on Robinhood Chain. Copy
it into the repository, keep the headings, fill the blanks. Sections you do
not need can say "not applicable" but should not be deleted, so reviewers can
see the decision was made.

Blanks look like `[...]`. Where a choice has to be justified, the
justification belongs in the credit kit's `RISK_FRAMEWORK.md` for a vault and
in `uniswap/HOOK_DESIGN.md` for a hook, and this file links to it.

## Product

- Name. `[...]`
- Shape. One or more of Curated vault, Earn inside your app, Liquidity
  allocator, Permissioned vault, Basic AMM pool, Concentrated liquidity
  pool, Pool with custom hooks.
- Starting point. From scratch, or on top of `[existing product]`.
- Who the user is. `[...]`
- Who pays and how. `[fees, spread, subscription]`
- Chain. Robinhood Chain, testnet 46630 for development, mainnet 4663 for
  production. See the environment section of the resource pack for what is
  deployed where and when it was last checked.

## Assets

One line per asset, with a link to its research file.

| Role | Asset | Address (testnet) | Address (mainnet) | Research file |
|------|-------|-------------------|-------------------|---------------|
| `[vault asset / loan asset / collateral / pool token]` | `[...]` | `[...]` | `[...]` | credit kit `morpho/COLLATERAL_ASSET_RESEARCH.md` copy, or the `ASSET_REGISTRY.json` entry |

## Curated vault and Earn inside your app

These two shapes are the same product whichever sector they were chosen
from. Fill the matching section of the credit kit's `ARCHITECTURE.md` and
link it here. `[link]`

## Liquidity allocator

Fill this section when the shape is Liquidity allocator.

- The loan asset and where it comes from. Raised from depositors, held by
  the team, or both. `[...]`
- Markets the allocator may supply, with the cap on each and the written
  shock assumption behind the cap. `[...]`
- How inventory moves. By hand, by a bot, through the public allocator, or
  all three, and who may trigger each. `[...]`
- Public allocator parameters. Which markets may pull, the fee, the flow
  caps in each direction, the budget for reallocations. `[...]`
- Cash buffer. What stays idle for withdrawals and the rule that refills it.
  `[...]`
- What happens when a supplied market turns bad. Soft deprecation, hard
  deprecation, the order of withdrawal. Link the emergency and unwind
  pages from the pack. `[...]`
- Depositor terms. Fee, timelock on parameter changes, what a depositor can
  do while a change is queued. `[...]`
- Vault specification. `morpho/VAULT_SPECIFICATION.md`
- Scenarios walked on a fork. `morpho/LIQUIDITY_SCENARIOS.md`
- Roles. Link the credit kit's `ROLE_MODEL.md`.

## Permissioned vault

Fill this section when the shape is Permissioned vault.

- Who the depositors are and who the borrowers are, as categories. `[...]`
- The allowlist. Who maintains it, how a party is added and removed, and
  where the record lives. `morpho/GATES_AND_ELIGIBILITY.md`
- Gates in use. Deposit, withdrawal, share transfer, share receipt, and
  what each one checks. `[...]`
- Exit rights. What a depositor can always do, whatever the gate says.
  `[...]`
- The collateral. Issuer, custodian, legal wrapper, transfer restrictions,
  and the protocol contracts the issuer has allowlisted so the asset can be
  supplied, borrowed, bundled and liquidated. `[...]`
- The price. The institutional source, the adapter that feeds the market
  oracle, its heartbeat, the market hours it follows and what the vault
  does when the source is closed or stale. `[...]`
- Jurisdictions and disclosures. Where the shares may be held and what is
  shown before the first deposit. `[...]`
- Vault specification. `morpho/VAULT_SPECIFICATION.md`
- Scenarios walked on a fork, the oracle pause case above all.
  `morpho/LIQUIDITY_SCENARIOS.md`
- Roles. Link the credit kit's `ROLE_MODEL.md`.

## Basic AMM pool

Fill this section when the shape is Basic AMM pool.

- The pair. Both tokens, their decimals and transfer behaviour, with the
  research file for each. `[...]`
- The stack on testnet. Wrapped native token, factory, router, from
  `uniswap/robinhood-testnet-46630.manifest.template.json`. `[...]`
- The first deposit. Amounts, the ratio and the price it implies, sent
  through the router. `uniswap/POOL_PARAMETERS.md`
- Who provides liquidity after the seed, and what they are told about
  divergence loss. `[...]`
- Swap surface. Router path, slippage bound, deadline, the quote shown
  before the send. `[...]`
- Protocol fee switch. Off, or on with the recipient behind a key from the
  role model. `[...]`
- Indexing. RPC logs into a table, or a subgraph, and which events. `[...]`
- Invariants under test. `uniswap/POOL_INVARIANTS.md`

## Concentrated liquidity pool

Fill this section when the shape is Concentrated liquidity pool.

- The pool key. Both currencies in order, the fee tier, the tick spacing,
  no hook. `uniswap/POOL_PARAMETERS.md`
- The stack on testnet. Pool manager, position manager, quoter, state
  view, Permit2, Universal Router, from the manifest template. `[...]`
- Starting price and the first position. Square-root price, lower and
  upper tick, liquidity, the two maximum amounts, initialised and minted in
  one transaction. `[...]`
- Range policy for providers. What ranges the product suggests and how it
  shows a position that has left its range. `[...]`
- Swap surface. Quoter before the send, routing through the Universal
  Router, slippage and deadline. `[...]`
- Reads. State view for price, liquidity and fee growth, and what is
  cached. `[...]`
- Indexing. Subgraph or RPC logs, and which events. `[...]`
- Invariants under test. `uniswap/POOL_INVARIANTS.md`

## Pool with custom hooks

Fill this section when the shape is Pool with custom hooks, in addition to
the concentrated liquidity section above.

- What the hook does, in one sentence. `[...]`
- Permissions. Which callbacks, as flags, and the mined address with its
  salt. `uniswap/HOOK_DESIGN.md`
- Fee schedule. The inputs, the levels, the bounds and who can change
  them. `uniswap/HOOK_DESIGN.md`
- Custom accounting. Which deltas the hook returns, why, and the test that
  shows they reconcile. `[...]`
- Gating. Who may swap or provide, and where the allowlist lives. `[...]`
- External dependencies the hook reads, oracle, market hours, a registry,
  and what it does when each is stale or down. `[...]`
- Upgradeability of the hook. Immutable, or behind what. `[...]`
- Risk categories from the security framework, each with a sentence.
  `uniswap/HOOK_DESIGN.md`
- Invariants under test, including the hook-specific ones.
  `uniswap/POOL_INVARIANTS.md`

## Contracts

- Contracts the team writes. `[...]` or "None yet".
- External dependencies, one per line with the address source. `[...]`
- Upgradeability. Immutable, proxy behind `[timelock]`, or split. `[...]`
- Admin functions and why each exists. `[...]`

## Security

- Worst thing a bug could do. `[lose funds / lock funds / misprice / nothing serious]`
- Audit, bug bounty, monitoring, incident response, key custody. Status of
  each, as declared on the CanHav project page.
- Invariants under test. Link the invariant files and the test files.
- Review passes completed, with evidence. `[...]`

## Environment plan

- Testnet 46630. For a vault, what the community fixture gives you and
  what is mocked. For a pool, the self-deployed stack from the manifest,
  with the commit, compiler and transaction of each contract. `[...]`
- Local fork of mainnet 4663. What integration tests run against the
  canonical contracts. `[...]`
- Mainnet staging. Caps, kill switch, who watches. `[...]`
