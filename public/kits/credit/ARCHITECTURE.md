# Architecture

A design document template for a credit product on Robinhood Chain. Copy it
into the repository, keep the headings, fill the blanks. Sections you do not
need can say "not applicable" but should not be deleted, so reviewers can see
the decision was made.

Blanks look like `[...]`. Where a choice has to be justified, the justification
belongs in `RISK_FRAMEWORK.md` and this file links to it.

## Product

- Name. `[...]`
- Shape. One of Curated vault, Earn inside your app, Collateral-backed loans,
  or one of the fixed income and leveraged yield shapes listed at the end.
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
| `[vault asset / loan asset / collateral]` | `[...]` | `[...]` | `[...]` | `morpho/COLLATERAL_ASSET_RESEARCH.md` copy |

## Curated vault

Fill this section when the shape is Curated vault.

- Vault standard. ERC-4626 shares over a single asset. Note every place the
  implementation departs from the standard (deposit limits, withdrawal
  liquidity, previews that cannot be exact).
- Markets the vault may allocate to, with the cap for each. `[...]`
- Adapters in use and who can list or delist one. `[...]`
- Fee. Management, performance, or none, and who receives it. `[...]`
- Timelock on parameter changes. `[duration]` and what is exempt.
- Depositor exits. What a depositor can do while a change is queued. `[...]`
- Dead deposit or first-deposit protection. `[...]`
- Monitoring and reallocation. Bot, human, or both, and how often. `[...]`
- Roles. Link to `ROLE_MODEL.md`.

## Earn inside your app

Fill this section when the shape is Earn inside your app.

- Which vaults deposits are routed to, and the rule for choosing them. `[...]`
- Custody model. Each user holds their own vault shares, or the app holds a
  pooled position. State which and why. `[...]`
- Deposit flow. Approval method (approve, permit, permit2), simulation before
  send, slippage bounds on share conversion. `[...]`
- Withdrawal flow, including the case where the vault is illiquid and the
  user must wait or redeem in kind. `[...]`
- Rate display. The native rate, incentive rate and fee each shown on its own
  line, with the source and refresh time for each. `[...]`
- Disclosures shown before the first deposit. `[...]`
- Revenue. Fee wrapper, referral, or none. `[...]`

## Collateral-backed loans

Fill this section when the shape is Collateral-backed loans.

- Markets to create. For each, collateral asset, loan asset, oracle, rate
  model, liquidation threshold from the enabled set. `[...]`
- Oracle. Source feed, wrapper contract, heartbeat, staleness rule, what the
  product does when the feed is stale or the sequencer is down. `[...]`
- Position health surface. What the borrower sees, when they are warned, what
  a liquidation looks like to them. `[...]`
- Liquidity. Which vaults supply the markets, and whether the public
  allocator is used to pull shared liquidity on demand. `[...]`
- Origination or interface fee. `[...]`
- Roles. Who can create markets, who can pause the interface. Link to
  `ROLE_MODEL.md`.

## Contracts

- Contracts the team writes. `[...]` or "None yet".
- External dependencies, one per line with the address source. `[...]`
- Upgradeability. Immutable, proxy behind `[timelock]`, or split. `[...]`
- Admin functions and why each exists. `[...]`

## Security

- Worst thing a bug could do. `[lose funds / lock funds / misprice / nothing serious]`
- Audit, bug bounty, monitoring, incident response, key custody. Status of
  each, as declared on the CanHav project page.
- Invariants under test. Link to `INVARIANTS.md` and the test files.
- Review passes completed, with evidence. `[...]`

## Environment plan

- Testnet 46630. What is deployed, what is mocked. `[...]`
- Local fork of mainnet 4663. What integration tests run there. `[...]`
- Mainnet staging. Caps, kill switch, who watches. `[...]`

## Arriving with the next subsectors

Sections for Fixed-rate yield on your asset, Fixed-rate savings inside your
app, Borrow against fixed-rate positions, Leveraged fixed-yield loop and
Yield-token products are added when those shapes open in the studio.
