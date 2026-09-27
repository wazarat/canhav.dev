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
| `[vault asset / loan asset / collateral / wrapped unit / fixed half]` | `[...]` | `[...]` | `[...]` | `morpho/COLLATERAL_ASSET_RESEARCH.md` copy, or the `ASSET_REGISTRY.json` entry |

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

## Fixed-rate yield on your asset

Fill this section when the shape is Fixed-rate yield on your asset.

- The asset that earns, and its yield source. `[...]`
- Wrapper. Common wrapper over a vault share with its adapter, or a custom
  one. Link the wrapper checklist. `pendle/SY_WRAPPER_CHECKLIST.md`
- Market. Maturity, rate band, initial implied rate, fee, seed liquidity.
  Link the worksheet. `pendle/MARKET_PARAMETERS.md`
- Who holds the fixed half. The user, or the product on the user's behalf.
  `[...]`
- Rollover. What happens in the week before maturity and on the day. `[...]`
- Early exit. How it is priced and disclosed. `[...]`
- Rate labels in use. Link the rate transparency file and list the labels
  this product shows. `[...]`
- Registry entries. Vault, wrapper, market, fixed half, variable half.
  `ASSET_REGISTRY.json`
- Strategy note. `strategies/01-vault-yield-to-fixed-rate.md`

## Fixed-rate savings inside your app

Fill this section when the shape is Fixed-rate savings inside your app.

- Markets the app buys into, and the rule for choosing a maturity. `[...]`
- Custody. Each user holds their own fixed half, or the app holds one
  position and owes claims. State which and why. `[...]`
- Purchase flow. Quote from a simulation through the hosted SDK, slippage
  bound, approval method. `[...]`
- What the user is promised. The rate at purchase, held to maturity, in
  the wrapped unit. State what is not promised. `[...]`
- Early exit. Sold into the pool at that day's implied rate; how the app
  shows the difference. `[...]`
- Rollover. Auto-roll, redeem, or ask, and the disclosure for each. `[...]`
- Rate display. Fixed rate, implied rate today, fees, each on its own line
  with source and time. `[...]`
- Revenue. Fee on purchase, spread, or none. `[...]`

## Borrow against fixed-rate positions

Fill this section when the shape is Borrow against fixed-rate positions.

- Markets to create. For each, the fixed half accepted, the loan asset, the
  feed, the rate model, the liquidation threshold. Link the template.
  `pendle/PT_COLLATERAL_PARAMETERS.md`
- Feed. Deterministic discount with its rate, the timestamp wrapper, the
  underlying's feed, the sequencer rule. `[...]`
- Maturity handling. What the borrower sees as maturity approaches and what
  the market does on the day. `[...]`
- Liquidation. Incentive, exit depth measured, who liquidates and into
  what. `[...]`
- Position health surface. `[...]`
- Registry entries. The fixed half with this market under `collateralIn`.
- Strategy note. `strategies/02-fixed-half-as-collateral.md`

## Leveraged fixed-yield loop

Fill this section when the shape is Leveraged fixed-yield loop.

- The market and the lending market it loops through, with both worksheets
  linked. `[...]`
- Leverage cap, enforced in the contract. `[...]`
- Loop execution. One transaction or several; the unwind path. `[...]`
- Breakeven. The formula from the strategy note with the current inputs,
  shown on the same screen as the headline. `[...]`
- Who watches the borrow rate and the implied rate, and the action at each
  threshold. `[...]`
- Disclosure before the first turn. `[...]`
- Invariants 13 and 14 from the cross-protocol file, with their tests.
- Strategy note. `strategies/03-leveraged-fixed-yield-loop.md`

## Yield-token products

Fill this section when the shape is Yield-token products.

- The variable half in use, its market and maturity. `[...]`
- What the product is. A view on the rate, a hedge, an incentive capture,
  a structured payout. State it in one sentence. `[...]`
- The decay. How the screen shows the path to zero at maturity and the
  breakeven rate. `[...]`
- Yield collection. When accrued yield is claimed and by whom. `[...]`
- Rewards and points. Valued at what price, shown on which line. `[...]`
- Exit. Selling the variable half into the pool before maturity, and what
  it is worth on the day. `[...]`
- Rate labels in use. `[...]`

## Cross-protocol

Fill this section for any shape that touches both a vault and a yield
market, or a fixed half and a lending market.

- The chain of dependencies, from the underlying to the product, as
  registry ids. `[...]`
- Cross-protocol invariants under test, by number, with test files.
  `CROSS_PROTOCOL_INVARIANTS.md`
- Where each rate on the screen comes from. `RATE_TRANSPARENCY.md`
