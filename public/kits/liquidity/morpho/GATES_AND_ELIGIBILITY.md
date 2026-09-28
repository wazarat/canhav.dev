# Gates and eligibility

A permissioned vault is a curated vault with a door. The vault contracts
give you four gates, on deposit, withdrawal, share transfer and share
receipt. They do not tell you who belongs on the list, where the shares may
be held, or what a depositor can always do. This file does. Fill it before
the first gate is switched on. Blanks look like `[...]`.

## Who may enter

| Party | Category | Onboarding check | Who approves | Where the record lives |
|-------|----------|------------------|--------------|------------------------|
| Depositors | `[institutions, funds, treasuries]` | `[business and identity checks]` | `[...]` | `[...]` |
| Borrowers | `[...]` | `[...]` | `[...]` | `[...]` |
| Share holders | `[same as depositors, or narrower]` | `[...]` | `[...]` | `[...]` |

- Jurisdictions where the shares may be held, and the ones excluded. `[...]`
- What is shown before the first deposit, and where a party accepts it.
  `[...]`

## The list itself

- Contract or off-chain service that answers each gate. `[...]`
- Who can add a party, who can remove one, and the delay on removal. `[...]`
- What a removed party can still do. See exit rights below.
- Audit trail. Every change to the list with who, when and why. `[...]`

## Exit rights

What a depositor can always do, whatever a gate says. Write these down and
make the contract enforce them, because a gate that can trap capital is not
a product anyone should deposit into.

- A depositor removed from the list can withdraw to the address that
  deposited, within `[days]`. `[...]`
- A withdrawal gate may delay, never deny, up to `[days]`, and the delay is
  shown on the screen where the deposit is made. `[...]`
- A share transfer gate may block transfers to unlisted parties and may
  never block redemption. `[...]`
- If the operator disappears, `[the sentinel, a timelocked owner action]`
  opens withdrawals for everyone within `[days]`. `[...]`

## The collateral

For a vault that lends against tokenised or real-world assets.

- Issuer and the legal wrapper that maps the token to the underlying.
  `[...]`
- Custodian, and the regulator it answers to. `[...]`
- Transfer restrictions on the token, and the protocol contracts the issuer
  has allowlisted so it can be supplied, borrowed, bundled and liquidated.
  `[...]`
- Who can mint and redeem, and how long redemption takes. `[...]`
- Market hours of the underlying, and what the vault does outside them.
  `[...]`

## The price

- Institutional source. `[...]`
- Adapter that feeds the market oracle, its heartbeat and its staleness
  rule. `[...]`
- What happens when the source is closed, stale or paused. New borrowing
  stops, repayment and withdrawal continue. `[test name]`
- Who can change the source, behind what delay. `[...]`

## Worked example, cited as evidence

A UK startup lets institutions deposit government bonds with a regulated
custodian, activates them as tokenised collateral, and lends sterling
against them on isolated markets. Its team built a net asset value oracle
behind a market adapter, onboards counterparties with business and identity
checks, and said in public that a curator was in due diligence to run the
vault. The lending protocol is the bottom of that stack. Everything above
it, custody, the legal wrapper, onboarding, the price and settlement, is
the product, and it is what this file asks you to write down.
