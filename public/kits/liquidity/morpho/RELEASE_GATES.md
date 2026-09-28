# Release gates

A sequence for a small team, with evidence that makes each phase
reviewable. A phase passes when its evidence exists in the repository with a
named owner and a date, not when the work feels done.

## The phases

| Phase | Build or research output | Gate |
|-------|--------------------------|------|
| 1. Product definition | One market thesis, lender and borrower interview notes | Demand and a capital source identified |
| 2. Asset admission | Issuer, rights and eligibility, token and feed registry entries, a research file per asset | Legal, oracle and venue assessment complete |
| 3. Testnet core | The community market fixture on 46630, mock loan and collateral assets, an oracle, supply, borrow, repay and withdraw exercised | Bytecode verified against the manifest, every flow passes |
| 4. Failure testing | Closed hours, pause, gap, outage, liquidation and bad debt from `LIQUIDITY_SCENARIOS.md` | Caps and thresholds backed by executable depth |
| 5. Vault or earn | The vault from `VAULT_SPECIFICATION.md`, roles, adapters, caps, dead deposit, exits | The configuration checklist signed and an unwind dry run |
| 6. Mainnet staging | Official addresses read from the registry, controlled deposits, monitoring and a keeper | Every release evidence item signed |
| 7. Scale | Caps raised from observed activity and stress data | A weekly risk review and incident readiness |

## First sprint

- Write the chain-specific deployment manifests and verify the official
  mainnet contracts against the registry.
- Choose the testnet fixture and prove supply, collateral, borrow, repay and
  withdraw on it.
- Write the first asset research file, including the oracle and the venue a
  liquidation would use.
- Build the position-health surface and simulate an off-hours gap plus a
  sequencer outage.
- Interview at least one lender and one borrower before adding a second
  market.

## Documents to keep

Each has a named owner and a review date.

| File | Minimum contents |
|------|------------------|
| `product/market-thesis.md` | Customer, collateral, loan asset, counterparty, value, revenue, success metric |
| `deployments/4663.json` and `deployments/46630.json` | Addresses, chain id, source version, bytecode hash, explorer link, verification date |
| `assets/[symbol].md` | Issuer, rights, eligibility, token address, decimals, transfer rules, mint and redeem |
| `oracles/[pair].md` | Feed, scale, heartbeat, market hours, sequencer rule, pause, fallback, tests |
| `markets/[id].md` | Loan asset, collateral, rate model, oracle, threshold, cap, owner, rationale |
| `liquidity/venue-depth.md` | Executable depth by venue and size, hours, fees, the liquidation route |
| `vaults/[address].md` | The vault specification |
| `risk/scenarios.md` | The six scenarios with their numbers |
| `operations/runbooks.md` | Oracle, keeper, bridge, pause, role loss, unwind, communications |
| `evidence/release-gate.md` | Signed decisions, bytecode, simulations, audit, monitoring, disclosures |

## The address rule

Every dependency has a provenance, official protocol, official chain, third
party or your own, an environment, mainnet or testnet, and a status,
proposed, verified or deprecated. Never use an address because it appeared
in a document alone.
